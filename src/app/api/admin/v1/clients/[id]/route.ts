import { NextRequest } from 'next/server';
import { clientService } from '@/features/clients/client.service';
import { UpdateClientSchema } from '@/features/clients/client.schema';
import { ok, badRequest, serverError, notFound, unauthorized } from '@/lib/api/response';
import { AppError } from '@/lib/errors/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    
    const { id } = await params;
    const client = await clientService.getClientById(id);
    return ok(client);
  } catch (error: any) {
    if (error instanceof AppError && error.statusCode === 404) {
      return notFound(error.code, error.message);
    }
    console.error(`GET /clients/:id Error:`, error);
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
    const parsedBody = UpdateClientSchema.safeParse(body);

    if (!parsedBody.success) {
      return badRequest('VALIDATION_ERROR', 'Invalid request body', parsedBody.error.format());
    }

    const updatedClient = await clientService.updateClient(id, parsedBody.data, (session.user as any).id);
    return ok(updatedClient);
  } catch (error: any) {
    if (error instanceof AppError && error.statusCode === 404) {
      return notFound(error.code, error.message);
    }
    console.error(`PATCH /clients/:id Error:`, error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    if ((session.user as any).role !== 'SUPER_ADMIN') return unauthorized('FORBIDDEN', 'Only SUPER_ADMIN can delete clients');

    const { id } = await params;
    const url = new URL(req.url);
    const force = url.searchParams.get('hard') === 'true';
    
    await clientService.deleteClient(id, (session.user as any).id, force);
    return ok({ deleted: true });
  } catch (error: any) {
    if (error instanceof AppError && error.statusCode === 404) {
      return notFound(error.code, error.message);
    }
    console.error(`DELETE /clients/:id Error:`, error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
