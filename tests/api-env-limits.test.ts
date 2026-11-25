/**
 * An API's request size limit and timeout can be changed in the console, and a saved
 * change reaches the gateway on the next call.
 *
 * The gateway has always read both from the API's PRODUCTION environment
 * (maxPayloadSize before forwarding, timeoutMs while waiting for the first answer), but the
 * console had no field for them, so every new API kept the defaults: 1 MB and 30 s. A new
 * `studio` API refused every Design Studio request (pictures make them 2-20 MB) with 413.
 *
 * Saving an API also never cleared the gateway's cached route (route:PRODUCTION:<slug>), so
 * even a changed target URL or master key took up to GATEWAY_CACHE_TTL_SEC to apply.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { redis } = vi.hoisted(() => ({ redis: { del: vi.fn(async () => 1) } }));
vi.mock('../src/lib/redis', () => ({ redis }));
vi.mock('../src/lib/prisma', () => ({ prisma: {} }));

import { UpdateApiSchema, MAX_PAYLOAD_BYTES, MAX_TIMEOUT_MS } from '../src/features/apis/api.schema';
import { ApiService } from '../src/features/apis/api.service';
import { ApiRepository } from '../src/features/apis/api.repository';
import type { UpdateApiDTO } from '../src/features/apis/api.schema';
import type { PrismaClient } from '@prisma/client';

const MB = 1024 * 1024;

beforeEach(() => vi.clearAllMocks());

describe('UpdateApiSchema - size limit and timeout', () => {
  it('accepts 50 MB and 5 minutes (what Design Studio needs)', () => {
    const r = UpdateApiSchema.safeParse({ maxPayloadSize: 50 * MB, timeoutMs: 300000 });
    expect(r.success).toBe(true);
    expect(r.success && r.data).toMatchObject({ maxPayloadSize: 50 * MB, timeoutMs: 300000 });
  });
  it('leaves both out when they are not sent, so older callers change nothing', () => {
    const r = UpdateApiSchema.safeParse({ displayName: 'Design Studio' });
    expect(r.success && r.data).toEqual({ displayName: 'Design Studio' });
  });
  it('refuses a size over 100 MB or under 1 KB, and a timeout over 5 minutes or under 1 second', () => {
    expect(UpdateApiSchema.safeParse({ maxPayloadSize: MAX_PAYLOAD_BYTES + 1 }).success).toBe(false);
    expect(UpdateApiSchema.safeParse({ maxPayloadSize: 1023 }).success).toBe(false);
    expect(UpdateApiSchema.safeParse({ timeoutMs: MAX_TIMEOUT_MS + 1 }).success).toBe(false);
    expect(UpdateApiSchema.safeParse({ timeoutMs: 999 }).success).toBe(false);
  });
  it('refuses text, fractions of a byte and negative numbers', () => {
    expect(UpdateApiSchema.safeParse({ maxPayloadSize: '50' }).success).toBe(false);
    expect(UpdateApiSchema.safeParse({ maxPayloadSize: 1024.5 }).success).toBe(false);
    expect(UpdateApiSchema.safeParse({ timeoutMs: -5000 }).success).toBe(false);
  });
});

describe('ApiRepository.update - writes both to the PRODUCTION environment', () => {
  const makeRepo = (hasProduction = true) => {
    type UpdateArgs = { data: Record<string, unknown> & { environments?: { updateMany?: unknown; create?: unknown } } };
    const update = vi.fn(async (args: UpdateArgs) => ({ id: 'a1', slug: 'studio', environments: [], ...args.data }));
    const findUnique = vi.fn(async () => (hasProduction ? { id: 'env1' } : null));
    const repo = new ApiRepository({ microservice: { update }, microserviceEnvironment: { findUnique } } as unknown as PrismaClient);
    return { repo, update, findUnique };
  };
  // Found 25 Nov 2026: cat, studio and discovery had lost their PRODUCTION rows, and Edit API only
  // updated an existing row - so the console could not put them back.
  it('creates the PRODUCTION environment when it is missing, from the target URL and master key', async () => {
    const { repo, update, findUnique } = makeRepo(false);
    await repo.update('a1', { targetUrl: 'https://catalog-tryon-microservice.onrender.com', internalSecret: 'k', maxPayloadSize: 50 * MB }, 'admin1');
    expect(findUnique).toHaveBeenCalledWith({ where: { microserviceId_environment: { microserviceId: 'a1', environment: 'PRODUCTION' } }, select: { id: true } });
    expect(update.mock.calls[0][0].data.environments).toEqual({
      create: { environment: 'PRODUCTION', targetUrl: 'https://catalog-tryon-microservice.onrender.com', internalSecret: 'k', maxPayloadSize: 50 * MB },
    });
  });
  it('refuses, saying what to do, when the row is missing and no target URL was sent (Settings tab limits alone)', async () => {
    const { repo, update } = makeRepo(false);
    await expect(repo.update('a1', { timeoutMs: 300000 }, 'admin1')).rejects.toMatchObject({ statusCode: 409, message: expect.stringMatching(/no production settings yet.*Target Server URL/) });
    expect(update).not.toHaveBeenCalled();
  });
  it('saves the size limit and the timeout next to the target URL', async () => {
    const { repo, update } = makeRepo();
    await repo.update('a1', { maxPayloadSize: 50 * MB, timeoutMs: 300000, targetUrl: 'https://svc.example.com' }, 'admin1');
    const data = update.mock.calls[0][0].data;
    expect(data.environments?.updateMany).toEqual({
      where: { environment: 'PRODUCTION' },
      data: { targetUrl: 'https://svc.example.com', maxPayloadSize: 50 * MB, timeoutMs: 300000 },
    });
    // Neither lands on the API row itself, which has no such columns.
    expect(data).not.toHaveProperty('maxPayloadSize');
    expect(data).not.toHaveProperty('timeoutMs');
  });
  it('does not touch the environment when only the name changes', async () => {
    const { repo, update } = makeRepo();
    await repo.update('a1', { displayName: 'Design Studio' }, 'admin1');
    expect(update.mock.calls[0][0].data).not.toHaveProperty('environments');
  });
});

describe('ApiService.updateApi - the gateway sees the change on the next call', () => {
  const makeService = (before: { slug: string }, after: { slug: string }) => {
    const repo = {
      findById: vi.fn(async () => ({ id: 'a1', ...before })),
      findMany: vi.fn(async () => ({ total: 0, apis: [] })),
      update: vi.fn(async () => ({ id: 'a1', ...after })),
    };
    return { service: new ApiService(repo as unknown as ApiRepository), repo };
  };
  it('drops the cached route of the API that was saved', async () => {
    const { service } = makeService({ slug: 'studio' }, { slug: 'studio' });
    await service.updateApi('a1', { maxPayloadSize: 50 * MB } as UpdateApiDTO, 'admin1');
    expect(redis.del).toHaveBeenCalledTimes(1);
    expect(redis.del).toHaveBeenCalledWith('route:PRODUCTION:studio');
  });
  it('drops both the old and the new slug when the slug was renamed', async () => {
    const { service } = makeService({ slug: 'studio' }, { slug: 'design-studio' });
    await service.updateApi('a1', { slug: 'design-studio' } as UpdateApiDTO, 'admin1');
    expect((redis.del.mock.calls as unknown as string[][]).map((c) => c[0]).sort()).toEqual(['route:PRODUCTION:design-studio', 'route:PRODUCTION:studio']);
  });
  it('still saves when Redis is down (the cache then simply expires on its own)', async () => {
    redis.del.mockRejectedValueOnce(new Error('redis down'));
    const { service, repo } = makeService({ slug: 'studio' }, { slug: 'studio' });
    const saved = await service.updateApi('a1', { timeoutMs: 300000 } as UpdateApiDTO, 'admin1');
    expect(repo.update).toHaveBeenCalled();
    expect(saved.slug).toBe('studio');
  });
});
