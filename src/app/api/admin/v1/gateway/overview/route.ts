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
      metricsService.getAverageLatencyMs(),
      metricsService.getThroughputMBps(),
      metricsService.getReliabilityMetrics24h()
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
    const throughput = getValue(results[6], 0);
    const reliability24h = getValue(results[7], { total: 0, timeouts: 0, errors: 0, errorRate: '0.00', retries: 0 });

    const activeRequests = metricsService.getActiveRequests(rpm, avgLatency);
    const memoryUsage = healthService.getMemoryUsage();
    const cacheHitRate = await healthService.getCacheHitRate(rpm);

    return ok({
      infrastructure: { 
        postgres: dbStatus, 
        redis: redisStatus, 
        gateway: gatewayStatus, 
        cache: redisStatus 
      },
      traffic: { 
        rps: Math.round(rpm / 60), 
        activeRequests,
        throughput: `${throughput} MB/s`, 
        avgLatency: `${avgLatency}ms` 
      },
      reliability: { 
        circuitBreakers: circuitBreakers.open, 
        timeouts: reliability24h.timeouts, 
        retries: reliability24h.retries, 
        errorRate: `${reliability24h.errorRate}%` 
      },
      capacity: { 
        memory: memoryUsage, 
        connections: Math.max(10, Math.round(rpm / 10)), // Simulated DB connections
        cacheHitRate, 
        queueDepth: Math.max(0, activeRequests - 100) // Simulated queue
      }
    });
  } catch (error: any) {
    console.error('GET /gateway/overview Error:', error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
