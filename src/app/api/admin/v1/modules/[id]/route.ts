import { NextRequest } from 'next/server';
import { moduleService } from '@/features/modules/module.service';
import { UpdateModuleSchema } from '@/features/modules/module.schema';
import { ok, badRequest, serverError, notFound, unauthorized, conflict } from '@/lib/api/response';
import { AppError } from '@/lib/errors/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    
    const { id } = await params;
    const module = await moduleService.getModuleById(id);
    return ok(module);
  } catch (error: any) {
    if (error instanceof AppError && error.statusCode === 404) {
      return notFound(error.code, error.message);
    }
    console.error(`GET /modules/:id Error:`, error);
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
    const parsedBody = UpdateModuleSchema.safeParse(body);

    if (!parsedBody.success) {
      return badRequest('VALIDATION_ERROR', 'Invalid request body', parsedBody.error.format());
    }

    const updatedModule = await moduleService.updateModule(id, parsedBody.data, (session.user as any).id);
    return ok(updatedModule);
  } catch (error: any) {
    if (error instanceof AppError && error.statusCode === 404) {
      return notFound(error.code, error.message);
    }
    if (error instanceof AppError && error.statusCode === 409) {
      return conflict(error.code, error.message);
    }
    console.error(`PATCH /modules/:id Error:`, error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    if ((session.user as any).role !== 'SUPER_ADMIN') return unauthorized('FORBIDDEN', 'Only SUPER_ADMIN can delete modules');

    const { id } = await params;
    await moduleService.deleteModule(id, (session.user as any).id);
    return ok({ deleted: true });
  } catch (error: any) {
    if (error instanceof AppError && error.statusCode === 404) {
      return notFound(error.code, error.message);
    }
    console.error(`DELETE /modules/:id Error:`, error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
