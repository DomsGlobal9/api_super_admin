import { NextRequest } from 'next/server';
import { clientService } from '@/features/clients/client.service';
import { ok, badRequest, serverError, created, unauthorized, notFound } from '@/lib/api/response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { AppError } from '@/lib/errors/errors';
import { z } from 'zod';

const AssignModuleSchema = z.object({
  moduleId: z.string().uuid()
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    if ((session.user as any).role === 'VIEWER') {
      return unauthorized('FORBIDDEN', 'Insufficient permissions');
    }

    const { id } = await params;
    const body = await req.json();
    const parsedBody = AssignModuleSchema.safeParse(body);

    if (!parsedBody.success) {
      return badRequest('VALIDATION_ERROR', 'Invalid request body', parsedBody.error.format());
    }

    const assignment = await clientService.assignModule(id, parsedBody.data.moduleId);
    return created(assignment);
  } catch (error: any) {
    if (error instanceof AppError && error.statusCode === 404) {
      return notFound(error.code, error.message);
    }
    console.error('POST /clients/:id/modules Error:', error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
