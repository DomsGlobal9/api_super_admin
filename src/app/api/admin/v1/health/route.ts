import { NextRequest } from 'next/server';
import { apiRepository } from '@/features/apis/api.repository';
import { ok, serverError, unauthorized } from '@/lib/api/response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    // Fetch all active APIs
    const apis = await apiRepository.findMany({ page: 1, pageSize: 100 });
    const { prisma } = await import('@/lib/prisma');
    
    // For each API, calculate real metrics from RequestLog
    const healthStatus = await Promise.all(apis.apis.map(async (api) => {
      // Get today's logs for this API
      const today = new Date(new Date().setHours(0, 0, 0, 0));
      
      const agg = await prisma.requestLog.aggregate({
        where: { microserviceId: api.id, timestamp: { gte: today } },
        _count: { _all: true },
        _avg: { totalLatencyMs: true }
      });

      const failedCount = await prisma.requestLog.count({
        where: { microserviceId: api.id, timestamp: { gte: today }, statusCode: { gte: 400 } }
      });

      const totalReqs = agg._count._all || 0;
      const successRate = totalReqs > 0 ? ((totalReqs - failedCount) / totalReqs) * 100 : 100;
      const avgLatency = Math.round(agg._avg.totalLatencyMs || 0);

      // Simple status logic based on SLA
      let status = 'HEALTHY';
      if (successRate < 99.0) status = 'CRITICAL';
      else if (successRate < 99.9 || avgLatency > 500) status = 'DEGRADED';

      return {
        apiId: api.id,
        name: api.displayName,
        description: api.description || 'Core service',
        status: status,
        latencyMs: avgLatency,
        dependencies: [
          { name: 'Platform DB', status: 'HEALTHY' }, // Simplified
          { name: 'Redis Cache', status: 'HEALTHY' }
        ],
        recentFailures: failedCount,
        successRate: successRate,
        lastCheck: new Date(),
        sla: '99.95%'
      };
    }));

    return ok(healthStatus);
  } catch (error: any) {
    console.error('GET /health Error:', error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
