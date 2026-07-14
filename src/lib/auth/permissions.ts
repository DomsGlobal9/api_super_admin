import { prisma } from '../prisma';
import { redis } from '../redis';
import { GatewayError } from '../gateway/errors';
import { ClientAccess } from '@prisma/client';
import { config } from '../config';

const CACHE_TTL = config.GATEWAY_CACHE_TTL_SEC; // Default 5 mins

export async function validateClientAccess(
  clientId: string,
  microserviceId: string
): Promise<ClientAccess> {
  const redisCacheKey = `access:${clientId}:${microserviceId}`;

  try {
    const cachedData = await redis.get<ClientAccess>(redisCacheKey);
    if (cachedData) {
      if (!cachedData.enabled) {
        throw new GatewayError('ACCESS_DENIED', 'Access to this microservice is disabled for this client', 403);
      }
      return cachedData;
    }
  } catch (err) {
    console.warn(`[Redis] Failed to fetch access cache:`, err);
  }

  let access;
  try {
    access = await prisma.clientAccess.findUnique({
      where: {
        clientId_microserviceId: {
          clientId,
          microserviceId,
        },
      },
    });
  } catch (dbError) {
    console.error(`[Auth] Database connection failed during access validation:`, dbError);
    throw new GatewayError('SERVICE_UNAVAILABLE', 'Authorization service temporarily unavailable.', 503);
  }

  if (!access) {
    throw new GatewayError('ACCESS_DENIED', 'Client is not authorized for this microservice', 403);
  }

  if (!access.enabled) {
    throw new GatewayError('ACCESS_DENIED', 'Access to this microservice is disabled for this client', 403);
  }

  if (access.expiresAt && new Date() > access.expiresAt) {
    throw new GatewayError('ACCESS_DENIED', 'Client access to this microservice has expired', 403);
  }

  try {
    await redis.set(redisCacheKey, access, { ex: CACHE_TTL });
  } catch (err) {
    console.warn(`[Redis] Failed to cache access:`, err);
  }

  return access;
}
