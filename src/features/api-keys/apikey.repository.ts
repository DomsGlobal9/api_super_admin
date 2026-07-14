import { BaseRepository } from '@/lib/core/repository';
import { CreateApiKeyDTO, UpdateApiKeyDTO, ApiKeyQueryDTO } from './apikey.schema';
import { Prisma } from '@prisma/client';

export class ApiKeyRepository extends BaseRepository<any> {
  async findMany(query: ApiKeyQueryDTO) {
    const { page, pageSize, search, clientId, status } = query;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ApiKeyWhereInput = {
      deletedAt: null,
      ...(clientId && { clientId }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, apiKeys] = await Promise.all([
      this.db.apiKey.count({ where }),
      this.db.apiKey.findMany({
        where,
        skip,
        take: pageSize,
        include: { 
          client: {
            include: { subscriptions: true }
          },
          allowedModules: { include: { module: true } },
          allowedMicroservices: { include: { microservice: true } }
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, apiKeys };
  }

  async findById(id: string) {
    return this.db.apiKey.findFirst({
      where: { id, deletedAt: null },
      include: {
        client: true,
        allowedModules: { include: { module: true } },
        allowedMicroservices: { include: { microservice: true } }
      }
    });
  }

  async create(data: CreateApiKeyDTO & { keyHash: string }, adminUserId: string) {
    const { keyHash, ...rest } = data;
    return this.db.apiKey.create({
      data: {
        ...rest,
        keyHash,
        createdById: adminUserId,
        updatedById: adminUserId,
      },
      include: { client: true },
    });
  }

  async update(id: string, data: UpdateApiKeyDTO, adminUserId: string) {
    return this.db.apiKey.update({
      where: { id },
      data: {
        ...data,
        updatedById: adminUserId,
      },
      include: { client: true },
    });
  }

  async softDelete(id: string, adminUserId: string) {
    return this.db.apiKey.update({
      where: { id },
      data: {
        status: 'REVOKED',
        deletedAt: this.currentTimestamp,
        deletedById: adminUserId,
      },
    });
  }

  async rotate(id: string, newKeyHash: string, adminUserId: string) {
    return this.db.apiKey.update({
      where: { id },
      data: {
        keyHash: newKeyHash,
        updatedById: adminUserId,
      },
      include: { client: true },
    });
  }
}

export const apiKeyRepository = new ApiKeyRepository();
