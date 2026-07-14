import { createHash } from 'crypto';
import { prisma } from '../prisma';
import { redis } from '../redis';
import { GatewayError } from '../gateway/errors';
import { ApiKey, Client } from '@prisma/client';
import { config } from '../config';

export interface ValidatedApiKey extends ApiKey {
  client: Client;
}

// CACHE_TTL in seconds (e.g., 60 seconds) prevents hammering the DB on every request
// while still allowing keys to be revoked relatively quickly.
const CACHE_TTL = config.GATEWAY_CACHE_TTL_SEC;

/**
 * Hashes the raw API key using SHA-256.
 */
export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Validates an API key. 
 * Checks Redis cache first. If cache miss, queries PostgreSQL.
 * Throws a GatewayError if the key is invalid, revoked, or expired.
 */
export async function validateApiKey(rawKey: string | null): Promise<ValidatedApiKey> {
  if (!rawKey) {
    throw new GatewayError('UNAUTHORIZED_API_KEY', 'Missing x-api-key header', 401);
  }

  const keyHash = hashApiKey(rawKey);
  const redisCacheKey = `apikey:${keyHash}`;

  try {
    // 1. Try to fetch from Redis
    const cachedData = await redis.get<ValidatedApiKey>(redisCacheKey);
    
    if (cachedData) {
      if (cachedData.status !== 'ACTIVE') {
        throw new GatewayError('UNAUTHORIZED_API_KEY', 'API Key is revoked or inactive', 401);
      }
      return cachedData;
    }
  } catch (error) {
    console.warn(`[Redis] Failed to fetch API key from cache:`, error);
    // Continue to Postgres fallback
  }

  // 2. Fetch from PostgreSQL (Source of Truth)
  let apiKey;
  try {
    apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { client: true },
    });
  } catch (dbError) {
    console.error(`[Auth] Database connection failed during API key validation:`, dbError);
    throw new GatewayError('SERVICE_UNAVAILABLE', 'Authentication service temporarily unavailable.', 503);
  }

  if (!apiKey) {
    throw new GatewayError('UNAUTHORIZED_API_KEY', 'Invalid API Key', 401);
  }

  if (apiKey.status !== 'ACTIVE') {
    throw new GatewayError('UNAUTHORIZED_API_KEY', 'API Key is revoked or inactive', 401);
  }

  if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
    throw new GatewayError('UNAUTHORIZED_API_KEY', 'API Key has expired', 401);
  }

  if (apiKey.client.status !== 'ACTIVE') {
    throw new GatewayError('ACCESS_DENIED', 'Client account is suspended or disabled', 403);
  }

  // 3. Cache the result in Redis
  try {
    await redis.set(redisCacheKey, apiKey, { ex: CACHE_TTL });
  } catch (error) {
    console.warn(`[Redis] Failed to cache API key:`, error);
  }

  return apiKey;
}
