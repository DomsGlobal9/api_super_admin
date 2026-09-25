/**
 * The gateway must tell downstream WHO is calling, and must not let the caller say it for them.
 *
 * Downstream services key the tenant and the spend budget off x-gateway-client-id. The catalog
 * service treats it as trusted because its own check runs after the internal service key -- on the
 * reasoning that "only a caller holding the internal service key can set it". That reasoning held
 * for every caller except this gateway: sanitizeHeaders does not strip the header, so a caller's
 * own copy rode through, and we then attached the internal service key to the very same request.
 *
 * These tests pin the two halves of the fix: the header is always present with the tenant WE
 * resolved, and anything the caller sent under that name is overwritten rather than forwarded.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { proxyRequest } from '../src/lib/gateway/proxy';

const ENVIRONMENT: any = { internalSecret: 'INTERNAL-SERVICE-KEY', timeoutMs: 5000 };

/** Stand in for the downstream service and keep whatever headers it was sent. */
function captureDownstream() {
  const seen: { headers: Headers | null } = { headers: null };
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
    seen.headers = init.headers as Headers;
    return new Response('ok', { status: 200 });
  }));
  return seen;
}

const call = (headers: Record<string, string>, clientId: string) =>
  proxyRequest({
    req: new Request('https://gw.test/api/gateway/cat/api/v1/draping/generate-catalog', {
      method: 'POST', headers, body: '{}'
    }) as any,
    targetUrl: 'https://downstream.test',
    path: '/api/v1/draping/generate-catalog',
    requestId: 'req-1',
    environment: ENVIRONMENT,
    abortSignal: new AbortController().signal,
    clientId
  });

afterEach(() => vi.unstubAllGlobals());

describe('x-gateway-client-id', () => {
  it('is sent downstream with the tenant the gateway resolved', async () => {
    const seen = captureDownstream();
    await call({ 'content-type': 'application/json' }, 'sphl');
    expect(seen.headers?.get('x-gateway-client-id')).toBe('sphl');
  });

  it('overwrites a value the caller tried to send, so one tenant cannot be taken for another', async () => {
    const seen = captureDownstream();
    // A caller with a valid key of their own, claiming to be somebody else.
    await call({ 'content-type': 'application/json', 'x-gateway-client-id': 'some-other-tenant' }, 'sphl');
    expect(seen.headers?.get('x-gateway-client-id')).toBe('sphl');
    expect(seen.headers?.get('x-gateway-client-id')).not.toBe('some-other-tenant');
  });

  it('still carries the internal service key, so the header is read as coming from us', async () => {
    const seen = captureDownstream();
    await call({}, 'demo-client');
    expect(seen.headers?.get('x-api-key')).toBe('INTERNAL-SERVICE-KEY');
    expect(seen.headers?.get('x-gateway-client-id')).toBe('demo-client');
  });

  it('refuses rather than forwarding an unattributed request', async () => {
    captureDownstream();
    // 'unknown' is the route's initial value. It is always overwritten before proxying, so this
    // is a guard rather than a live path -- but downstream it would become a shared budget
    // bucket for every call nobody could account for, which is worth never being possible.
    await expect(call({}, 'unknown')).rejects.toMatchObject({ statusCode: 401 });
    await expect(call({}, '')).rejects.toMatchObject({ statusCode: 401 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('is stripped by the sanitiser too, so the protection does not rest on one line', async () => {
    // Belt and braces: even if some future call path forgets to set it, a caller's own value
    // must not survive sanitizeHeaders and reach a backend.
    const { sanitizeHeaders } = await import('../src/lib/security/headers');
    const cleaned = sanitizeHeaders(new Headers({ 'x-gateway-client-id': 'some-other-tenant' }));
    expect(cleaned.get('x-gateway-client-id')).toBeNull();
  });

  it('matches the id shape the catalog service accepts', async () => {
    // identity.js: /^[A-Za-z0-9._:-]{1,128}$/ -- anything outside it is ignored as malformed,
    // which would silently drop us back to per-body-id budgets.
    const seen = captureDownstream();
    await call({}, 'verify-suites-tenant');
    const sent = seen.headers?.get('x-gateway-client-id') ?? '';
    expect(sent).toMatch(/^[A-Za-z0-9._:-]{1,128}$/);
  });
});
