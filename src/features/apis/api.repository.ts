import { BaseRepository } from '@/lib/core/repository';
import { CreateApiDTO, UpdateApiDTO, ApiQueryDTO } from './api.schema';
import { Prisma } from '@prisma/client';
import { getDateBoundaries } from '@/lib/date-utils';

export class ApiRepository extends BaseRepository<any> {
  async findMany(query: ApiQueryDTO, tzOffset?: number) {
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

    const { todayStart } = getDateBoundaries(tzOffset);

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
            select: { 
              requestLogs: {
                where: { timestamp: { gte: todayStart } }
              }, 
              clientAccess: true 
            }
          }
        },
        orderBy: { displayName: 'asc' },
      }),
    ]);

    return { total, apis };
  }

  async findById(id: string, tzOffset?: number) {
    const { todayStart } = getDateBoundaries(tzOffset);
    return this.db.microservice.findFirst({
      where: { id, deletedAt: null },
      include: {
        module: true,
        environments: true,
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
          select: { 
            requestLogs: {
              where: { timestamp: { gte: todayStart } }
            } 
          }
        }
      }
    });
  }

  async create(data: CreateApiDTO, adminUserId: string) {
    const { targetUrl, internalSecret, ...rest } = data;
    return this.db.microservice.create({
      data: {
        ...rest,
        createdById: adminUserId,
        updatedById: adminUserId,
        environments: {
          create: {
            environment: 'PRODUCTION',
            targetUrl: targetUrl,
            internalSecret: internalSecret || null,
            status: 'ACTIVE'
          }
        },
        apiVersions: {
          create: {
            version: 'v1'
          }
        }
      },
      include: { module: true, environments: true, apiVersions: true },
    });
  }

  async update(id: string, data: UpdateApiDTO, adminUserId: string) {
    const { targetUrl, internalSecret, ...rest } = data;
    
    // Build nested update for environment if necessary
    const envUpdate: any = {};
    if (targetUrl !== undefined) envUpdate.targetUrl = targetUrl;
    if (internalSecret !== undefined) envUpdate.internalSecret = internalSecret || null;

    return this.db.microservice.update({
      where: { id },
      data: {
        ...rest,
        updatedById: adminUserId,
        ...(Object.keys(envUpdate).length > 0 && {
          environments: {
            updateMany: {
              where: { environment: 'PRODUCTION' },
              data: envUpdate
            }
          }
        })
      },
      include: { module: true, environments: true },
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
    const versions = await this.db.apiVersion.findMany({
      where: { microserviceId },
      include: {
        endpoints: {
          orderBy: { method: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const requestCounts = await this.db.requestLog.groupBy({
      by: ['endpoint', 'method'],
      where: { microserviceId },
      _count: { id: true }
    });

    return versions.map(v => ({
      ...v,
      endpoints: v.endpoints.map(ep => {
        const matchingLog = requestCounts.find(log => log.endpoint === ep.path && log.method === ep.method);
        return {
          ...ep,
          requests: matchingLog ? matchingLog._count.id : 0
        };
      })
    }));
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

  async getTopEndpoints(microserviceId: string, limit = 5) {
    const top = await this.db.requestLog.groupBy({
      by: ['endpoint', 'method'],
      where: { microserviceId },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit
    });
    return top.map(t => ({
      endpoint: t.endpoint,
      method: t.method,
      requests: t._count.id
    }));
  }
}

export const apiRepository = new ApiRepository();

