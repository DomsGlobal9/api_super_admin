import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, unauthorized, notFound, serverError } from '@/lib/api/response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const { id } = await params;
    
    // Check if client exists
    const client = await prisma.client.findUnique({ where: { id, deletedAt: null } });
    if (!client) return notFound('CLIENT_NOT_FOUND', 'Client not found');

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

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
      WHERE "clientId" = ${id}
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
