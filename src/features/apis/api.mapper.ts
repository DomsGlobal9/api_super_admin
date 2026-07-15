import { Microservice, Module } from '@prisma/client';
import { ApiDTO } from './api.types';

type ApiWithModule = Microservice & { module?: Module | null };

export class ApiMapper {
  static toDTO(api: ApiWithModule): ApiDTO {
    return {
      id: api.id,
      slug: api.slug,
      displayName: api.displayName,
      description: api.description,
      moduleId: api.moduleId,
      moduleName: api.module?.name,
      createdAt: api.createdAt,
      updatedAt: api.updatedAt,
      activeVersions: (api as any).apiVersions?.length || 0,
      totalEndpoints: (api as any).apiVersions?.reduce((acc: number, v: any) => acc + (v._count?.endpoints || 0), 0) || 0,
      requestsToday: (api as any)._count?.requestLogs || 0,
      environments: (api as any).environments,
    };
  }

  static toDTOList(apis: ApiWithModule[]): ApiDTO[] {
    return apis.map(this.toDTO);
  }
}
