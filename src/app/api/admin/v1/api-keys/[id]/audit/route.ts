import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, serverError, unauthorized } from '@/lib/api/response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const { id } = await params;

    const logs = await prisma.auditLog.findMany({
      where: {
        entity: 'API_KEY',
        entityId: id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        adminUser: {
          select: { name: true, email: true }
        }
      }
    });

    return ok(logs);
  } catch (error: any) {
    console.error('GET /api-keys/:id/audit Error:', error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
