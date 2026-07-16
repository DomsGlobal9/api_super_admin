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
    
    // Parse pagination parameters
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    const skip = (page - 1) * pageSize;

    // Check if API exists
    const api = await prisma.microservice.findUnique({ where: { id, deletedAt: null } });
    if (!api) return notFound('API_NOT_FOUND', 'API not found');

    const statusFilter = searchParams.get('status');
    const daysFilter = searchParams.get('days');
    const endpointFilter = searchParams.get('endpoint');
    const apiKeyIdFilter = searchParams.get('apiKeyId');
    const clientIdFilter = searchParams.get('clientId');

    // Build Prisma where clause
    const where: any = { microserviceId: id };

    if (clientIdFilter) {
      where.clientId = clientIdFilter;
    }

    if (statusFilter) {
      if (statusFilter === 'success') where.statusCode = { gte: 200, lt: 400 };
      if (statusFilter === 'client_error') where.statusCode = { gte: 400, lt: 500 };
      if (statusFilter === 'server_error') where.statusCode = { gte: 500 };
    }

    if (daysFilter) {
      const days = parseInt(daysFilter, 10);
      if (!isNaN(days) && days > 0) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        where.timestamp = { gte: date };
      }
    }

    if (endpointFilter) {
      where.endpoint = { contains: endpointFilter, mode: 'insensitive' };
    }

    if (apiKeyIdFilter) {
      where.apiKeyId = apiKeyIdFilter;
    }

    const [total, requests] = await Promise.all([
      prisma.requestLog.count({ where }),
      prisma.requestLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: pageSize,
        include: {
          client: { select: { companyName: true } },
          apiKey: { select: { name: true } }
        }
      })
    ]);

    return ok({
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      requests
    });

  } catch (error: any) {
    console.error(`GET /apis/:id/logs Error:`, error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
