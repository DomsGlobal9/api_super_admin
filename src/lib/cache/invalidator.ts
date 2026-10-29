import { redis } from '../redis';
import { prisma } from '../prisma';

export const CacheInvalidator = {
  /**
   * Invalidates the cache for a specific API key.
   * Call this when a key is revoked or its permissions change.
   */
  async invalidateApiKey(keyHash: string) {
    await CacheInvalidator.invalidateApiKeys([keyHash]);
  },

  /**
   * Invalidates the cached validation of several API keys at once.
   */
  async invalidateApiKeys(keyHashes: string[]) {
    if (keyHashes.length === 0) return;
    try {
      await redis.del(...keyHashes.map((h) => `apikey:${h}`));
      console.log(`[Cache Invalidator] Invalidated ${keyHashes.length} API Key(s)`);
    } catch (err) {
      console.error(`[Cache Invalidator] Failed to invalidate API Key(s):`, err);
    }
  },

  /**
   * The key hashes of every API key a client has, revoked ones included, so the
   * cache entries can still be found once the rows are gone (hard delete).
   * Returns [] when the lookup fails, so the caller's own write still goes ahead.
   */
  async apiKeyHashesForClient(clientId: string): Promise<string[]> {
    try {
      const keys = await prisma.apiKey.findMany({ where: { clientId }, select: { keyHash: true } });
      return keys.map((k) => k.keyHash);
    } catch (err) {
      console.error(`[Cache Invalidator] Failed to list API keys for client ${clientId}:`, err);
      return [];
    }
  },

  /**
   * Invalidates the cached validation of every API key a client has.
   *
   * The gateway caches each validated key TOGETHER WITH ITS CLIENT ROW for
   * GATEWAY_CACHE_TTL_SEC (5 minutes by default) and, on a cache hit, never looks
   * at the client again. So a client suspended or deleted in the console keeps
   * calling through the gateway until that entry expires, unless it is removed
   * here. Call this whenever a client's status changes.
   */
  async invalidateClientApiKeys(clientId: string) {
    await CacheInvalidator.invalidateApiKeys(await CacheInvalidator.apiKeyHashesForClient(clientId));
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
