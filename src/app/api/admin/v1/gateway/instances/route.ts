import { NextRequest } from 'next/server';
import { ok, serverError, unauthorized } from '@/lib/api/response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    // In a real environment, query a service registry or Redis heartbeat list
    return ok([
      {
        id: 'gateway-node-1',
        region: 'us-east-1',
        status: 'HEALTHY',
        uptime: 3600,
        version: '1.0.0'
      }
    ]);
  } catch (error: any) {
    console.error('GET /gateway/instances Error:', error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
