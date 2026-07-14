import { redis } from '../redis';

export const CacheInvalidator = {
  /**
   * Invalidates the cache for a specific API key.
   * Call this when a key is revoked or its permissions change.
   */
  async invalidateApiKey(keyHash: string) {
    try {
      await redis.del(`apikey:${keyHash}`);
      console.log(`[Cache Invalidator] Invalidated API Key: apikey:${keyHash}`);
    } catch (err) {
      console.error(`[Cache Invalidator] Failed to invalidate API Key:`, err);
    }
  },

  /**
   * Invalidates all access caches for a specific client across all microservices,
   * or a specific microservice if provided.
   * Call this when a client is suspended or ClientAccess is modified.
   */
  async invalidateClientAccess(clientId: string, microserviceId?: string) {
    try {
      if (microserviceId) {
        await redis.del(`access:${clientId}:${microserviceId}`);
        console.log(`[Cache Invalidator] Invalidated Access: access:${clientId}:${microserviceId}`);
      } else {
        // If no specific microservice, we need to clear all access for this client.
        // In Redis, we can use SCAN or just delete specific known ones if tracked.
        // Upstash REST doesn't support SCAN easily via HTTP client without pagination loops.
        // We can use a wildcard keys lookup to find and delete.
        const keys = await redis.keys(`access:${clientId}:*`);
        if (keys.length > 0) {
          await redis.del(...keys);
          console.log(`[Cache Invalidator] Invalidated ${keys.length} Access Keys for Client ${clientId}`);
        }
      }
    } catch (err) {
      console.error(`[Cache Invalidator] Failed to invalidate Client Access:`, err);
    }
  },

  /**
   * Invalidates the routing configuration for a microservice environment.
   * Call this when changing targetUrl, timeout, or maintenance status.
   */
  async invalidateRoute(environment: string, microserviceSlug: string) {
    try {
      const envUpper = environment.toUpperCase();
      await redis.del(`route:${envUpper}:${microserviceSlug}`);
      console.log(`[Cache Invalidator] Invalidated Route: route:${envUpper}:${microserviceSlug}`);
    } catch (err) {
      console.error(`[Cache Invalidator] Failed to invalidate Route:`, err);
    }
  },
};
