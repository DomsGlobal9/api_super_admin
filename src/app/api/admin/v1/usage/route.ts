import { NextRequest } from 'next/server';
import { metricsService } from '@/features/platform/metrics.service';
import { ok, serverError, badRequest, unauthorized } from '@/lib/api/response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { z } from 'zod';

const UsageQuerySchema = z.object({
  timeframe: z.enum(['today', '7d', '30d', 'custom']).optional().default('today'),
  clientId: z.string().uuid().optional(),
  apiId: z.string().uuid().optional(),
  moduleId: z.string().uuid().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const url = new URL(req.url);
    const queryParams = {
      timeframe: url.searchParams.get('timeframe') || undefined,
      clientId: url.searchParams.get('clientId') || undefined,
      apiId: url.searchParams.get('apiId') || undefined,
      moduleId: url.searchParams.get('moduleId') || undefined,
    };

    const parsedQuery = UsageQuerySchema.safeParse(queryParams);
    if (!parsedQuery.success) {
      return badRequest('VALIDATION_ERROR', 'Invalid query parameters', parsedQuery.error.format());
    }

    // In the future, pass parsedQuery.data down to MetricsService for filtering
    const [requests, failedRequests, latency] = await Promise.all([
      metricsService.getRequestsToday(), // Should adapt to timeframe
      metricsService.getFailedRequestsToday(),
      metricsService.getAverageLatencyMs()
    ]);

    const successRate = requests > 0 ? ((requests - failedRequests) / requests) * 100 : 100;

    return ok({
      requests,
      bandwidthBytes: 0, // Placeholder
      latency,
      successRate: parseFloat(successRate.toFixed(2)),
      errors: failedRequests,
      topClients: [], // Placeholder
      topApis: [], // Placeholder
      topEndpoints: [], // Placeholder
      peakHour: null // Placeholder
    });
  } catch (error: any) {
    console.error('GET /usage Error:', error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
