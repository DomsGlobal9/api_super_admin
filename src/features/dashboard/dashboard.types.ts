export interface DashboardDTO {
  activeClients: number;
  requestsToday: number;
  rpm: number;
  gatewayStatus: string; // e.g. "HEALTHY", "DEGRADED"
  redisStatus: string;
  databaseStatus: string;
  openCircuitBreakers: number;
  topClient: { name: string; count: number } | null;
  topApi: { name: string; count: number } | null;
  failedRequestsToday: number;
  averageLatencyMs: number;
  expiringApiKeysCount: number;
  recentAlerts: any[]; // To be populated later
  totalAllTimeSuccess: number;
  totalAllTimeRequests: number;
}
