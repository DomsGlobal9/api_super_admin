import { redis } from '../redis';

/**
 * Tracks real-time analytics aggregates independently from the raw RequestLogs.
 * Used for populating dashboards (e.g., Requests Per Minute, Error Rates).
 */
export async function trackMetrics(
  microserviceSlug: string,
  statusCode: number,
  latencyMs: number
): Promise<void> {
  const timeKey = new Date().toISOString().substring(0, 13); // group by hour: YYYY-MM-DDTHH
  const baseKey = `metrics:${microserviceSlug}:${timeKey}`;

  try {
    const pipeline = redis.pipeline();
    pipeline.incr(`${baseKey}:total`);
    
    if (statusCode >= 400) {
      pipeline.incr(`${baseKey}:errors`);
    }

    // A real implementation might use Redis HyperLogLog or sorted sets for P95 latency.
    pipeline.incrby(`${baseKey}:latency_sum`, latencyMs);
    
    await pipeline.exec();
  } catch (err) {
    console.error(`[Redis] Failed to track metrics for ${microserviceSlug}:`, err);
  }
}
