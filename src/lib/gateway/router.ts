import { prisma } from '../prisma';
import { redis } from '../redis';
import { GatewayError } from './errors';
import { Environment, Microservice, MicroserviceEnvironment, ApiStatus } from '@prisma/client';
import { config } from '../config';
import { EnvironmentConfigSchema } from '../validation/microservice';

export interface ResolvedRoute {
  microservice: Microservice;
  environment: MicroserviceEnvironment;
}

const CACHE_TTL = config.GATEWAY_CACHE_TTL_SEC; // Default 5 minutes

export async function resolveRoute(
  slug: string,
  envString: string
): Promise<ResolvedRoute> {
  const redisCacheKey = `route:${envString}:${slug}`;

  try {
    const cachedData = await redis.get<ResolvedRoute>(redisCacheKey);
    if (cachedData) {
      if (cachedData.environment.status === ApiStatus.DISABLED) {
        throw new GatewayError(
          'SERVICE_UNAVAILABLE',
          cachedData.environment.maintenanceMessage || 'Microservice is under maintenance or disabled',
          503
        );
      }
      return cachedData;
    }
  } catch (err) {
    console.warn(`[Redis] Failed to fetch route cache:`, err);
  }

  // Ensure environment string maps to our Enum
  const envEnum = envString.toUpperCase() as Environment;
  if (!Object.values(Environment).includes(envEnum)) {
    throw new GatewayError('INTERNAL_ERROR', 'Invalid environment specified in URL', 400);
  }

  // Fetch from PostgreSQL
  let microservice;
  try {
    microservice = await prisma.microservice.findUnique({
      where: { slug },
      include: {
        environments: {
          where: { environment: envEnum },
        },
      },
    });
  } catch (dbError) {
    console.error(`[Gateway] Database connection failed during route resolution:`, dbError);
    throw new GatewayError('SERVICE_UNAVAILABLE', 'Routing service temporarily unavailable.', 503);
  }

  if (!microservice) {
    throw new GatewayError('INTERNAL_ERROR', `Microservice '${slug}' not found`, 404);
  }

  const environment = microservice.environments[0];
  if (!environment) {
    throw new GatewayError('INTERNAL_ERROR', `Environment '${envString}' not configured for '${slug}'`, 404);
  }

  // Validate the configuration payload on load to ensure bad DB data doesn't crash the proxy
  const parsedEnv = EnvironmentConfigSchema.safeParse(environment);
  if (!parsedEnv.success) {
    console.error(`[Gateway] Invalid environment configuration for ${slug}:${envString}:`, parsedEnv.error);
    throw new GatewayError('INTERNAL_ERROR', `Invalid configuration for microservice '${slug}'`, 500);
  }

  const resolved: ResolvedRoute = {
    microservice,
    environment,
  };

  try {
    await redis.set(redisCacheKey, resolved, { ex: CACHE_TTL });
  } catch (err) {
    console.warn(`[Redis] Failed to cache route:`, err);
  }

  if (environment.status === ApiStatus.DISABLED) {
    throw new GatewayError(
      'SERVICE_UNAVAILABLE',
      environment.maintenanceMessage || 'Microservice is under maintenance or disabled',
      503
    );
  }

  return resolved;
}
