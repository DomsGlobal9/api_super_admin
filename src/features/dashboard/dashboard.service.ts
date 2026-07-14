import { DashboardDTO } from './dashboard.types';
import { MetricsService, metricsService as defaultMetricsService } from '../platform/metrics.service';
import { HealthService, healthService as defaultHealthService } from '../platform/health.service';
import { AlertEngine, alertEngine as defaultAlertEngine } from '../platform/alert.engine';

export class DashboardService {
  constructor(
    private readonly metrics: MetricsService = defaultMetricsService,
    private readonly health: HealthService = defaultHealthService,
    private readonly alerts: AlertEngine = defaultAlertEngine
  ) {}
  async getDashboardOverview(): Promise<DashboardDTO> {
    const results = await Promise.allSettled([
      this.metrics.getActiveClientsCount(),
      this.metrics.getRequestsToday(),
      this.metrics.getFailedRequestsToday(),
      this.metrics.getExpiringApiKeysCount(),
      this.metrics.getRPM(),
      this.metrics.getAverageLatencyMs(),
      this.health.getGatewayStatus(),
      this.health.getRedisStatus(),
      this.health.getDatabaseStatus(),
      this.health.getCircuitBreakerStatus(),
      this.alerts.getRecentAlerts()
    ]);

    const getValue = <T>(result: PromiseSettledResult<T>, fallback: T): T => {
      if (result.status === 'fulfilled') return result.value;
      console.error('Dashboard dependency failed:', result.reason);
      return fallback;
    };

    const activeClients = getValue(results[0], 0);
    const requestsToday = getValue(results[1], 0);
    const failedRequestsToday = getValue(results[2], 0);
    const expiringApiKeysCount = getValue(results[3], 0);
    const rpm = getValue(results[4], 0);
    const averageLatencyMs = getValue(results[5], 0);
    const gatewayStatus = getValue(results[6], 'DOWN');
    const redisStatus = getValue(results[7], 'DOWN');
    const databaseStatus = getValue(results[8], 'DOWN');
    const circuitBreakers = getValue(results[9], { open: 0, halfOpen: 0 });
    const recentAlerts = getValue(results[10], []);

    return {
      activeClients,
      requestsToday,
      rpm,
      gatewayStatus,
      redisStatus,
      databaseStatus,
      openCircuitBreakers: circuitBreakers.open,
      topClient: null,
      topApi: null,
      failedRequestsToday,
      averageLatencyMs,
      expiringApiKeysCount,
      recentAlerts
    };
  }
}

export const dashboardService = new DashboardService();
