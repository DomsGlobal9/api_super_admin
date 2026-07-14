import { z } from 'zod';
import { ModuleStatus } from '@prisma/client';

export const CreateModuleSchema = z.object({
  slug: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional(),
  status: z.nativeEnum(ModuleStatus).optional().default('ACTIVE'),
});

export const UpdateModuleSchema = CreateModuleSchema.partial();

export const ModuleQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  status: z.nativeEnum(ModuleStatus).optional(),
});

export type CreateModuleDTO = z.infer<typeof CreateModuleSchema>;
export type UpdateModuleDTO = z.infer<typeof UpdateModuleSchema>;
export type ModuleQueryDTO = z.infer<typeof ModuleQuerySchema>;
