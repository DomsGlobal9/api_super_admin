import { NextRequest } from 'next/server';
import { ok, serverError, unauthorized } from '@/lib/api/response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    // In a real environment, query Redis directly via the Redis client for INFO memory/stats
    return ok({
      hitRate: 98.3,
      missRate: 1.7,
      totalKeys: 1250,
      memoryUsed: '24MB'
    });
  } catch (error: any) {
    console.error('GET /gateway/cache Error:', error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
