import { z } from 'zod';

export const EnvironmentConfigSchema = z.object({
  targetUrl: z.string().url('Target URL must be a valid URL (e.g., https://tryon-backend.com)'),
  healthEndpoint: z.string().startsWith('/', 'Health endpoint must start with a slash').nullable().optional(),
  timeoutMs: z.number().int().min(1000, 'Timeout must be at least 1000ms').max(300000, 'Timeout cannot exceed 300,000ms (5 minutes)'),
  retries: z.number().int().min(0, 'Retries cannot be negative').max(5, 'Maximum of 5 retries allowed'),
  maxPayloadSize: z.number().int().min(1024, 'Payload size must be at least 1KB'),
  maxConcurrentRequests: z.number().int().min(1, 'Must allow at least 1 concurrent request'),
});

export const MicroserviceCreationSchema = z.object({
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  displayName: z.string().min(2).max(100),
  description: z.string().optional(),
  environments: z.record(z.enum(['DEVELOPMENT', 'QA', 'STAGING', 'PRODUCTION']), EnvironmentConfigSchema),
});

export type MicroserviceCreationPayload = z.infer<typeof MicroserviceCreationSchema>;
