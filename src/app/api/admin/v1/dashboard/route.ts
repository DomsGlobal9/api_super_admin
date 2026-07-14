import { NextRequest } from 'next/server';
import { dashboardService } from '@/features/dashboard/dashboard.service';
import { ok, serverError, unauthorized } from '@/lib/api/response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const overview = await dashboardService.getDashboardOverview();
    return ok(overview);
  } catch (error: any) {
    console.error('GET /dashboard Error:', error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
