import { ApiKeyStatus, ApiKeyType, ApiKeyPermission } from '@prisma/client';

export interface ApiKeyDTO {
  id: string;
  clientId: string;
  clientName?: string;
  name: string;
  // maskedKey: string; // Used when fetching existing keys
  status: ApiKeyStatus;
  type: ApiKeyType;
  permissions: ApiKeyPermission[];
  allowedDomains: string[];
  requestCount: number;
  lastUsedAt: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  subscription?: string;
  modules?: string[];
  apis?: string[];
  requestsToday?: number;
}

export interface ApiKeyCreatedDTO extends ApiKeyDTO {
  rawKey: string; // Only returned exactly once on creation
}
