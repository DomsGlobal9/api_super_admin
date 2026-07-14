import { redis } from '../redis';
import { GatewayError } from '../gateway/errors';
import { config } from '../config';

const FAILURE_THRESHOLD = config.CIRCUIT_BREAKER_THRESHOLD;
const RESET_TIMEOUT_SECONDS = config.CIRCUIT_BREAKER_RESET_SEC;

/**
 * Ensures the circuit is not OPEN before allowing a request to proceed.
 * If the circuit is OPEN, immediately throws a 503 SERVICE_UNAVAILABLE,
 * UNLESS the reset timeout has expired, in which case it atomically allows exactly ONE probe request.
 */
export async function checkCircuitBreaker(microserviceSlug: string): Promise<void> {
  const stateKey = `breaker:${microserviceSlug}:state`;
  const resetKey = `breaker:${microserviceSlug}:reset_timeout`;
  const halfOpenLockKey = `breaker:${microserviceSlug}:half_open_lock`;
  
  try {
    const state = await redis.get<string>(stateKey);
    if (state === 'OPEN') {
      const isResetting = await redis.get(resetKey);
      if (isResetting) {
        throw new GatewayError(
          'SERVICE_UNAVAILABLE',
          `Circuit breaker is OPEN for ${microserviceSlug}. Service temporarily unavailable.`,
          503
        );
      } else {
        // The reset timeout has passed. We can try to transition to HALF_OPEN.
        // Use an atomic SET NX (set if not exists) to ensure exactly one instance becomes the probe.
        const acquiredLock = await redis.set(halfOpenLockKey, '1', { nx: true, ex: 15 });
        
        if (acquiredLock) {
          // We are the single allowed probe request!
          // We let this request through without throwing.
          return;
        } else {
          // Someone else is currently the probe. 
          throw new GatewayError(
            'SERVICE_UNAVAILABLE',
            `Circuit breaker is HALF_OPEN. A probe request is already in flight for ${microserviceSlug}.`,
            503
          );
        }
      }
    }
  } catch (err) {
    if (err instanceof GatewayError) throw err;
    console.error(`[Redis] Circuit breaker check failed:`, err);
  }
}

/**
 * Called when a proxy request fails (e.g., timeout or 5xx).
 * Increments the failure counter. If it crosses the threshold, trips the breaker to OPEN.
 * If the state was HALF_OPEN, it immediately trips it back to OPEN.
 */
export async function recordCircuitFailure(microserviceSlug: string): Promise<void> {
  const countKey = `breaker:${microserviceSlug}:failures`;
  const stateKey = `breaker:${microserviceSlug}:state`;
  const resetKey = `breaker:${microserviceSlug}:reset_timeout`;
  const halfOpenLockKey = `breaker:${microserviceSlug}:half_open_lock`;

  try {
    // If we were the probe that failed, we must clear the lock and re-trip the breaker
    const wasProbe = await redis.get(halfOpenLockKey);
    
    let failures = await redis.incr(countKey);
    if (failures === 1) {
      await redis.expire(countKey, 60);
    }

    if (failures >= FAILURE_THRESHOLD || wasProbe) {
      // Trip the breaker!
      await redis.set(stateKey, 'OPEN'); // State stays OPEN until explicitly cleared by a success
      await redis.set(resetKey, '1', { ex: RESET_TIMEOUT_SECONDS }); // The timeout that allows the next probe
      await redis.del(halfOpenLockKey); // Clear the probe lock so another probe can try eventually
      
      console.warn(`[CIRCUIT BREAKER] Tripped OPEN for ${microserviceSlug}!`);
    }
  } catch (err) {
    console.error(`[Redis] Failed to record circuit failure:`, err);
  }
}

/**
 * Called when a proxy request succeeds.
 * Clears any failure counts, resetting the circuit to fully CLOSED.
 */
export async function recordCircuitSuccess(microserviceSlug: string): Promise<void> {
  const countKey = `breaker:${microserviceSlug}:failures`;
  const stateKey = `breaker:${microserviceSlug}:state`;
  const halfOpenLockKey = `breaker:${microserviceSlug}:half_open_lock`;

  try {
    // Del multiple keys to transition fully to CLOSED
    await redis.del(countKey, stateKey, halfOpenLockKey);
  } catch (err) {
    console.error(`[Redis] Failed to reset circuit success:`, err);
  }
}
