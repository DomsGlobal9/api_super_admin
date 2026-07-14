import { ApiKey, Client } from '@prisma/client';
import { ApiKeyDTO, ApiKeyCreatedDTO } from './apikey.types';

type ApiKeyWithClient = ApiKey & { 
  client?: (Client & { subscriptions?: any[] }) | null;
  allowedModules?: any[];
  allowedMicroservices?: any[];
};

export class ApiKeyMapper {
  static toDTO(apiKey: ApiKeyWithClient): ApiKeyDTO {
    return {
      id: apiKey.id,
      clientId: apiKey.clientId,
      clientName: apiKey.client?.companyName,
      name: apiKey.name,
      status: apiKey.status,
      type: apiKey.type,
      permissions: apiKey.permissions,
      allowedDomains: apiKey.allowedDomains,
      requestCount: apiKey.requestCount,
      lastUsedAt: apiKey.lastUsedAt,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
      subscription: apiKey.client?.subscriptions?.[0]?.plan || 'ENTERPRISE',
      modules: apiKey.allowedModules?.map((am: any) => am.module.name) || [],
      apis: apiKey.allowedMicroservices?.map((am: any) => am.microservice.displayName) || [],
      requestsToday: apiKey.requestCount || 0, // Fallback to total requestCount for now
    };
  }

  static toCreatedDTO(apiKey: ApiKeyWithClient, rawKey: string): ApiKeyCreatedDTO {
    return {
      ...this.toDTO(apiKey),
      rawKey,
    };
  }

  static toDTOList(apiKeys: ApiKeyWithClient[]): ApiKeyDTO[] {
    return apiKeys.map((k) => this.toDTO(k));
  }
}
