import { ModuleRepository, moduleRepository as defaultModuleRepository } from './module.repository';
import { CreateModuleDTO, UpdateModuleDTO, ModuleQueryDTO } from './module.schema';
import { NotFoundError, ConflictError } from '@/lib/errors/errors';
import { ModuleMapper } from './module.mapper';

export class ModuleService {
  constructor(private readonly repo: ModuleRepository = defaultModuleRepository) {}

  async getModules(query: ModuleQueryDTO) {
    const result = await this.repo.findMany(query);
    return {
      total: result.total,
      modules: ModuleMapper.toDTOList(result.modules),
    };
  }

  async getModuleById(id: string) {
    const module = await this.repo.findById(id);
    if (!module) {
      throw new NotFoundError('Module not found');
    }
    return ModuleMapper.toDTO(module);
  }

  async createModule(data: CreateModuleDTO, adminUserId: string) {
    const existing = await this.repo.findMany({ search: data.slug, page: 1, pageSize: 1 });
    if (existing.total > 0 && existing.modules[0].slug === data.slug) {
      throw new ConflictError('Module slug already exists');
    }
    const created = await this.repo.create(data, adminUserId);
    return ModuleMapper.toDTO(created);
  }

  async updateModule(id: string, data: UpdateModuleDTO, adminUserId: string) {
    await this.getModuleById(id); // Ensure exists
    if (data.slug) {
      const existing = await this.repo.findMany({ search: data.slug, page: 1, pageSize: 1 });
      if (existing.total > 0 && existing.modules[0].id !== id && existing.modules[0].slug === data.slug) {
        throw new ConflictError('Module slug already exists');
      }
    }
    const updated = await this.repo.update(id, data, adminUserId);
    return ModuleMapper.toDTO(updated);
  }

  async deleteModule(id: string, adminUserId: string) {
    await this.getModuleById(id);
    await this.repo.softDelete(id, adminUserId);
    return true;
  }
}

export const moduleService = new ModuleService();
