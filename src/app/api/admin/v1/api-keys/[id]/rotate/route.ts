import { NextRequest } from 'next/server';
import { apiKeyService } from '@/features/api-keys/apikey.service';
import { ok, serverError, notFound, unauthorized } from '@/lib/api/response';
import { AppError } from '@/lib/errors/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    if ((session.user as any).role === 'VIEWER') return unauthorized('FORBIDDEN', 'Insufficient permissions');

    const { id } = await params;
    const rotatedKey = await apiKeyService.rotateApiKey(id, (session.user as any).id);
    return ok(rotatedKey);
  } catch (error: any) {
    if (error instanceof AppError && error.statusCode === 404) {
      return notFound(error.code, error.message);
    }
    console.error(`POST /api-keys/:id/rotate Error:`, error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
