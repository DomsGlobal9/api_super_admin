import { BaseRepository } from '@/lib/core/repository';
import { CreateModuleDTO, UpdateModuleDTO, ModuleQueryDTO } from './module.schema';
import { Prisma } from '@prisma/client';

export class ModuleRepository extends BaseRepository<any> {
  async findMany(query: ModuleQueryDTO) {
    const { page, pageSize, search, status } = query;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ModuleWhereInput = {
      deletedAt: null,
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, modules] = await Promise.all([
      this.db.module.count({ where }),
      this.db.module.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          microservices: { where: { deletedAt: null } },
          subscriptionAccess: { include: { subscription: true } }
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return { total, modules };
  }

  async findById(id: string) {
    return this.db.module.findFirst({
      where: { id, deletedAt: null },
      include: {
        microservices: { where: { deletedAt: null } }
      }
    });
  }

  async create(data: CreateModuleDTO, adminUserId: string) {
    return this.db.module.create({
      data: {
        ...data,
        createdById: adminUserId,
        updatedById: adminUserId,
      },
      include: { microservices: true }
    });
  }

  async update(id: string, data: UpdateModuleDTO, adminUserId: string) {
    return this.db.module.update({
      where: { id },
      data: {
        ...data,
        updatedById: adminUserId,
      },
      include: { microservices: true }
    });
  }

  async softDelete(id: string, adminUserId: string) {
    return this.db.module.update({
      where: { id },
      data: {
        status: 'DISABLED', // Assuming you don't have DELETED for Modules, else map appropriately
        deletedAt: this.currentTimestamp,
        deletedById: adminUserId,
      },
    });
  }
}

export const moduleRepository = new ModuleRepository();
