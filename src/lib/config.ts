import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  UPSTASH_REDIS_REST_URL: z.string().default(''),
  UPSTASH_REDIS_REST_TOKEN: z.string().default(''),
  DATABASE_URL: z.string().min(1, 'Database URL is required'),
  GATEWAY_CACHE_TTL_SEC: z.coerce.number().int().min(1).default(300),
  CIRCUIT_BREAKER_THRESHOLD: z.coerce.number().int().min(1).default(5),
  CIRCUIT_BREAKER_RESET_SEC: z.coerce.number().int().min(1).default(300),
});

// Validate `process.env` against our schema
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  throw new Error('Invalid environment variables');
}

export const config = parsed.data;
