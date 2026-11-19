import { ApiRepository, apiRepository as defaultApiRepository } from './api.repository';
import { CreateApiDTO, UpdateApiDTO, ApiQueryDTO } from './api.schema';
import { NotFoundError, ConflictError } from '@/lib/errors/errors';
import { ApiMapper } from './api.mapper';
import { ApiOverviewDTO } from './api.types';
import { CacheInvalidator } from '@/lib/cache/invalidator';

export class ApiService {
  constructor(private readonly repo: ApiRepository = defaultApiRepository) {}

  async getApis(query: ApiQueryDTO, tzOffset?: number) {
    const result = await this.repo.findMany(query, tzOffset);
    return {
      total: result.total,
      apis: ApiMapper.toDTOList(result.apis),
    };
  }

  async getApiById(id: string) {
    const api = await this.repo.findById(id);
    if (!api) {
      throw new NotFoundError('API not found');
    }
    return ApiMapper.toDTO(api);
  }

  async getApiOverview(id: string): Promise<ApiOverviewDTO> {
    const api = await this.repo.findById(id);
    if (!api) {
      throw new NotFoundError('API not found');
    }

    const topEndpoints = await this.repo.getTopEndpoints(id, 5);
    console.log('Top Endpoints from DB:', topEndpoints);

    return {
      api: ApiMapper.toDTO(api),
      versions: api.apiVersions || [],
      clients: api.clientAccess?.map((ca) => ca.client) || [],
      topEndpoints,
      usage: {}, // Placeholder for usage service aggregation
      gateway: {}, // Placeholder for gateway config
      health: {}, // Placeholder for health
      logs: [], // Placeholder for recent logs
    };
  }

  async createApi(data: CreateApiDTO, adminUserId: string) {
    const existing = await this.repo.findMany({ search: data.slug, page: 1, pageSize: 1 });
    if (existing.total > 0 && existing.apis[0].slug === data.slug) {
      throw new ConflictError('API slug already exists');
    }
    const created = await this.repo.create(data, adminUserId);
    return ApiMapper.toDTO(created);
  }

  async updateApi(id: string, data: UpdateApiDTO, adminUserId: string) {
    const before = await this.getApiById(id); // Ensure exists
    if (data.slug) {
      const existing = await this.repo.findMany({ search: data.slug, page: 1, pageSize: 1 });
      if (existing.total > 0 && existing.apis[0].id !== id && existing.apis[0].slug === data.slug) {
        throw new ConflictError('API slug already exists');
      }
    }
    const updated = await this.repo.update(id, data, adminUserId);
    // The gateway keeps each API's route (URL, master key, timeout, size limit) in Redis
    // for GATEWAY_CACHE_TTL_SEC. Drop it so a saved change applies to the next call,
    // under the old slug and, when the slug changed, the new one.
    const slugs = new Set([before.slug, updated.slug].filter(Boolean) as string[]);
    for (const slug of slugs) await CacheInvalidator.invalidateRoute('PRODUCTION', slug);
    return ApiMapper.toDTO(updated);
  }

  async deleteApi(id: string, adminUserId: string) {
    await this.getApiById(id); // Ensure exists
    await this.repo.softDelete(id, adminUserId);
    return true;
  }

  async getVersionsWithEndpoints(apiId: string) {
    await this.getApiById(apiId); // Ensure exists
    return this.repo.getVersionsWithEndpoints(apiId);
  }

  async createEndpoint(apiId: string, data: import('./api.schema').CreateEndpointDTO) {
    await this.getApiById(apiId); // Ensure exists
    return this.repo.createEndpoint(data);
  }
}

export const apiService = new ApiService();
