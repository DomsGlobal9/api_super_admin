/**
 * Suspending a client in the console must actually happen, and must reach the gateway now.
 *
 * Two things stood between an admin and a suspension:
 *
 * 1. The confirm box compared what was typed with the stored company name character for
 *    character. A name saved as "sirimalle " (trailing space) could never be confirmed by
 *    typing "sirimalle", so the button stayed disabled and nothing was sent.
 *
 * 2. The gateway caches each validated API key together with its client row for
 *    GATEWAY_CACHE_TTL_SEC and, on a cache hit, never looks at the client again. Saving
 *    status = SUSPENDED did not touch that cache, so the client kept calling for up to five
 *    minutes. The same held for a revoked, rotated or deleted key.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { redis, prisma } = vi.hoisted(() => ({
  redis: { del: vi.fn(async () => 1), keys: vi.fn(async (): Promise<string[]> => []) },
  prisma: { apiKey: { findMany: vi.fn(async () => [{ keyHash: 'h1' }, { keyHash: 'h2' }]) } },
}));
vi.mock('../src/lib/redis', () => ({ redis }));
vi.mock('../src/lib/prisma', () => ({ prisma }));

import { confirmTextMatches } from '../src/lib/utils';
import { CacheInvalidator } from '../src/lib/cache/invalidator';
import { ClientService } from '../src/features/clients/client.service';
import type { ClientRepository } from '../src/features/clients/client.repository';
import type { UpdateClientDTO } from '../src/features/clients/client.schema';
import { ApiKeyService } from '../src/features/api-keys/apikey.service';
import type { ApiKeyRepository } from '../src/features/api-keys/apikey.repository';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('the "type the name to confirm" check', () => {
  it('accepts the name typed without the whitespace the record was saved with', () => {
    expect(confirmTextMatches('sirimalle', 'sirimalle ')).toBe(true);
    expect(confirmTextMatches('  sirimalle  ', 'sirimalle')).toBe(true);
  });
  it('does not care about letter case', () => {
    expect(confirmTextMatches('Sirimalle', 'sirimalle')).toBe(true);
  });
  it('still refuses a different name, an empty box, or a client that has not loaded', () => {
    expect(confirmTextMatches('sirimall', 'sirimalle')).toBe(false);
    expect(confirmTextMatches('sirimalle@t2b', 'sirimalle')).toBe(false);
    expect(confirmTextMatches('', 'sirimalle')).toBe(false);
    expect(confirmTextMatches('', '')).toBe(false);
    expect(confirmTextMatches('x', undefined)).toBe(false);
  });
});

describe('CacheInvalidator.invalidateClientApiKeys', () => {
  it('removes the cached validation of every key the client has', async () => {
    await CacheInvalidator.invalidateClientApiKeys('c1');
    expect(prisma.apiKey.findMany).toHaveBeenCalledWith({ where: { clientId: 'c1' }, select: { keyHash: true } });
    expect(redis.del).toHaveBeenCalledWith('apikey:h1', 'apikey:h2');
  });
  it('does nothing when the client has no keys', async () => {
    prisma.apiKey.findMany.mockResolvedValueOnce([]);
    await CacheInvalidator.invalidateClientApiKeys('c1');
    expect(redis.del).not.toHaveBeenCalled();
  });
});

/** A client repository that records the order of its writes in `log`. */
function fakeClientRepo(log: string[]): ClientRepository {
  const repo = {
    findById: vi.fn(async (id: string) => ({ id, status: 'ACTIVE' })),
    update: vi.fn(async (id: string, data: UpdateClientDTO) => { log.push('update'); return { id, ...data }; }),
    softDelete: vi.fn(async (id: string) => { log.push('softDelete'); return { id, status: 'DELETED' }; }),
    hardDelete: vi.fn(async (id: string) => { log.push('hardDelete'); return { id }; }),
  };
  return repo as unknown as ClientRepository;
}

