import { BaseRepository } from '@/lib/core/repository';
import { CreateClientDTO, UpdateClientDTO, ClientQueryDTO } from './client.schema';
import { Prisma } from '@prisma/client';

export class ClientRepository extends BaseRepository<any> {
  async findMany(query: ClientQueryDTO) {
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
              requestLogs: true
            }
          }
        }
      }),
    ]);

    return { total, clients };
  }

  async findById(id: string) {
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

  async assignModule(clientId: string, moduleId: string) {
    // 1. Ensure client has a subscription
    let subscription = await this.db.subscription.findFirst({
      where: { clientId, status: 'ACTIVE' }
    });

    if (!subscription) {
      subscription = await this.db.subscription.create({
        data: {
          clientId,
          plan: 'CUSTOM',
          name: 'Custom Plan',
          status: 'ACTIVE',
        }
      });
    }

    // 2. Check if already assigned
    const existing = await this.db.subscriptionModuleAccess.findFirst({
      where: { subscriptionId: subscription.id, moduleId }
    });

    if (existing) return existing;

    // 3. Assign module
    return this.db.subscriptionModuleAccess.create({
      data: {
        subscriptionId: subscription.id,
        moduleId,
      }
    });
  }
}

export const clientRepository = new ClientRepository();
