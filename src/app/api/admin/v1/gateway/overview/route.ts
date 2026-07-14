import { NextRequest } from 'next/server';
import { healthService } from '@/features/platform/health.service';
import { metricsService } from '@/features/platform/metrics.service';
import { ok, serverError, unauthorized } from '@/lib/api/response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const results = await Promise.allSettled([
      healthService.getGatewayStatus(),
      healthService.getRedisStatus(),
      healthService.getDatabaseStatus(),
      metricsService.getRPM(),
      healthService.getCircuitBreakerStatus(),
      metricsService.getAverageLatencyMs()
    ]);

    const getValue = <T>(result: PromiseSettledResult<T>, fallback: T): T => {
      if (result.status === 'fulfilled') return result.value;
      console.error('Gateway dependency failed:', result.reason);
      return fallback;
    };

    const gatewayStatus = getValue(results[0], 'DOWN');
    const redisStatus = getValue(results[1], 'DOWN');
    const dbStatus = getValue(results[2], 'DOWN');
    const rpm = getValue(results[3], 0);
    const circuitBreakers = getValue(results[4], { open: 0, halfOpen: 0 });
    const avgLatency = getValue(results[5], 0);

    return ok({
      infrastructure: { 
        postgres: dbStatus, 
        redis: redisStatus, 
        gateway: gatewayStatus, 
        cache: redisStatus 
      },
      traffic: { 
        rps: Math.round(rpm / 60), 
        activeRequests: 0, // In real life, fetch from Redis active count
        throughput: '0 MB/s', 
        avgLatency: `${avgLatency}ms` 
      },
      reliability: { 
        circuitBreakers: circuitBreakers.open, 
        timeouts: 0, 
        retries: 0, 
        errorRate: '0.00%' 
      },
      capacity: { 
        memory: 'N/A', 
        connections: 0, 
        cacheHitRate: '0%', 
        queueDepth: 0 
      }
    });
  } catch (error: any) {
    console.error('GET /gateway/overview Error:', error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
