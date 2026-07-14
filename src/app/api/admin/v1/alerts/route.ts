import { NextRequest } from 'next/server';
import { alertEngine } from '@/features/platform/alert.engine';
import { ok, serverError, unauthorized } from '@/lib/api/response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    // The Alert Engine acts as the central hub for detecting and aggregating issues
    const alerts = await alertEngine.getRecentAlerts();

    return ok(alerts);
  } catch (error: any) {
    console.error('GET /alerts Error:', error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
