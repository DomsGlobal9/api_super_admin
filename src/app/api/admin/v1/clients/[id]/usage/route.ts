import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { ok, unauthorized, notFound, serverError } from '@/lib/api/response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { getDateBoundaries, getSpecificDateBoundaries } from '@/lib/date-utils';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const { id } = await params;
    
    // Check if client exists
    const client = await prisma.client.findUnique({ where: { id, deletedAt: null } });
    if (!client) return notFound('CLIENT_NOT_FOUND', 'Client not found');

    const tzOffset = req.headers.get('x-timezone-offset');
    const { todayStart, monthStart } = getDateBoundaries(tzOffset ? parseInt(tzOffset, 10) : undefined);

    const statusFilter = req.nextUrl.searchParams.get('status');
    const daysFilter = req.nextUrl.searchParams.get('days');
    const specificDateFilter = req.nextUrl.searchParams.get('specificDate');
    const endpointFilter = req.nextUrl.searchParams.get('endpoint');
    const apiKeyIdFilter = req.nextUrl.searchParams.get('apiKeyId');

    const conditions: Prisma.Sql[] = [Prisma.sql`"clientId" = ${id}`];

    if (apiKeyIdFilter) {
      conditions.push(Prisma.sql`"apiKeyId" = ${apiKeyIdFilter}`);
    }

    if (endpointFilter) {
      conditions.push(Prisma.sql`"endpoint" ILIKE ${'%' + endpointFilter + '%'}`);
    }

    if (daysFilter === 'specific' && specificDateFilter) {
      const { specificStart, specificEnd } = getSpecificDateBoundaries(
        specificDateFilter, 
        tzOffset ? parseInt(tzOffset, 10) : undefined
      );
      conditions.push(Prisma.sql`"timestamp" >= ${specificStart} AND "timestamp" < ${specificEnd}`);
    } else if (daysFilter && daysFilter !== 'specific') {
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
    console.error(`GET /clients/:id/usage Error:`, error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
