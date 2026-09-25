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
  /** The tenant this request belongs to, as the gateway resolved it -- never as the caller claimed. */
  clientId: string;
}

export async function proxyRequest({
  req,
  targetUrl,
  path,
  requestId,
  environment,
  abortSignal,
  clientId,
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

  /*
   * Who is really calling, as WE resolved it from the API key -- never as the caller claimed.
   *
   * Downstream services key both the tenant and the spend budget off this header. The catalog
   * service treats it as trusted because its own check runs after the internal service key:
   * "only a caller holding the internal service key can set it". That was true of every caller
   * except us -- sanitizeHeaders did not strip x-gateway-client-id, so a caller's own copy was
   * forwarded verbatim, and we then attached the internal service key to the same request.
   * Anyone with a valid API key could therefore be taken downstream for a different tenant, and
   * spend that tenant's allowance under their name.
   *
   * So: set, not "set if missing", and AFTER sanitizeHeaders, so whatever arrived is overwritten.
   *
   * Setting it also makes downstream budgets meter per tenant rather than per whatever id happens
   * to be in the body, which is what lets a caller send a distinct job id per request without each
   * one getting its own fresh allowance.
   */
  if (!clientId || clientId === 'unknown') {
    // Not reachable from the route, which resolves a real tenant before proxying. Refused rather
    // than forwarded, because a header this trusted must not be able to say "unknown" --
    // downstream that would become the budget bucket for every unattributed call.
    throw new GatewayError('UNAUTHORIZED_API_KEY', 'Could not establish which client this request belongs to', 401);
  }
  sanitizedHeaders.set('x-gateway-client-id', clientId);

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
