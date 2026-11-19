import { z } from 'zod';
import { ApiStatus } from '@prisma/client';

export const CreateApiSchema = z.object({
  slug: z.string().min(2),
  displayName: z.string().min(2),
  description: z.string().optional(),
  moduleId: z.string().uuid().optional(),
  targetUrl: z.string().url("Must be a valid URL"),
  internalSecret: z.string().optional(),
});

// The gateway reads both from the PRODUCTION environment of the API: the request size
// limit before forwarding, the timeout while it waits for the service's first answer.
export const MAX_PAYLOAD_BYTES = 100 * 1024 * 1024;
export const MAX_TIMEOUT_MS = 300000;

export const UpdateApiSchema = CreateApiSchema.partial().extend({
  documentation: z.string().optional().nullable(),
  openapiSpecUrl: z.string().url().optional().nullable(),
  timeoutMs: z.number().int().min(1000, 'Timeout must be at least 1 second').max(MAX_TIMEOUT_MS, 'Timeout cannot be more than 5 minutes').optional(),
  maxPayloadSize: z.number().int().min(1024, 'Request size limit must be at least 1 KB').max(MAX_PAYLOAD_BYTES, 'Request size limit cannot be more than 100 MB').optional(),
});

export const ApiQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  moduleId: z.string().uuid().optional(),
});

export const CreateApiVersionSchema = z.object({
  version: z.string().min(1),
  status: z.nativeEnum(ApiStatus).optional().default('ACTIVE'),
});

export const CreateEndpointSchema = z.object({
  apiVersionId: z.string().uuid(),
  name: z.string().min(1),
  path: z.string().min(1),
  backendPath: z.string().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']),
  status: z.nativeEnum(ApiStatus).optional().default('ACTIVE'),
  visibility: z.string().optional().default('PUBLIC'),
  timeoutMs: z.coerce.number().optional().default(30000),
  payloadLimit: z.coerce.number().optional().default(1048576), // Default 1MB
});

export type CreateApiDTO = z.infer<typeof CreateApiSchema>;
export type UpdateApiDTO = z.infer<typeof UpdateApiSchema>;
export type ApiQueryDTO = z.infer<typeof ApiQuerySchema>;
export type CreateApiVersionDTO = z.infer<typeof CreateApiVersionSchema>;
export type CreateEndpointDTO = z.infer<typeof CreateEndpointSchema>;
