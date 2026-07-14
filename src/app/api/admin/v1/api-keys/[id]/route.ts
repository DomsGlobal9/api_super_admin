import { NextRequest } from 'next/server';
import { apiKeyService } from '@/features/api-keys/apikey.service';
import { UpdateApiKeySchema } from '@/features/api-keys/apikey.schema';
import { ok, badRequest, serverError, notFound, unauthorized } from '@/lib/api/response';
import { AppError } from '@/lib/errors/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    
    const { id } = await params;
    const apiKey = await apiKeyService.getApiKeyById(id);
    return ok(apiKey);
  } catch (error: any) {
    if (error instanceof AppError && error.statusCode === 404) {
      return notFound(error.code, error.message);
    }
    console.error(`GET /api-keys/:id Error:`, error);
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
    const parsedBody = UpdateApiKeySchema.safeParse(body);

    if (!parsedBody.success) {
      return badRequest('VALIDATION_ERROR', 'Invalid request body', parsedBody.error.format());
    }

    const updatedKey = await apiKeyService.updateApiKey(id, parsedBody.data, (session.user as any).id);
    return ok(updatedKey);
  } catch (error: any) {
    if (error instanceof AppError && error.statusCode === 404) {
      return notFound(error.code, error.message);
    }
    console.error(`PATCH /api-keys/:id Error:`, error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    if ((session.user as any).role !== 'SUPER_ADMIN') return unauthorized('FORBIDDEN', 'Only SUPER_ADMIN can delete API keys');

    const { id } = await params;
    await apiKeyService.deleteApiKey(id, (session.user as any).id);
    return ok({ deleted: true });
  } catch (error: any) {
    if (error instanceof AppError && error.statusCode === 404) {
      return notFound(error.code, error.message);
    }
    console.error(`DELETE /api-keys/:id Error:`, error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
