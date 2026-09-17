import { sanitizeHeaders } from '../security/headers';
import { GatewayError } from './errors';
import { MicroserviceEnvironment } from '@prisma/client';

export interface ProxyOptions {
  req: Request;
  targetUrl: string;
  path: string;
  requestId: string;
  environment: MicroserviceEnvironment;
  abortSignal: AbortSignal; // From the incoming client request
}

export async function proxyRequest({
  req,
  targetUrl,
  path,
  requestId,
  environment,
  abortSignal,
}: ProxyOptions): Promise<Response> {
  // Construct the final downstream URL
  const baseUrl = targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl;
  const forwardPath = path.startsWith('/') ? path : `/${path}`;
  
  // Forward query params if they exist
  const searchParams = new URL(req.url).search;
  const finalUrl = `${baseUrl}${forwardPath}${searchParams}`;

  const sanitizedHeaders = sanitizeHeaders(req.headers);
  
  // Inject Gateway specific headers
  sanitizedHeaders.set('X-Request-ID', requestId);
  sanitizedHeaders.set('X-Forwarded-For', req.headers.get('x-forwarded-for') || 'unknown');
  
  // Inject the internal master key for the backend to authenticate
  if (environment.internalSecret) {
    sanitizedHeaders.set('x-api-key', environment.internalSecret);
  }

  // Configure the timeout controller
  const timeoutMs = environment.timeoutMs;
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  // Combine client disconnect signal with our timeout signal
  const combinedSignal = abortSignal.aborted ? abortSignal : timeoutController.signal;
  
  // Ensure if client aborts while we are waiting, we abort our fetch
  const abortListener = () => timeoutController.abort();
  abortSignal.addEventListener('abort', abortListener);

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: sanitizedHeaders,
      signal: combinedSignal,
      // body can only be read if method is not GET/HEAD
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
      // Node.js 18+ undici specific: allows streaming bodies
      // @ts-ignore
      duplex: 'half', 
    };

    // Returned as-is. The route handler wraps the body exactly once, with the final
    // headers. Wrapping it here as well left an intermediate Response that nothing
    // referenced while the route awaited the circuit breaker; when it was garbage
    // collected, its body stream was cancelled, and the route's second wrap threw
    // "Response body object should not be disturbed or locked" (28 gateway 500s in
    // 7 days, about 1 request in 100 in a local reproduction; 0 in 3000 wrapped once).
    return await fetch(finalUrl, fetchOptions);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      if (abortSignal.aborted) {
        throw new GatewayError('INTERNAL_ERROR', 'Client disconnected', 499);
      }
      return new Response(JSON.stringify({ error: { code: 'GATEWAY_TIMEOUT', message: 'Gateway Timeout' } }), {
        status: 504,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Upstream connection failed' } }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    clearTimeout(timeoutId);
    abortSignal.removeEventListener('abort', abortListener);
  }
}
