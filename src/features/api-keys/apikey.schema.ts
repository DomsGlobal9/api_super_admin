import { z } from 'zod';
import { ApiKeyStatus, ApiKeyType, ApiKeyPermission } from '@prisma/client';

export const CreateApiKeySchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(2),
  type: z.nativeEnum(ApiKeyType).optional().default('PRODUCTION'),
  permissions: z.array(z.nativeEnum(ApiKeyPermission)).optional().default(['READ']),
  allowedDomains: z.array(z.string()).optional().default([]),
  expiresAt: z.coerce.date().optional().nullable(),
});

export const UpdateApiKeySchema = z.object({
  name: z.string().min(2).optional(),
  status: z.nativeEnum(ApiKeyStatus).optional(),
  permissions: z.array(z.nativeEnum(ApiKeyPermission)).optional(),
  allowedDomains: z.array(z.string()).optional(),
  expiresAt: z.coerce.date().optional().nullable(),
});

export const ApiKeyQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  clientId: z.string().uuid().optional(),
  status: z.nativeEnum(ApiKeyStatus).optional(),
});

export type CreateApiKeyDTO = z.infer<typeof CreateApiKeySchema>;
export type UpdateApiKeyDTO = z.infer<typeof UpdateApiKeySchema>;
export type ApiKeyQueryDTO = z.infer<typeof ApiKeyQuerySchema>;
