import { NextRequest } from 'next/server';
import { validateApiKey } from '@/lib/auth/api-key';
import { resolveRoute } from '@/lib/gateway/router';
import { proxyRequest } from '@/lib/gateway/proxy';
import { createErrorResponse, GatewayError } from '@/lib/gateway/errors';
import { logger } from '@/lib/observability/logger';
import { HttpMethod } from '@prisma/client';
import { validateClientAccess } from '@/lib/auth/permissions';
import { validatePayloadSize } from '@/lib/security/payload';
import { enforceRateLimit } from '@/lib/security/rate-limit';
import { checkCircuitBreaker, recordCircuitSuccess, recordCircuitFailure } from '@/lib/resiliency/circuit-breaker';
import { enterConcurrencyLimit, releaseConcurrencyLimit } from '@/lib/resiliency/concurrency';

export const maxDuration = 60; // 60 seconds (requires Vercel Pro, defaults to 10s on Hobby)

export async function ANY(
  req: NextRequest,
  { params }: { params: Promise<{ microserviceSlug: string; path?: string[] }> }
) {
  const unwrappedParams = await params;
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  let proxyStatus = 500;
  let resolvedClient: string = 'unknown';
  let resolvedApiKey: string | undefined;
  let resolvedMicroservice: string = 'unknown';
  let enteredConcurrency = false;
  let backendLatencyMs = 0;

  console.log(`\n[Gateway] Request received: ${req.method} ${req.url}`);

  try {
    // 1. Extract API Key
    const rawKey = req.headers.get('x-api-key');

    // 2. Authentication & Client Validation
    const validatedKey = await validateApiKey(rawKey);
    resolvedClient = validatedKey.client.id;
    resolvedApiKey = validatedKey.id;
    console.log(`[Gateway] API key authenticated (Client: ${validatedKey.client.companyName})`);

    // 3. Resolve Environment & Microservice (Routing)
    const route = await resolveRoute(unwrappedParams.microserviceSlug, 'PRODUCTION');
    resolvedMicroservice = route.microservice.id;

    // 4. Authorization
    const access = await validateClientAccess(validatedKey.client.id, route.microservice.id);

    // 5. Payload Validation
    validatePayloadSize(req, route.environment.maxPayloadSize);

    // 6. Rate Limiting
    await enforceRateLimit(validatedKey.client.id, route.microservice.slug, access.rateLimit);
    console.log(`[Gateway] Rate limit passed`);

    // 7. Circuit Breaker Check
    await checkCircuitBreaker(route.microservice.slug);

    // 8. Concurrency Limiter
    await enterConcurrencyLimit(route.microservice.slug, route.environment.maxConcurrentRequests);
    enteredConcurrency = true;

    const pathArray = unwrappedParams.path || [];
    const pathString = pathArray.join('/');
    
    const methodEnum = (req.method.toUpperCase() as HttpMethod) || HttpMethod.GET;
    
    // Log STARTED
    logger.logStarted({
      requestId,
      clientId: resolvedClient,
      apiKeyId: resolvedApiKey,
      microserviceId: resolvedMicroservice,
      environment: route.environment.environment,
      endpoint: `/${pathString}`,
      method: methodEnum,
    }).catch(console.error);

    // Handle Client Disconnects
    req.signal.addEventListener('abort', () => {
      logger.logCancelled({
        requestId,
        clientId: resolvedClient,
        apiKeyId: resolvedApiKey,
        microserviceId: resolvedMicroservice,
        environment: route.environment.environment,
        endpoint: `/${pathString}`,
        method: methodEnum,
        statusCode: 499,
        totalLatencyMs: Date.now() - startTime,
        gatewayLatencyMs: Date.now() - startTime,
      }).catch(console.error);
    });
    
    const proxyStartTime = Date.now();
    console.log(`[Gateway] Proxy started to backend: ${route.environment.targetUrl}${pathString}`);
    
    const response = await proxyRequest({
      req,
      targetUrl: route.environment.targetUrl,
      path: pathString,
      requestId,
      environment: route.environment,
      abortSignal: req.signal, // Pass Next.js request AbortSignal down to the proxy
    });
    backendLatencyMs = Date.now() - proxyStartTime;

    proxyStatus = response.status;
    console.log(`[Gateway] Backend responded ${proxyStatus} in ${backendLatencyMs}ms`);
    
    // Evaluate Circuit Breaker Success/Failure
    if (proxyStatus >= 500) {
      await recordCircuitFailure(route.microservice.slug);
    } else {
      await recordCircuitSuccess(route.microservice.slug);
    }
    
    // Inject gateway headers into the final response
    const finalHeaders = new Headers(response.headers);
    finalHeaders.set('X-Request-ID', requestId);
    finalHeaders.set('X-Gateway-Version', process.env.npm_package_version || '0.1.0'); 
    finalHeaders.set('X-Response-Time', `${Date.now() - startTime}ms`);
    
    // Inject CORS headers
    const origin = req.headers.get('origin') || '*';
    finalHeaders.set('Access-Control-Allow-Origin', origin);
    finalHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    finalHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

    // We use a new response object to attach our custom headers
    const finalResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: finalHeaders,
    });

    // 6. Logging (non-blocking)
    // WaitUntil is required in Next.js Serverless functions to ensure background tasks complete
    // We cast method to HttpMethod enum.
    
    // @ts-ignore (Next.js specific context)
    // In App Router API routes, we don't have ctx.waitUntil directly available on the request.
    // For Node.js runtime, Promises without await generally complete before exit if not serverless.
    // In Vercel edge/serverless, Next.js provides `waitUntil` natively on the fetch event,
    // but in route.ts we can just run it asynchronously.
    const totalLatency = Date.now() - startTime;
    logger.logCompleted({
      requestId,
      clientId: resolvedClient,
      apiKeyId: resolvedApiKey,
      microserviceId: resolvedMicroservice,
      environment: route.environment.environment,
      endpoint: `/${pathString}`,
      method: methodEnum,
      statusCode: proxyStatus,
      totalLatencyMs: totalLatency,
      gatewayLatencyMs: totalLatency - backendLatencyMs,
      backendLatencyMs: backendLatencyMs,
    }).catch(console.error);

    console.log(`[Gateway] Response returned (Total Latency: ${totalLatency}ms)`);
    return finalResponse;

  } catch (error: any) {
    // Determine status for logging
    proxyStatus = error instanceof GatewayError ? error.statusCode : 500;
    
    // Log failures
    const methodEnum = (req.method.toUpperCase() as HttpMethod) || HttpMethod.GET;
    const totalLatency = Date.now() - startTime;
    logger.logFailed({
      requestId,
      clientId: resolvedClient,
      apiKeyId: resolvedApiKey,
      microserviceId: resolvedMicroservice,
      // Fallback environment if we failed before resolving
      environment: 'PRODUCTION', 
      endpoint: `/${unwrappedParams.path?.join('/') || ''}`,
      method: methodEnum,
      statusCode: proxyStatus,
      totalLatencyMs: totalLatency,
      gatewayLatencyMs: totalLatency,
      errorMessage: error.message,
    }).catch(console.error);

    const errorResponse = createErrorResponse(error, requestId);
    
    // Inject CORS headers on error response
    const origin = req.headers.get('origin') || '*';
    errorResponse.headers.set('Access-Control-Allow-Origin', origin);
    errorResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
    
    return errorResponse;
  } finally {
    // 10. Always release concurrency token if we acquired it
    if (enteredConcurrency) {
      // Note: In real Next.js, we don't have direct access to params.microserviceSlug in finally block unless stored.
      // We stored it implicitly by knowing we reached it, but we can just use `unwrappedParams.microserviceSlug` here safely.
      await releaseConcurrencyLimit(unwrappedParams.microserviceSlug).catch(console.error);
    }
  }
}

// Export for all standard HTTP methods
export const GET = ANY;
export const POST = ANY;
export const PUT = ANY;
export const PATCH = ANY;
export const DELETE = ANY;
export const HEAD = ANY;

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
      'Access-Control-Max-Age': '86400',
    },
  });
}
