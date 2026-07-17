export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { analyticsService } from '@/features/analytics/analytics.service';
import { ok, serverError, badRequest, unauthorized } from '@/lib/api/response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { z } from 'zod';

const AnalyticsQuerySchema = z.object({
  timeframe: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const url = new URL(req.url);
    const queryParams = {
      timeframe: url.searchParams.get('timeframe') || undefined,
    };

    const parsedQuery = AnalyticsQuerySchema.safeParse(queryParams);
    if (!parsedQuery.success) {
      return badRequest('VALIDATION_ERROR', 'Invalid query parameters', parsedQuery.error.format());
    }

    const tzOffset = req.headers.get('x-timezone-offset');
    const analytics = await analyticsService.getGlobalAnalytics(
      parsedQuery.data.timeframe,
      tzOffset ? parseInt(tzOffset, 10) : undefined
    );

    return ok(analytics);
  } catch (error: any) {
    console.error('GET /analytics Error:', error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
