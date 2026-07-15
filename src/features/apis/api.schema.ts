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

export const UpdateApiSchema = CreateApiSchema.partial();

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
