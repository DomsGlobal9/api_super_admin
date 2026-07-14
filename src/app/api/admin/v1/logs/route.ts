import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LogsMapper } from '@/features/logs/logs.mapper';
import { ok, serverError, badRequest, unauthorized } from '@/lib/api/response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { parsePagination, buildPaginationMeta } from '@/lib/api/pagination';
import { z } from 'zod';

const LogsQuerySchema = z.object({
  search: z.string().optional(),
  clientId: z.string().uuid().optional(),
  apiId: z.string().uuid().optional(),
  status: z.string().optional(),
  requestId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const pagination = parsePagination(req, 50); // Default to 50 logs per page

    const url = new URL(req.url);
    const queryParams = {
      page: url.searchParams.get('page') || undefined,
      pageSize: url.searchParams.get('pageSize') || undefined,
      search: url.searchParams.get('search') || undefined,
      clientId: url.searchParams.get('clientId') || undefined,
      apiId: url.searchParams.get('apiId') || undefined,
      status: url.searchParams.get('status') || undefined,
      requestId: url.searchParams.get('requestId') || undefined,
    };

    const parsedQuery = LogsQuerySchema.safeParse(queryParams);
    if (!parsedQuery.success) {
      return badRequest('VALIDATION_ERROR', 'Invalid query parameters', parsedQuery.error.format());
    }

    const { search, clientId, apiId, status, requestId } = parsedQuery.data;

    const where: any = {
      ...(clientId && { clientId }),
      ...(apiId && { microserviceId: apiId }),
      ...(status && { status }),
      ...(requestId && { requestId }),
      ...(search && {
        OR: [
          { endpoint: { contains: search, mode: 'insensitive' } },
          { errorMessage: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [total, logs] = await Promise.all([
      prisma.requestLog.count({ where }),
      prisma.requestLog.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        include: {
          client: true,
          microservice: true
        },
        orderBy: { timestamp: 'desc' }
      })
    ]);

    const mappedLogs = LogsMapper.toDTOList(logs);

    return ok(mappedLogs, buildPaginationMeta(total, pagination));
  } catch (error: any) {
    console.error('GET /logs Error:', error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
