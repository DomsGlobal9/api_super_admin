import { BaseRepository } from '@/lib/core/repository';
import { CreateApiDTO, UpdateApiDTO, ApiQueryDTO } from './api.schema';
import { Prisma } from '@prisma/client';

export class ApiRepository extends BaseRepository<any> {
  async findMany(query: ApiQueryDTO) {
    const { page, pageSize, search, moduleId } = query;
    const skip = (page - 1) * pageSize;

    const where: Prisma.MicroserviceWhereInput = {
      deletedAt: null,
      ...(moduleId && { moduleId }),
      ...(search && {
        OR: [
          { displayName: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, apis] = await Promise.all([
      this.db.microservice.count({ where }),
      this.db.microservice.findMany({
        where,
        skip,
        take: pageSize,
        include: { 
          module: true,
          apiVersions: {
            include: {
              _count: { select: { endpoints: true } }
            }
          },
          _count: {
            select: { requestLogs: true, clientAccess: true }
          }
        },
        orderBy: { displayName: 'asc' },
      }),
    ]);

    return { total, apis };
  }

  async findById(id: string) {
    return this.db.microservice.findFirst({
      where: { id, deletedAt: null },
      include: {
        module: true,
        apiVersions: {
          where: { status: { not: 'DISABLED' } },
          include: {
            _count: { select: { endpoints: true } }
          }
        },
        clientAccess: {
          include: { client: true }
        },
        apiKeyAccess: {
          include: { apiKey: true }
        },
        _count: {
          select: { requestLogs: true }
        }
      }
    });
  }

  async create(data: CreateApiDTO, adminUserId: string) {
    return this.db.microservice.create({
      data: {
        ...data,
        createdById: adminUserId,
        updatedById: adminUserId,
      },
      include: { module: true },
    });
  }

  async update(id: string, data: UpdateApiDTO, adminUserId: string) {
    return this.db.microservice.update({
      where: { id },
      data: {
        ...data,
        updatedById: adminUserId,
      },
      include: { module: true },
    });
  }

  async softDelete(id: string, adminUserId: string) {
    return this.db.microservice.update({
      where: { id },
      data: {
        deletedAt: this.currentTimestamp,
        deletedById: adminUserId,
      },
    });
  }

  async getVersionsWithEndpoints(microserviceId: string) {
    return this.db.apiVersion.findMany({
      where: { microserviceId },
      include: {
        endpoints: {
          orderBy: { method: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createEndpoint(data: import('./api.schema').CreateEndpointDTO) {
    return this.db.apiEndpoint.create({
      data: {
        apiVersionId: data.apiVersionId,
        name: data.name,
        path: data.path,
        backendPath: data.backendPath,
        method: data.method,
        status: data.status,
        visibility: data.visibility,
        timeoutMs: data.timeoutMs,
        payloadLimit: data.payloadLimit,
      }
    });
  }
}

export const apiRepository = new ApiRepository();

