import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/auth/api-key';
import { logger } from '@/lib/observability/logger';
import { HttpMethod } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const maxDuration = 10; // Keep this fast since it's an internal receiver

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  let resolvedClient: string = 'unknown';
  let resolvedApiKey: string | undefined;
  
  try {
    // 1. Extract API Key
    const rawKey = req.headers.get('x-api-key');
    if (!rawKey) {
      return NextResponse.json({ error: 'Missing x-api-key' }, { status: 401 });
    }

    // 2. Authentication & Client Validation
    const validatedKey = await validateApiKey(rawKey);
    resolvedClient = validatedKey.client.id;
    resolvedApiKey = validatedKey.id;

    // 3. Parse Payload
    const body = await req.json();
    const { method, endpoint, statusCode, latencyMs } = body;

    if (!method || !endpoint || statusCode === undefined || latencyMs === undefined) {
      return NextResponse.json({ error: 'Missing required tracking fields in body' }, { status: 400 });
    }

    // 4. Resolve Microservice ID
    // We try to find a dedicated internal microservice first ('tryon-internal')
    let tryonMicroservice = await prisma.microservice.findUnique({
      where: { slug: 'tryon-internal' }
    });

    // If it hasn't been created yet, fallback to the main tryon2buy microservice
    if (!tryonMicroservice) {
      tryonMicroservice = await prisma.microservice.findFirst({
        where: { OR: [{ slug: 'tryon' }, { slug: 'tryon2buy' }] }
      });
    }

    if (!tryonMicroservice) {
      tryonMicroservice = await prisma.microservice.findFirst();
    }

    if (!tryonMicroservice) {
      return NextResponse.json({ error: 'No microservice found in Gateway DB to link logs to' }, { status: 500 });
    }

    const methodEnum = (method.toUpperCase() as HttpMethod) || HttpMethod.POST;

    // 5. Inject Logger
    // We treat gatewayLatencyMs as 0 since it didn't pass through the proxy
    await logger.logCompleted({
      requestId,
      clientId: resolvedClient,
      apiKeyId: resolvedApiKey,
      microserviceId: tryonMicroservice.id,
      environment: 'PRODUCTION', 
      endpoint: endpoint,
      method: methodEnum,
      statusCode: statusCode,
      totalLatencyMs: latencyMs,
      gatewayLatencyMs: 0,
      backendLatencyMs: latencyMs,
    });

    console.log(`[Internal Logger] Usage logged successfully for Client: ${validatedKey.client.companyName}, Endpoint: ${endpoint}`);

    return NextResponse.json({ success: true, message: 'Usage logged successfully' });

  } catch (error: any) {
    console.error('[Internal Logger] Failed to log usage:', error.message);
    
    // Attempt to log the failure if auth succeeded
    if (resolvedClient !== 'unknown') {
      try {
        const tryonMicroservice = await prisma.microservice.findFirst();
        await logger.logFailed({
          requestId,
          clientId: resolvedClient,
          apiKeyId: resolvedApiKey,
          microserviceId: tryonMicroservice?.id || 'unknown',
          environment: 'PRODUCTION',
          endpoint: '/api/internal/log-usage', // Fallback endpoint
          method: HttpMethod.POST,
          statusCode: error.statusCode || 500,
          totalLatencyMs: 0,
          gatewayLatencyMs: 0,
          errorMessage: error.message,
        });
      } catch (innerError) {
        console.error('[Internal Logger] Fatal fallback logging error:', innerError);
      }
    }

    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
