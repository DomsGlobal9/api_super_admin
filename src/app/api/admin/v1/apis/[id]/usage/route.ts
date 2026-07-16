import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { ok, unauthorized, notFound, serverError } from '@/lib/api/response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const { id } = await params;
    
    // Check if API exists
    const api = await prisma.microservice.findUnique({ where: { id, deletedAt: null } });
    if (!api) return notFound('API_NOT_FOUND', 'API not found');

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const statusFilter = req.nextUrl.searchParams.get('status');
    const daysFilter = req.nextUrl.searchParams.get('days');
    const endpointFilter = req.nextUrl.searchParams.get('endpoint');
    const apiKeyIdFilter = req.nextUrl.searchParams.get('apiKeyId');
    const clientIdFilter = req.nextUrl.searchParams.get('clientId');

    const conditions: Prisma.Sql[] = [Prisma.sql`"microserviceId" = ${id}`];

    if (apiKeyIdFilter) {
      conditions.push(Prisma.sql`"apiKeyId" = ${apiKeyIdFilter}`);
    }
    
    if (clientIdFilter) {
      conditions.push(Prisma.sql`"clientId" = ${clientIdFilter}`);
    }

    if (endpointFilter) {
      conditions.push(Prisma.sql`"endpoint" ILIKE ${'%' + endpointFilter + '%'}`);
    }

    if (daysFilter) {
      const days = parseInt(daysFilter, 10);
      if (!isNaN(days) && days > 0) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        conditions.push(Prisma.sql`"timestamp" >= ${date}`);
      }
    }

    if (statusFilter === 'success') {
      conditions.push(Prisma.sql`"statusCode" >= 200 AND "statusCode" < 400`);
    } else if (statusFilter === 'client_error') {
      conditions.push(Prisma.sql`"statusCode" >= 400 AND "statusCode" < 500`);
    } else if (statusFilter === 'server_error') {
      conditions.push(Prisma.sql`"statusCode" >= 500`);
    }

    const whereClause = Prisma.join(conditions, ' AND ');

    // Using raw SQL for efficient aggregations on high-volume RequestLog
    const usageQuery = await prisma.$queryRaw`
      SELECT 
        COUNT(*)::int as "totalRequests",
        SUM(CASE WHEN "statusCode" >= 200 AND "statusCode" < 400 THEN 1 ELSE 0 END)::int as "success",
        SUM(CASE WHEN "statusCode" >= 400 THEN 1 ELSE 0 END)::int as "failed",
        AVG("totalLatencyMs")::float as "avgLatency",
        SUM(CASE WHEN "timestamp" >= ${todayStart} THEN 1 ELSE 0 END)::int as "today",
        SUM(CASE WHEN "timestamp" >= ${monthStart} THEN 1 ELSE 0 END)::int as "thisMonth"
      FROM super_admin."RequestLog"
      WHERE ${whereClause}
    `;

    const stats = (usageQuery as any[])[0] || {
      totalRequests: 0,
      success: 0,
      failed: 0,
      avgLatency: 0,
      today: 0,
      thisMonth: 0
    };

    return ok({
      totalRequests: stats.totalRequests || 0,
      success: stats.success || 0,
      failed: stats.failed || 0,
      avgLatency: Math.round(stats.avgLatency || 0),
      today: stats.today || 0,
      thisMonth: stats.thisMonth || 0
    });

  } catch (error: any) {
    console.error(`GET /apis/:id/usage Error:`, error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
