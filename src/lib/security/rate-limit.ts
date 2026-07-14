import { redis } from '../redis';
import { GatewayError } from '../gateway/errors';
import { config } from '../config';

const BURST_LIMIT = 500; // Hard limit: 500 requests per 5 minutes per client/service
const BURST_WINDOW_SEC = 300; 

/**
 * Enforces dual-layer rate limiting:
 * 1. Gateway Protection: Short-term burst limit (500 req / 5 min).
 * 2. Billing Quota: Daily calendar quota configured in Postgres.
 */
export async function enforceRateLimit(
  clientId: string,
  microserviceSlug: string,
  dailyLimit: number | null
): Promise<void> {
  const burstKey = `burst:${clientId}:${microserviceSlug}`;
  const todayStr = new Date().toISOString().split('T')[0];
  const quotaKey = `quota:${clientId}:${microserviceSlug}:${todayStr}`;

  try {
    // 1. Gateway Protection (Burst Limit)
    const burstCount = await redis.incr(burstKey);
    if (burstCount === 1) {
      await redis.expire(burstKey, BURST_WINDOW_SEC);
    }
    if (burstCount > BURST_LIMIT) {
      throw new GatewayError(
        'RATE_LIMIT_EXCEEDED',
        `Burst limit exceeded. Maximum ${BURST_LIMIT} requests per 5 minutes.`,
        429
      );
    }

    // 2. Billing Quota (Daily Limit)
    if (dailyLimit !== null && dailyLimit !== undefined) {
      const currentCount = await redis.incr(quotaKey);
      if (currentCount === 1) {
        await redis.expire(quotaKey, 86400); // 24 hours
      }

      if (currentCount > dailyLimit) {
        throw new GatewayError(
          'RATE_LIMIT_EXCEEDED',
          `Daily request limit of ${dailyLimit} exceeded for ${microserviceSlug}`,
          429
        );
      }
    }
  } catch (err) {
    if (err instanceof GatewayError) throw err;
    console.error(`[Redis] Rate limiter failed:`, err);
  }
}
