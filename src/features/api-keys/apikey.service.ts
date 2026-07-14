import { ApiKeyRepository, apiKeyRepository as defaultApiKeyRepository } from './apikey.repository';
import { CreateApiKeyDTO, UpdateApiKeyDTO, ApiKeyQueryDTO } from './apikey.schema';
import { NotFoundError } from '@/lib/errors/errors';
import { ApiKeyMapper } from './apikey.mapper';
import crypto from 'crypto';

export class ApiKeyService {
  constructor(private readonly repo: ApiKeyRepository = defaultApiKeyRepository) {}

  private generateKey() {
    const rawKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    return { rawKey, keyHash };
  }

  async getApiKeys(query: ApiKeyQueryDTO) {
    const result = await this.repo.findMany(query);
    return {
      total: result.total,
      apiKeys: ApiKeyMapper.toDTOList(result.apiKeys),
    };
  }

  async getApiKeyById(id: string) {
    const apiKey = await this.repo.findById(id);
    if (!apiKey) {
      throw new NotFoundError('API Key not found');
    }
    return ApiKeyMapper.toDTO(apiKey);
  }

  async createApiKey(data: CreateApiKeyDTO, adminUserId: string) {
    const { rawKey, keyHash } = this.generateKey();
    const created = await this.repo.create({ ...data, keyHash }, adminUserId);
    return ApiKeyMapper.toCreatedDTO(created, rawKey);
  }

  async updateApiKey(id: string, data: UpdateApiKeyDTO, adminUserId: string) {
    await this.getApiKeyById(id); // Ensure exists
    const updated = await this.repo.update(id, data, adminUserId);
    return ApiKeyMapper.toDTO(updated);
  }

  async deleteApiKey(id: string, adminUserId: string) {
    await this.getApiKeyById(id);
    await this.repo.softDelete(id, adminUserId);
    return true;
  }

  async rotateApiKey(id: string, adminUserId: string) {
    await this.getApiKeyById(id);
    const { rawKey, keyHash } = this.generateKey();
    const rotated = await this.repo.rotate(id, keyHash, adminUserId);
    return ApiKeyMapper.toCreatedDTO(rotated, rawKey);
  }

  async revokeApiKey(id: string, adminUserId: string) {
    await this.getApiKeyById(id);
    const revoked = await this.repo.update(id, { status: 'REVOKED' }, adminUserId);
    return ApiKeyMapper.toDTO(revoked);
  }
}

export const apiKeyService = new ApiKeyService();
