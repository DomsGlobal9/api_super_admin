import { Module, Microservice } from '@prisma/client';
import { ModuleDTO } from './module.types';

type ModuleWithRelations = Module & { microservices?: Microservice[] };

export class ModuleMapper {
  static toDTO(module: ModuleWithRelations): ModuleDTO {
    return {
      id: module.id,
      slug: module.slug,
      name: module.name,
      description: module.description,
      status: module.status as any, // Using type assertion to avoid strict type mismatch if schema diverges
      apiCount: module.microservices?.length || 0,
      clientCount: new Set((module as any).subscriptionAccess?.map((sa: any) => sa.subscription?.clientId)).size || 0,
      createdAt: module.createdAt,
      updatedAt: module.updatedAt,
    };
  }

  static toDTOList(modules: ModuleWithRelations[]): ModuleDTO[] {
    return modules.map((m) => this.toDTO(m));
  }
}
