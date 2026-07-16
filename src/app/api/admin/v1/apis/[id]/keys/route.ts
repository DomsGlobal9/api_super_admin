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

    const [total, keys] = await Promise.all([
      prisma.apiKey.count({
        where: {
          deletedAt: null,
          client: { clientAccess: { some: { microserviceId: id } } }
        }
      }),
      prisma.apiKey.findMany({
        where: {
          deletedAt: null,
          client: { clientAccess: { some: { microserviceId: id } } }
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { companyName: true } }
        }
      })
    ]);

    // Format output to match keys list
    const formattedKeys = keys.map(key => ({
      id: key.id,
      name: key.name,
      prefix: key.rawKey ? key.rawKey.substring(0, 8) : 'sk_',
      status: key.status,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      clientName: key.client?.companyName,
      environmentName: key.type,
    }));

    return ok({
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      keys: formattedKeys
    });

  } catch (error: any) {
    console.error(`GET /apis/:id/keys Error:`, error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}

