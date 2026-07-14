import { Redis } from '@upstash/redis';
import { config } from './config';

// Initialize the Upstash Redis client.
// Note: Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in the environment.
export const redis = new Redis({
  url: config.UPSTASH_REDIS_REST_URL,
  token: config.UPSTASH_REDIS_REST_TOKEN,
});
