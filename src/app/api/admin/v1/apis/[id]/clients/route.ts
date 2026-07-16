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

    const [total, clients] = await Promise.all([
      prisma.clientAccess.count({ where: { microserviceId: id } }),
      prisma.clientAccess.findMany({
        where: { microserviceId: id },
        skip,
        take: pageSize,
        include: {
          client: true
        }
      })
    ]);

    // Format output to match client list
    const formattedClients = clients.map(access => ({
      id: access.client.id,
      companyName: access.client.companyName,
      contactEmail: access.client.email,
      status: access.client.status,
      createdAt: access.client.createdAt,
      accessGrantedAt: access.createdAt,
    }));

    return ok({
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      clients: formattedClients
    });

  } catch (error: any) {
    console.error(`GET /apis/:id/clients Error:`, error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
