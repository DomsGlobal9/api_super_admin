import { z } from 'zod';
import { ClientStatus } from '@prisma/client';

export const CreateClientSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  contactName: z.string().optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits').optional().or(z.literal('')),
  websiteUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),
  notes: z.string().optional(),
  status: z.nativeEnum(ClientStatus).optional().default('ACTIVE'),
});

export const UpdateClientSchema = CreateClientSchema.partial();

export const ClientQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  status: z.nativeEnum(ClientStatus).optional(),
});

export type CreateClientDTO = z.infer<typeof CreateClientSchema>;
export type UpdateClientDTO = z.infer<typeof UpdateClientSchema>;
export type ClientQueryDTO = z.infer<typeof ClientQuerySchema>;
