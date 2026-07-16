import { MetricsService, metricsService as defaultMetricsService } from '../platform/metrics.service';

export class AnalyticsService {
  constructor(private readonly metrics: MetricsService = defaultMetricsService) {}

  async getGlobalAnalytics(timeframe: string = '30d') {
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    const days = daysMap[timeframe] || 30;

    const [requests, failedRequests, latency, bandwidth, expiringKeys, topClients, topApis, topEndpoints, trafficTrends] = await Promise.all([
      this.metrics.getRequestsToday(), // Future: getRequests(timeframe)
      this.metrics.getFailedRequestsToday(),
      this.metrics.getAverageLatencyMs(),
      this.metrics.getBandwidthToday(),
      this.metrics.getExpiringApiKeysCount(),
      this.metrics.getTopClients(),
      this.metrics.getTopApis(),
      this.metrics.getTopEndpoints(),
      this.metrics.getHistoricalTrafficTrends(days)
    ]);

    return {
      trends: {
        traffic: trafficTrends,
        latency: [], 
        errors: []
      },
      summary: {
        totalRequests: requests,
        totalErrors: failedRequests,
        averageLatency: latency,
        bandwidth,
        expiringKeys
      },
      topPerformers: {
        apis: topApis,
        clients: topClients,
        endpoints: topEndpoints
      }
    };
  }
}

export const analyticsService = new AnalyticsService();
