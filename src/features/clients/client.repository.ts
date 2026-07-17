import { BaseRepository } from '@/lib/core/repository';
import { CreateClientDTO, UpdateClientDTO, ClientQueryDTO } from './client.schema';
import { Prisma } from '@prisma/client';
import { getDateBoundaries } from '@/lib/date-utils';

export class ClientRepository extends BaseRepository<any> {
  async findMany(query: ClientQueryDTO, tzOffset?: number) {
    const { page, pageSize, search, status } = query;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ClientWhereInput = {
      deletedAt: null,
      ...(status && { status }),
      ...(search && {
        OR: [
          { companyName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const { todayStart } = getDateBoundaries(tzOffset);

    const [total, clients] = await Promise.all([
      this.db.client.count({ where }),
      this.db.client.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          subscriptions: {
            include: {
              allowedModules: {
                include: {
                  module: true
                }
              }
            }
          },
          _count: {
            select: {
              apiKeys: { where: { deletedAt: null } },
              requestLogs: {
                where: { timestamp: { gte: todayStart } }
              }
            }
          }
        }
      }),
    ]);

    return { total, clients };
  }

  async findById(id: string, tzOffset?: number) {
    const { todayStart } = getDateBoundaries(tzOffset);
    return this.db.client.findFirst({
      where: { id, deletedAt: null },
      include: {
        subscriptions: {
          include: {
            allowedModules: {
              include: {
                module: true
              }
            }
          }
        },
        apiKeys: {
          where: { deletedAt: null }
        },
        clientAccess: {
          include: {
            microservice: true
          }
        },
        _count: {
          select: { requestLogs: true }
        }
      }
    });
  }

  async create(data: CreateClientDTO, adminUserId: string) {
    return this.db.client.create({
      data: {
        ...data,
        createdById: adminUserId,
        updatedById: adminUserId,
      },
    });
  }

  async update(id: string, data: UpdateClientDTO, adminUserId: string) {
    return this.db.client.update({
      where: { id },
      data: {
        ...data,
        updatedById: adminUserId,
      },
    });
  }

  async softDelete(id: string, adminUserId: string) {
    return this.db.client.update({
      where: { id },
      data: {
        status: 'DELETED',
        deletedAt: this.currentTimestamp,
        deletedById: adminUserId,
      },
    });
  }

  async hardDelete(id: string) {
    return this.db.client.delete({
      where: { id }
    });
  }

  async assignApi(clientId: string, apiId: string) {
    // Check if already assigned
    const existing = await this.db.clientAccess.findFirst({
      where: { clientId, microserviceId: apiId }
    });

    if (existing) return existing;

    // Assign API (Microservice)
    return this.db.clientAccess.create({
      data: {
        clientId,
        microserviceId: apiId,
        enabled: true,
      }
    });
  }

  async getClientAuditLogs(clientId: string) {
    // Get all API keys for this client to include their audit logs too
    const apiKeys = await this.db.apiKey.findMany({
      where: { clientId },
      select: { id: true }
    });
    const apiKeyIds = apiKeys.map((k: any) => k.id);

    return this.db.auditLog.findMany({
      where: {
        OR: [
          { entity: 'CLIENT', entityId: clientId },
          { entity: 'API_KEY', entityId: { in: apiKeyIds } }
        ]
      },
      include: {
        adminUser: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // Limit to recent 100 logs
    });
  }
}

export const clientRepository = new ClientRepository();
