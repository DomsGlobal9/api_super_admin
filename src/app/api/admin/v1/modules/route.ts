import { NextRequest } from 'next/server';
import { moduleService } from '@/features/modules/module.service';
import { CreateModuleSchema, ModuleQuerySchema } from '@/features/modules/module.schema';
import { ok, badRequest, serverError, created, unauthorized, conflict } from '@/lib/api/response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { AppError } from '@/lib/errors/errors';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const url = new URL(req.url);
    const queryParams = {
      page: url.searchParams.get('page') || undefined,
      pageSize: url.searchParams.get('pageSize') || undefined,
      search: url.searchParams.get('search') || undefined,
      status: url.searchParams.get('status') || undefined,
    };

    const parsedQuery = ModuleQuerySchema.safeParse(queryParams);
    if (!parsedQuery.success) {
      return badRequest('VALIDATION_ERROR', 'Invalid query parameters', parsedQuery.error.format());
    }

    const result = await moduleService.getModules(parsedQuery.data);

    return ok(result.modules, {
      page: parsedQuery.data.page,
      pageSize: parsedQuery.data.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / parsedQuery.data.pageSize),
    });
  } catch (error: any) {
    console.error('GET /modules Error:', error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    if ((session.user as any).role === 'VIEWER') {
      return unauthorized('FORBIDDEN', 'Insufficient permissions');
    }

    const body = await req.json();
    const parsedBody = CreateModuleSchema.safeParse(body);

    if (!parsedBody.success) {
      return badRequest('VALIDATION_ERROR', 'Invalid request body', parsedBody.error.format());
    }

    const module = await moduleService.createModule(parsedBody.data, (session.user as any).id);
    return created(module);
  } catch (error: any) {
    if (error instanceof AppError && error.statusCode === 409) {
      return conflict(error.code, error.message);
    }
    console.error('POST /modules Error:', error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
