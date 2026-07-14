import { NextRequest } from 'next/server';
import { clientService } from '@/features/clients/client.service';
import { CreateClientSchema, ClientQuerySchema } from '@/features/clients/client.schema';
import { ok, badRequest, serverError, created, unauthorized, forbidden, conflict } from '@/lib/api/response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    const parsedQuery = ClientQuerySchema.safeParse(queryParams);
    if (!parsedQuery.success) {
      return badRequest('VALIDATION_ERROR', 'Invalid query parameters', parsedQuery.error.format());
    }

    const result = await clientService.getClients(parsedQuery.data);

    return ok(result.clients, {
      page: parsedQuery.data.page,
      pageSize: parsedQuery.data.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / parsedQuery.data.pageSize),
    });
  } catch (error: any) {
    console.error('GET /clients Error:', error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    
    // Explicit RBAC check example
    if ((session.user as any).role === 'VIEWER') {
      return forbidden('FORBIDDEN', 'Insufficient permissions');
    }

    const body = await req.json();
    const parsedBody = CreateClientSchema.safeParse(body);

    if (!parsedBody.success) {
      return badRequest('VALIDATION_ERROR', 'Invalid request body', parsedBody.error.format());
    }

    const client = await clientService.createClient(parsedBody.data, (session.user as any).id);

    return created(client);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return conflict('CONFLICT', 'A client with this email already exists');
    }
    console.error('POST /clients Error:', error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
