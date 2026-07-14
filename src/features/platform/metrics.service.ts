import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

import { PrismaClient } from '@prisma/client';
import { Redis } from '@upstash/redis';

export class MetricsService {
  constructor(
    private readonly db: PrismaClient = prisma,
    private readonly cache: Redis = redis
  ) {}

  async getActiveClientsCount() {
    return this.db.client.count({
      where: { status: 'ACTIVE', deletedAt: null }
    });
  }

  async getRequestsToday() {
    return this.db.requestLog.count({
      where: {
        timestamp: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      }
    });
  }

  async getFailedRequestsToday() {
    return this.db.requestLog.count({
      where: {
        timestamp: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        statusCode: { gte: 400 }
      }
    });
  }

  async getExpiringApiKeysCount() {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    return this.db.apiKey.count({
      where: {
        expiresAt: { lte: thirtyDaysFromNow },
        status: 'ACTIVE',
        deletedAt: null
      }
    });
  }

  async getRPM() {
    // Attempt to pull from Redis, fallback to 0 if not yet recording
    try {
      const keys = await this.cache.keys('rate_limit:*');
      return keys.length;
    } catch {
      return 0;
    }
  }

  async getAverageLatencyMs() {
    try {
      const logs = await this.db.requestLog.findMany({
        take: 100,
        orderBy: { timestamp: 'desc' },
        select: { totalLatencyMs: true }
      });
      if (logs.length === 0) return 0;
      // Filter out nulls safely
      const validLogs = logs.filter(log => log.totalLatencyMs !== null);
      if (validLogs.length === 0) return 0;
      
      const sum = validLogs.reduce((acc, log) => acc + (log.totalLatencyMs || 0), 0);
      return Math.round(sum / validLogs.length);
    } catch {
      return 0;
    }
  }

  async getBandwidthToday() {
    const agg = await this.db.requestLog.aggregate({
      where: { timestamp: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      _sum: { requestSize: true, responseSize: true }
    });
    return (agg._sum.requestSize || 0) + (agg._sum.responseSize || 0);
  }

  async getTopClients() {
    const top = await this.db.requestLog.groupBy({
      by: ['clientId'],
      _count: { _all: true },
      orderBy: { _count: { clientId: 'desc' } },
      take: 5
    });
    
    // Fetch names
    const ids = top.map(t => t.clientId).filter(Boolean) as string[];
    const clients = await this.db.client.findMany({ where: { id: { in: ids } } });
    
    return top.map(t => ({
      clientId: t.clientId,
      name: clients.find(c => c.id === t.clientId)?.companyName || 'Unknown',
      reqs: t._count._all
    }));
  }

  async getTopApis() {
    const top = await this.db.requestLog.groupBy({
      by: ['microserviceId'],
      _count: { _all: true },
      orderBy: { _count: { microserviceId: 'desc' } },
      take: 5
    });
    
    const ids = top.map(t => t.microserviceId).filter(Boolean) as string[];
    const apis = await this.db.microservice.findMany({ where: { id: { in: ids } } });
    
    return top.map(t => ({
      apiId: t.microserviceId,
      name: apis.find(a => a.id === t.microserviceId)?.displayName || 'Unknown',
      reqs: t._count._all
    }));
  }

  async getTopEndpoints() {
    const top = await this.db.requestLog.groupBy({
      by: ['endpoint'],
      _count: { _all: true },
      _avg: { totalLatencyMs: true },
      orderBy: { _count: { endpoint: 'desc' } },
      take: 5
    });
    
    return top.map(t => ({
      path: t.endpoint,
      reqs: t._count._all,
      latency: Math.round(t._avg.totalLatencyMs || 0)
    }));
  }
}

export const metricsService = new MetricsService();
