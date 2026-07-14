import { ModuleStatus } from '@prisma/client';

export interface ModuleDTO {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: ModuleStatus;
  apiCount: number;
  clientCount: number;
  createdAt: Date;
  updatedAt: Date;
}