describe('ClientService and the gateway cache', () => {
  it('suspending a client clears its keys from the cache, after the status is written', async () => {
    const log: string[] = [];
    redis.del.mockImplementation(async () => { log.push('del'); return 1; });
    const updated = await new ClientService(fakeClientRepo(log)).updateClient('c1', { status: 'SUSPENDED' }, 'admin');
    expect(updated.status).toBe('SUSPENDED');
    expect(log).toEqual(['update', 'del']);
    expect(redis.del).toHaveBeenCalledWith('apikey:h1', 'apikey:h2');
  });
  it('reactivating does the same', async () => {
    await new ClientService(fakeClientRepo([])).updateClient('c1', { status: 'ACTIVE' }, 'admin');
    expect(redis.del).toHaveBeenCalledWith('apikey:h1', 'apikey:h2');
  });
  it('a profile edit that leaves the status alone touches no cache', async () => {
    await new ClientService(fakeClientRepo([])).updateClient('c1', { notes: 'hello' }, 'admin');
    expect(redis.del).not.toHaveBeenCalled();
    expect(prisma.apiKey.findMany).not.toHaveBeenCalled();
  });
  it('a soft delete clears the keys after the write', async () => {
    const log: string[] = [];
    redis.del.mockImplementation(async () => { log.push('del'); return 1; });
    await new ClientService(fakeClientRepo(log)).deleteClient('c1', 'admin', false);
    expect(log).toEqual(['softDelete', 'del']);
  });
  it('a hard delete reads the hashes before the rows go and clears them after', async () => {
    const log: string[] = [];
    prisma.apiKey.findMany.mockImplementationOnce(async () => { log.push('findMany'); return [{ keyHash: 'h1' }]; });
    redis.del.mockImplementation(async () => { log.push('del'); return 1; });
    await new ClientService(fakeClientRepo(log)).deleteClient('c1', 'admin', true);
    expect(log).toEqual(['findMany', 'hardDelete', 'del']);
    expect(redis.del).toHaveBeenCalledWith('apikey:h1');
  });
});

/** An API key repository holding one key whose secret hashes to "old-hash". */
function fakeKeyRepo(): ApiKeyRepository {
  const row = {
    id: 'k1', keyHash: 'old-hash', status: 'ACTIVE', permissions: [], allowedDomains: [],
    client: { id: 'c1' }, allowedModules: [], allowedMicroservices: [],
  };
  const repo = {
    findById: vi.fn(async () => row),
    update: vi.fn(async (_id: string, data: Record<string, unknown>) => ({ ...row, ...data })),
    softDelete: vi.fn(async () => ({ ...row, status: 'REVOKED' })),
    rotate: vi.fn(async (_id: string, newKeyHash: string) => ({ ...row, keyHash: newKeyHash })),
  };
  return repo as unknown as ApiKeyRepository;
}

describe('ApiKeyService and the gateway cache', () => {
  it('revoking a key clears it', async () => {
    await new ApiKeyService(fakeKeyRepo()).revokeApiKey('k1', 'admin');
    expect(redis.del).toHaveBeenCalledWith('apikey:old-hash');
  });
  it('deleting a key clears it', async () => {
    await new ApiKeyService(fakeKeyRepo()).deleteApiKey('k1', 'admin');
    expect(redis.del).toHaveBeenCalledWith('apikey:old-hash');
  });
  it('rotating a key clears the OLD secret, which is the one that must stop working', async () => {
    await new ApiKeyService(fakeKeyRepo()).rotateApiKey('k1', 'admin');
    expect(redis.del).toHaveBeenCalledWith('apikey:old-hash');
  });
  it('editing a key (name, permissions, expiry) clears it', async () => {
    await new ApiKeyService(fakeKeyRepo()).updateApiKey('k1', { name: 'renamed' }, 'admin');
    expect(redis.del).toHaveBeenCalledWith('apikey:old-hash');
  });
});
