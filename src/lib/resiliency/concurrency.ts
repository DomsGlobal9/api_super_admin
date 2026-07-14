import { redis } from '../redis';
import { GatewayError } from '../gateway/errors';

/**
 * Increments the concurrency counter for a microservice.
 * Must be called BEFORE proxying the request.
 * If the limit is exceeded, it immediately decrements it and throws a 503 SERVICE_BUSY.
 */
export async function enterConcurrencyLimit(
  microserviceSlug: string,
  maxConcurrentRequests: number
): Promise<void> {
  const countKey = `concurrency:${microserviceSlug}`;
  
  try {
    const inFlight = await redis.incr(countKey);

    // Safeguard to prevent keys from living forever if a decrement is missed
    // We assume no request will legally stay in-flight for more than 10 minutes.
    if (inFlight === 1) {
      await redis.expire(countKey, 600); 
    } else {
      // Refresh the TTL
      await redis.expire(countKey, 600);
    }

    if (inFlight > maxConcurrentRequests) {
      // Over limit. Undo the increment and reject.
      await redis.decr(countKey);
      throw new GatewayError(
        'SERVICE_BUSY',
        `Maximum concurrent requests reached for ${microserviceSlug}`,
        503
      );
    }
  } catch (err) {
    if (err instanceof GatewayError) throw err;
    console.warn(`[Redis] Failed to evaluate concurrency limit:`, err);
  }
}

/**
 * Decrements the concurrency counter for a microservice.
 * Must be called in a finally block AFTER proxying the request (whether it succeeds or fails).
 */
export async function releaseConcurrencyLimit(microserviceSlug: string): Promise<void> {
  const countKey = `concurrency:${microserviceSlug}`;
  
  try {
    const inFlight = await redis.decr(countKey);
    // Safety check to ensure we never go below 0
    if (inFlight < 0) {
      await redis.set(countKey, 0);
    }
  } catch (err) {
    console.error(`[Redis] Failed to release concurrency limit:`, err);
  }
}
