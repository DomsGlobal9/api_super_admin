import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

import { PrismaClient } from '@prisma/client';
import { Redis } from '@upstash/redis';

export class HealthService {
  constructor(
    private readonly db: PrismaClient = prisma,
    private readonly cache: Redis = redis
  ) {}

  async getDatabaseStatus(): Promise<string> {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return 'HEALTHY';
    } catch (e) {
      return 'DOWN';
    }
  }

  async getRedisStatus(): Promise<string> {
    try {
      await this.cache.ping();
      return 'HEALTHY';
    } catch (e) {
      return 'DOWN';
    }
  }

  async getGatewayStatus(): Promise<string> {
    try {
      // In a real multi-node setup we'd query the cluster API.
      // For now, if Redis and Postgres are up, the gateway is considered healthy.
      const db = await this.getDatabaseStatus();
      const rd = await this.getRedisStatus();
      return db === 'HEALTHY' && rd === 'HEALTHY' ? 'HEALTHY' : 'DEGRADED';
    } catch (e) {
      return 'DOWN';
    }
  }

  async getCircuitBreakerStatus() {
    return {
      open: 0, // Placeholder
      halfOpen: 0 // Placeholder
    };
  }

  // Future: getApiHealth(apiId)
}

export const healthService = new HealthService();
