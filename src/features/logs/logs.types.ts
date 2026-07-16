export interface RequestLogDTO {
  id: string;
  requestId: string;
  timestamp: Date;
  clientId: string;
  clientName?: string;
  apiId: string;
  apiName?: string;
  apiKeyName?: string;
  endpoint: string;
  method: string;
  status: string;
  statusCode: number | null;
  gatewayLatency: number | null;
  backendLatency: number | null;
  totalLatency: number | null;
  payloadSize: number | null;
  cacheHit: boolean; // Infer or pull from gateway config/headers
  breakerState: string; // Infer or pull from headers
  gatewayInstance: string | null;
}
