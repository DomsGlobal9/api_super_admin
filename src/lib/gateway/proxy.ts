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

    const response = await fetch(finalUrl, fetchOptions);
    
    const responseHeaders = new Headers(response.headers);
    
    // Node's fetch automatically decompresses the body stream. 
    // If we leave these headers, the client (Postman/Browser) will try to decompress an already uncompressed stream.
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');
    responseHeaders.delete('transfer-encoding');

    // We want to return the exact response downstream, including status and headers
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
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
