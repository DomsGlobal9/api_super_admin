import { NextRequest } from 'next/server';
import { apiService } from '@/features/apis/api.service';
import { ok, serverError, notFound, unauthorized } from '@/lib/api/response';
import { AppError } from '@/lib/errors/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    
    const { id } = await params;
    const overview = await apiService.getApiOverview(id);
    return ok(overview);
  } catch (error: any) {
    if (error instanceof AppError && error.statusCode === 404) {
      return notFound(error.code, error.message);
    }
    console.error(`GET /apis/:id/overview Error:`, error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
