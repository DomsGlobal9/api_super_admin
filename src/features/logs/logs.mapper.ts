import { RequestLog, Client, Microservice } from '@prisma/client';
import { RequestLogDTO } from './logs.types';

type RequestLogWithRelations = RequestLog & {
  client?: Client | null;
  microservice?: Microservice | null;
};

export class LogsMapper {
  static toDTO(log: RequestLogWithRelations): RequestLogDTO {
    return {
      id: log.id,
      requestId: log.requestId,
      timestamp: log.timestamp,
      clientId: log.clientId || 'unknown',
      clientName: log.client?.companyName || undefined,
      apiId: log.microserviceId || 'unknown',
      apiName: log.microservice?.displayName || undefined,
      endpoint: log.endpoint,
      method: log.method,
      status: log.status,
      statusCode: log.statusCode,
      gatewayLatency: log.gatewayLatencyMs,
      backendLatency: log.backendLatencyMs,
      totalLatency: log.totalLatencyMs,
      payloadSize: log.requestSize,
      cacheHit: false, // Extract from headers later if tracked
      breakerState: 'CLOSED', // Extract from headers later
      gatewayInstance: log.gatewayInstance,
    };
  }

  static toDTOList(logs: RequestLogWithRelations[]): RequestLogDTO[] {
    return logs.map(this.toDTO);
  }
}
