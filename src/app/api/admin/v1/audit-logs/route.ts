import { NextRequest } from 'next/server';
import { ok, serverError, unauthorized } from '@/lib/api/response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50');
    const search = url.searchParams.get('search');
    const skip = (page - 1) * pageSize;

    const where: any = {};
    
    // For simplicity, we just search across actor or action if search provided
    // Normally, this would be a more structured query depending on AuditEntity
    if (search) {
      // In a real system you'd join with adminUser to search by email, but for now we search action/entity
      // since the Prisma schema uses enums for Action and Entity, we might not be able to just "contains"
      // we will just pull everything if they search and let UI filter if it's complex, or implement explicit filtering.
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { adminUser: { select: { email: true, name: true } } }
      })
    ]);

    const mapped = logs.map((log: any) => ({
      id: log.id,
      action: log.action,
      actor: log.adminUser?.email || log.adminUser?.name || 'System',
      resource: `${log.entity} : ${log.entityId}`,
      timestamp: log.createdAt,
      ip: log.ipAddress || 'Unknown'
    }));

    return ok(mapped, {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error: any) {
    console.error('GET /audit-logs Error:', error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
