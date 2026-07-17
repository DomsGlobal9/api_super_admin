import { NextRequest } from 'next/server';
import { apiService } from '@/features/apis/api.service';
import { CreateEndpointSchema } from '@/features/apis/api.schema';
import { ok, badRequest, serverError, created, unauthorized, notFound } from '@/lib/api/response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { AppError } from '@/lib/errors/errors';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const { id } = await params;
    const versions = await apiService.getVersionsWithEndpoints(id);
    return ok(versions);
  } catch (error: any) {
    if (error instanceof AppError && error.statusCode === 404) {
      return notFound(error.code, error.message);
    }
    console.error(`GET /apis/:id/endpoints Error:`, error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    if ((session.user as any).role === 'VIEWER') {
      return unauthorized('FORBIDDEN', 'Insufficient permissions');
    }

    const { id } = await params;
    const body = await req.json();
    const parsedBody = CreateEndpointSchema.safeParse(body);

    if (!parsedBody.success) {
      console.error('Validation Error Details:', JSON.stringify(parsedBody.error.format(), null, 2));
      return badRequest('VALIDATION_ERROR', 'Invalid request body', parsedBody.error.format());
    }

    const endpoint = await apiService.createEndpoint(id, parsedBody.data);
    return created(endpoint);
  } catch (error: any) {
    if (error instanceof AppError && error.statusCode === 404) {
      return notFound(error.code, error.message);
    }
    console.error('POST /apis/:id/endpoints Error:', error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
