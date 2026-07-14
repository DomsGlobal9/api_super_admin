import { MetricsService, metricsService as defaultMetricsService } from '../platform/metrics.service';

export class AnalyticsService {
  constructor(private readonly metrics: MetricsService = defaultMetricsService) {}

  async getGlobalAnalytics(timeframe: string) {
    // In the future, pass timeframe down to metricsService to fetch historical data
    // Analytics orchestrates metrics to build historical trend lines, not just point-in-time
    const [requests, failedRequests, latency, bandwidth, expiringKeys, topClients, topApis, topEndpoints] = await Promise.all([
      this.metrics.getRequestsToday(), // Future: getRequests(timeframe)
      this.metrics.getFailedRequestsToday(),
      this.metrics.getAverageLatencyMs(),
      this.metrics.getBandwidthToday(),
      this.metrics.getExpiringApiKeysCount(),
      this.metrics.getTopClients(),
      this.metrics.getTopApis(),
      this.metrics.getTopEndpoints()
    ]);

    return {
      trends: {
        traffic: [], // Array of { date, value } for charting
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
