import { NextRequest } from 'next/server';
import { clientRepository } from '@/features/clients/client.repository';
import { ok, serverError, unauthorized } from '@/lib/api/response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    
    const { id } = await params;
    const logs = await clientRepository.getClientAuditLogs(id);
    
    return ok(logs);
  } catch (error: any) {
    console.error(`GET /clients/:id/audit Error:`, error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
