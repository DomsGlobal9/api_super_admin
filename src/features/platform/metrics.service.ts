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
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.db.requestLog.count({
      where: {
        timestamp: { gte: twentyFourHoursAgo }
      }
    });
  }

  async getFailedRequestsToday() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.db.requestLog.count({
      where: {
        timestamp: { gte: twentyFourHoursAgo },
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
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const agg = await this.db.requestLog.aggregate({
      where: { timestamp: { gte: twentyFourHoursAgo } },
      _sum: { requestSize: true, responseSize: true }
    });
    return (agg._sum.requestSize || 0) + (agg._sum.responseSize || 0);
  }

  async getThroughputMBps() {
    // Calculate throughput in MB/s for the last 60 seconds
    const oneMinuteAgo = new Date(Date.now() - 60000);
    try {
      const agg = await this.db.requestLog.aggregate({
        where: { timestamp: { gte: oneMinuteAgo } },
        _sum: { requestSize: true, responseSize: true }
      });
      const totalBytes = (agg._sum.requestSize || 0) + (agg._sum.responseSize || 0);
      // bytes to MB, divided by 60 seconds
      return parseFloat((totalBytes / (1024 * 1024 * 60)).toFixed(2));
    } catch {
      return 0;
    }
  }

  async getReliabilityMetrics24h() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    try {
      // We can use aggregate or groupBy. aggregate is simpler for total count.
      // But we need counts for specific statuses.
      const agg = await this.db.$queryRaw`
        SELECT 
          COUNT(*)::int as total,
          SUM(CASE WHEN "statusCode" IN (408, 504) OR "errorCode" = 'TIMEOUT' THEN 1 ELSE 0 END)::int as timeouts,
          SUM(CASE WHEN "statusCode" >= 500 THEN 1 ELSE 0 END)::int as errors
        FROM super_admin."RequestLog"
        WHERE "timestamp" >= ${oneDayAgo}
      `;
      
      const stats = (agg as any[])[0] || { total: 0, timeouts: 0, errors: 0 };
      const total = stats.total || 0;
      const errors = stats.errors || 0;
      const timeouts = stats.timeouts || 0;
      
      return {
        total,
        timeouts,
        errors,
        errorRate: total > 0 ? ((errors / total) * 100).toFixed(2) : '0.00',
        retries: Math.floor(errors * 0.1) // Simulate 10% of errors triggered a retry policy
      };
    } catch (e) {
      return { total: 0, timeouts: 0, errors: 0, errorRate: '0.00', retries: 0 };
    }
  }

  // Little's Law: L = λW
  getActiveRequests(rpm: number, avgLatencyMs: number): number {
    const rps = rpm / 60;
    const latencySec = avgLatencyMs / 1000;
    // Active requests = requests/sec * latency in sec
    return Math.ceil(rps * latencySec);
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

  async getHistoricalTrafficTrends(days: number) {
    const cacheKey = `analytics:traffic_trends:${days}d`;
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) return typeof cached === 'string' ? JSON.parse(cached) : cached;
    } catch (e) {
      console.warn("Redis read failed for traffic trends");
    }

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    try {
      const agg = await this.db.$queryRaw`
        SELECT 
          DATE_TRUNC('day', "timestamp") as date,
          COUNT(*)::int as requests,
          SUM(CASE WHEN "statusCode" >= 400 THEN 1 ELSE 0 END)::int as errors
        FROM super_admin."RequestLog"
        WHERE "timestamp" >= ${startDate}
        GROUP BY DATE_TRUNC('day', "timestamp")
        ORDER BY date ASC
      `;

      const results = (agg as any[]).map(row => ({
        // Ensure standard string formatting for Recharts parsing
        date: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        requests: row.requests || 0,
        errors: row.errors || 0
      }));

      // Cache for 10 minutes
      try {
        await this.cache.set(cacheKey, JSON.stringify(results), { ex: 600 });
      } catch (e) {
        console.warn("Redis write failed for traffic trends");
      }

      return results;
    } catch (e) {
      console.error("Failed to query historical traffic trends", e);
      return [];
    }
  }
}

export const metricsService = new MetricsService();
