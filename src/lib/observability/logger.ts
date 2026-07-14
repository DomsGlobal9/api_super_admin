import { prisma } from '../prisma';
import { HttpMethod, Environment, LogStatus } from '@prisma/client';
import { maskSecrets } from '../security/secrets';

export interface LogEvent {
  requestId: string;
  clientId?: string | null;
  apiKeyId?: string;
  microserviceId?: string | null;
  environment: Environment;
  gatewayInstance?: string;
  endpoint: string;
  method: HttpMethod;
  statusCode: number;
  totalLatencyMs: number;
  gatewayLatencyMs: number;
  backendLatencyMs?: number;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  headers?: any;
  queryParams?: any;
  requestSize?: number;
  responseSize?: number;
}

export interface ILogger {
  logStarted(event: Partial<LogEvent> & { requestId: string; endpoint: string; method: HttpMethod; environment: Environment }): Promise<void>;
  logCompleted(event: LogEvent): Promise<void>;
  logFailed(event: LogEvent): Promise<void>;
  logCancelled(event: LogEvent): Promise<void>;
}

// Initial implementation: writes directly to PostgreSQL.
// In the future, this can be swapped out to push to a Redis Stream or Kafka queue.
export class PostgresLogger implements ILogger {
  async logStarted(event: Partial<LogEvent> & { requestId: string; endpoint: string; method: HttpMethod; environment: Environment }): Promise<void> {
    const isUnknownClient = event.clientId === 'unknown' || !event.clientId;
    const isUnknownMicroservice = event.microserviceId === 'unknown' || !event.microserviceId;

    try {
      await prisma.requestLog.create({
        data: {
          requestId: event.requestId,
          clientId: isUnknownClient ? null : event.clientId,
          microserviceId: isUnknownMicroservice ? null : event.microserviceId,
          environment: event.environment,
          endpoint: event.endpoint,
          method: event.method,
          status: 'STARTED',
          headers: event.headers ? maskSecrets(event.headers) : undefined,
          queryParams: event.queryParams ? maskSecrets(event.queryParams) : undefined,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
        }
      });
    } catch (err) {
      console.error(`[Logger] Failed to write STARTED for ${event.requestId}:`, err);
    }
  }

  async logCompleted(event: LogEvent): Promise<void> {
    try {
      const isUnknownClient = event.clientId === 'unknown' || !event.clientId;
      const isUnknownMicroservice = event.microserviceId === 'unknown' || !event.microserviceId;

      console.log(`[Gateway] RequestLog persisted for ${event.requestId}`);
      
      // Increment API Key usage
      if (event.apiKeyId) {
        await prisma.apiKey.update({
          where: { id: event.apiKeyId },
          data: { 
            requestCount: { increment: 1 },
            lastUsedAt: new Date()
          }
        });
        console.log(`[Gateway] ApiKey.requestCount updated for key: ${event.apiKeyId}`);
      }
      
      // We don't await this to prevent blocking the HTTP response, 
      // but in a serverless environment, Next.js might kill the process before it finishes.
      // Next.js waitUntil() should be used in the route handler.
      await prisma.requestLog.upsert({
        where: { requestId: event.requestId },
        update: {
          status: 'COMPLETED',
          statusCode: event.statusCode,
          totalLatencyMs: event.totalLatencyMs,
          gatewayLatencyMs: event.gatewayLatencyMs,
          backendLatencyMs: event.backendLatencyMs,
          requestSize: event.requestSize,
          responseSize: event.responseSize,
        },
        create: {
          requestId: event.requestId,
          clientId: isUnknownClient ? null : event.clientId,
          microserviceId: isUnknownMicroservice ? null : event.microserviceId,
          environment: event.environment,
          gatewayInstance: event.gatewayInstance,
          endpoint: event.endpoint,
          method: event.method,
          status: 'COMPLETED',
          statusCode: event.statusCode,
          totalLatencyMs: event.totalLatencyMs,
          gatewayLatencyMs: event.gatewayLatencyMs,
          backendLatencyMs: event.backendLatencyMs,
          errorMessage: event.errorMessage,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          headers: event.headers ? maskSecrets(event.headers) : undefined,
          queryParams: event.queryParams ? maskSecrets(event.queryParams) : undefined,
          requestSize: event.requestSize,
          responseSize: event.responseSize,
        },
      });
    } catch (error) {
      console.error(`[Logger] Failed to write RequestLog for ${event.requestId}:`, error);
    }
  }
  async logFailed(event: LogEvent): Promise<void> {
    try {
      const isUnknownClient = event.clientId === 'unknown' || !event.clientId;
      const isUnknownMicroservice = event.microserviceId === 'unknown' || !event.microserviceId;

      
      await prisma.requestLog.upsert({
        where: { requestId: event.requestId },
        update: {
          status: 'FAILED',
          statusCode: event.statusCode,
          totalLatencyMs: event.totalLatencyMs,
          gatewayLatencyMs: event.gatewayLatencyMs,
          errorMessage: event.errorMessage,
        },
        create: {
          requestId: event.requestId,
          clientId: isUnknownClient ? null : event.clientId,
          microserviceId: isUnknownMicroservice ? null : event.microserviceId,
          environment: event.environment,
          endpoint: event.endpoint,
          method: event.method,
          status: 'FAILED',
          statusCode: event.statusCode,
          totalLatencyMs: event.totalLatencyMs,
          gatewayLatencyMs: event.gatewayLatencyMs,
          errorMessage: event.errorMessage,
        }
      });
    } catch (error) {
      console.error(`[Logger] Failed to write FAILED for ${event.requestId}:`, error);
    }
  }

  async logCancelled(event: LogEvent): Promise<void> {
    try {
      const isUnknownClient = event.clientId === 'unknown' || !event.clientId;
      const isUnknownMicroservice = event.microserviceId === 'unknown' || !event.microserviceId;

      
      await prisma.requestLog.upsert({
        where: { requestId: event.requestId },
        update: {
          status: 'CANCELLED',
          statusCode: 499,
          totalLatencyMs: event.totalLatencyMs,
          gatewayLatencyMs: event.gatewayLatencyMs,
          errorMessage: 'Client disconnected prematurely',
        },
        create: {
          requestId: event.requestId,
          clientId: isUnknownClient ? null : event.clientId,
          microserviceId: isUnknownMicroservice ? null : event.microserviceId,
          environment: event.environment,
          endpoint: event.endpoint,
          method: event.method,
          status: 'CANCELLED',
          statusCode: 499,
          totalLatencyMs: event.totalLatencyMs,
          gatewayLatencyMs: event.gatewayLatencyMs,
          errorMessage: 'Client disconnected prematurely',
        }
      });
    } catch (error) {
      console.error(`[Logger] Failed to write CANCELLED for ${event.requestId}:`, error);
    }
  }
}

export const logger = new PostgresLogger();
