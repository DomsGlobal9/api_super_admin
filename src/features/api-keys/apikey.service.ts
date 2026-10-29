import { ApiKeyRepository, apiKeyRepository as defaultApiKeyRepository } from './apikey.repository';
import { CreateApiKeyDTO, UpdateApiKeyDTO, ApiKeyQueryDTO } from './apikey.schema';
import { NotFoundError } from '@/lib/errors/errors';
import { ApiKeyMapper } from './apikey.mapper';
import { CacheInvalidator } from '@/lib/cache/invalidator';
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
    const created = await this.repo.create({ ...data, keyHash, rawKey }, adminUserId);
    return ApiKeyMapper.toCreatedDTO(created, rawKey);
  }

  /** The stored row (with its keyHash), or a 404. */
  private async requireApiKey(id: string) {
    const apiKey = await this.repo.findById(id);
    if (!apiKey) {
      throw new NotFoundError('API Key not found');
    }
    return apiKey;
  }

  // Every change below must reach the gateway now: it caches a validated key for
  // GATEWAY_CACHE_TTL_SEC and, on a hit, trusts that copy. The cache is cleared
  // AFTER the write, so nothing re-caches the old row in between.

  async updateApiKey(id: string, data: UpdateApiKeyDTO, adminUserId: string) {
    await this.requireApiKey(id);
    const updated = await this.repo.update(id, data, adminUserId);
    await CacheInvalidator.invalidateApiKey(updated.keyHash);
    return ApiKeyMapper.toDTO(updated);
  }

  async deleteApiKey(id: string, adminUserId: string) {
    const existing = await this.requireApiKey(id);
    await this.repo.softDelete(id, adminUserId);
    await CacheInvalidator.invalidateApiKey(existing.keyHash);
    return true;
  }

  async rotateApiKey(id: string, adminUserId: string) {
    const existing = await this.requireApiKey(id);
    const { rawKey, keyHash } = this.generateKey();
    const rotated = await this.repo.rotate(id, keyHash, adminUserId);
    // The OLD secret is the one that must stop working.
    await CacheInvalidator.invalidateApiKey(existing.keyHash);
    return ApiKeyMapper.toCreatedDTO(rotated, rawKey);
  }

  async revokeApiKey(id: string, adminUserId: string) {
    await this.requireApiKey(id);
    const revoked = await this.repo.update(id, { status: 'REVOKED' }, adminUserId);
    await CacheInvalidator.invalidateApiKey(revoked.keyHash);
    return ApiKeyMapper.toDTO(revoked);
  }
}

export const apiKeyService = new ApiKeyService();
