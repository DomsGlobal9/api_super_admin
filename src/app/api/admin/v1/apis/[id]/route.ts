import { NextRequest } from 'next/server';
import { apiService } from '@/features/apis/api.service';
import { UpdateApiSchema } from '@/features/apis/api.schema';
import { ok, badRequest, serverError, notFound, unauthorized, conflict } from '@/lib/api/response';
import { AppError } from '@/lib/errors/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    
    const { id } = await params;
    const api = await apiService.getApiById(id);
    return ok(api);
  } catch (error: any) {
    if (error instanceof AppError && error.statusCode === 404) {
      return notFound(error.code, error.message);
    }
    console.error(`GET /apis/:id Error:`, error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    if ((session.user as any).role === 'VIEWER') return unauthorized('FORBIDDEN', 'Insufficient permissions');

    const { id } = await params;
    const body = await req.json();
    const parsedBody = UpdateApiSchema.safeParse(body);

    if (!parsedBody.success) {
      return badRequest('VALIDATION_ERROR', 'Invalid request body', parsedBody.error.format());
    }

    const updatedApi = await apiService.updateApi(id, parsedBody.data, (session.user as any).id);
    return ok(updatedApi);
  } catch (error: any) {
    if (error instanceof AppError && error.statusCode === 404) {
      return notFound(error.code, error.message);
    }
    if (error instanceof AppError && error.statusCode === 409) {
      return conflict(error.code, error.message);
    }
    console.error(`PATCH /apis/:id Error:`, error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    if ((session.user as any).role !== 'SUPER_ADMIN') return unauthorized('FORBIDDEN', 'Only SUPER_ADMIN can delete APIs');

    const { id } = await params;
    await apiService.deleteApi(id, (session.user as any).id);
    return ok({ deleted: true });
  } catch (error: any) {
    if (error instanceof AppError && error.statusCode === 404) {
      return notFound(error.code, error.message);
    }
    console.error(`DELETE /apis/:id Error:`, error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
