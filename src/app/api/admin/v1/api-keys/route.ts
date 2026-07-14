import { NextRequest } from 'next/server';
import { apiKeyService } from '@/features/api-keys/apikey.service';
import { CreateApiKeySchema, ApiKeyQuerySchema } from '@/features/api-keys/apikey.schema';
import { ok, badRequest, serverError, created, unauthorized } from '@/lib/api/response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    const parsedQuery = ApiKeyQuerySchema.safeParse(queryParams);
    if (!parsedQuery.success) {
      return badRequest('VALIDATION_ERROR', 'Invalid query parameters', parsedQuery.error.format());
    }

    const result = await apiKeyService.getApiKeys(parsedQuery.data);

    return ok(result.apiKeys, {
      page: parsedQuery.data.page,
      pageSize: parsedQuery.data.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / parsedQuery.data.pageSize),
    });
  } catch (error: any) {
    console.error('GET /api-keys Error:', error);
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
    const parsedBody = CreateApiKeySchema.safeParse(body);

    if (!parsedBody.success) {
      return badRequest('VALIDATION_ERROR', 'Invalid request body', parsedBody.error.format());
    }

    const apiKey = await apiKeyService.createApiKey(parsedBody.data, (session.user as any).id);
    return created(apiKey);
  } catch (error: any) {
    console.error('POST /api-keys Error:', error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
