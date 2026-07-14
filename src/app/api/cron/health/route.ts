import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { MicroserviceStatus } from '@prisma/client';

/**
 * Triggered by Vercel Cron every 30/60 seconds.
 * Pings all ACTIVE microservice environments and records their health.
 */
export async function GET(request: Request) {
  // 1. Fetch all environments that have a health endpoint configured
  const environments = await prisma.microserviceEnvironment.findMany({
    where: {
      healthEndpoint: { not: null },
      // We still check DOWN or MAINTENANCE services to see if they've recovered!
    },
    include: {
      microservice: true,
    },
  });

  const CONCURRENCY_LIMIT = 10;
  const results = [];

  for (let i = 0; i < environments.length; i += CONCURRENCY_LIMIT) {
    const chunk = environments.slice(i, i + CONCURRENCY_LIMIT);
    
    const chunkResults = await Promise.allSettled(
      chunk.map(async (env) => {
        const startTime = Date.now();
        let isHealthy = false;
        let statusCode = 500;
        let errorMessage = '';

        const baseUrl = env.targetUrl.endsWith('/') ? env.targetUrl.slice(0, -1) : env.targetUrl;
        const path = env.healthEndpoint!.startsWith('/') ? env.healthEndpoint! : `/${env.healthEndpoint}`;
        const url = `${baseUrl}${path}`;

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);

          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timeout);

          statusCode = response.status;
          isHealthy = response.ok;
        } catch (err: any) {
          errorMessage = err.name === 'AbortError' ? 'Healthcheck Timeout' : err.message;
        }

        const durationMs = Date.now() - startTime;
        const newStatus = isHealthy ? MicroserviceStatus.ACTIVE : MicroserviceStatus.DOWN;

        await prisma.healthCheck.create({
          data: {
            microserviceId: env.microserviceId,
            environment: env.environment,
            status: newStatus,
            statusCode: statusCode,
            responseTime: durationMs,
            durationMs,
            errorMessage: errorMessage || null,
            checkerType: 'AUTOMATED',
          },
        });

        if (env.status !== newStatus && env.status !== 'MAINTENANCE') {
          await prisma.microserviceEnvironment.update({
            where: { id: env.id },
            data: { status: newStatus },
          });
        }

        const cacheKey = `route:${env.environment}:${env.microservice.slug}`;
        const cachedRoute: any = await redis.get(cacheKey);
        
        if (cachedRoute && cachedRoute.environment) {
          cachedRoute.environment.status = newStatus;
          await redis.set(cacheKey, cachedRoute, { ex: 300 });
        }

        return { service: env.microservice.slug, env: env.environment, status: newStatus, latency: durationMs };
      })
    );
    
    results.push(...chunkResults);
  }

  return NextResponse.json({
    message: 'Health checks completed',
    total: environments.length,
    results: results.map((r) => (r.status === 'fulfilled' ? r.value : { error: r.reason })),
  });
}
