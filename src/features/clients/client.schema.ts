import { z } from 'zod';
import { ClientStatus } from '@prisma/client';
import { cleanBlock, cleanCompact, cleanLine } from '@/lib/utils';

/**
 * Clean a string field before it is validated, so a pasted invisible character
 * or a stray space is never stored, whichever form or API call sent it.
 * Anything that is not a string is passed on for the schema to judge.
 */
const cleaned = <T extends z.ZodType>(clean: (v: string) => string, schema: T) =>
  z.preprocess((v) => (typeof v === 'string' ? clean(v) : v), schema);

export const CreateClientSchema = z.object({
  companyName: cleaned(cleanLine, z.string().min(2, 'Company name is required')),
  contactName: cleaned(cleanLine, z.string().optional()),
  email: cleaned(cleanCompact, z.string().email('Invalid email address')),
  phone: cleaned(cleanCompact, z.string().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits').optional().or(z.literal(''))),
  websiteUrl: cleaned(cleanLine, z.string().url('Invalid URL format').optional().or(z.literal(''))),
  notes: cleaned(cleanBlock, z.string().optional()),
  status: z.nativeEnum(ClientStatus).optional().default('ACTIVE'),
});

// No default status on an update: `.partial()` keeps the create schema's
// default('ACTIVE'), so a profile edit that did not mention the status would
// quietly reactivate a suspended client.
export const UpdateClientSchema = CreateClientSchema.partial().extend({
  status: z.nativeEnum(ClientStatus).optional(),
});

export const ClientQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  status: z.nativeEnum(ClientStatus).optional(),
});

export type CreateClientDTO = z.infer<typeof CreateClientSchema>;
export type UpdateClientDTO = z.infer<typeof UpdateClientSchema>;
export type ClientQueryDTO = z.infer<typeof ClientQuerySchema>;
