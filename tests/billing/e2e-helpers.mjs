/**
 * Shared helpers for the catalog billing end-to-end scripts. LOCAL ONLY: every
 * address must be localhost, and the scripts refuse to run otherwise.
 */
import crypto from 'node:crypto';
import pg from 'pg';
import bcrypt from 'bcryptjs';

export const DB = process.env.BILLING_TEST_DATABASE_URL;
export const GW = process.env.BILLING_TEST_GATEWAY || 'http://127.0.0.1:3999';
export const SVC = process.env.BILLING_TEST_SERVICE || 'http://127.0.0.1:4995';
export const SVC_KEY = process.env.BILLING_TEST_SERVICE_KEY;

for (const [name, url] of [['BILLING_TEST_DATABASE_URL', DB], ['BILLING_TEST_GATEWAY', GW], ['BILLING_TEST_SERVICE', SVC]]) {
  if (!url || !['localhost', '127.0.0.1', '::1'].includes(new URL(url).hostname)) {
    console.error(`${name} must point at localhost. Refusing to run.`);
    process.exit(2);
  }
}
if (!SVC_KEY) { console.error('Set BILLING_TEST_SERVICE_KEY.'); process.exit(2); }

export const COUNTER = `${new URL(SVC).protocol}//${new URL(SVC).hostname}:${Number(new URL(SVC).port) + 1}`;
export const pool = new pg.Pool({ connectionString: DB });
export const q = (text, values) => pool.query(text, values);
export const uuid = () => crypto.randomUUID();
export const RUN = crypto.randomBytes(3).toString('hex');
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

let passed = 0;
const failures = [];
export const check = (name, ok, detail) => {
  if (ok) passed++; else failures.push(name);
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? '  ' + detail : ''}`);
};
export const eq = (name, actual, expected) => {
  const a = JSON.stringify(actual); const e = JSON.stringify(expected);
  check(name, a === e, a === e ? '' : `\n      got      ${a}\n      expected ${e}`);
};
export const section = (t) => console.log(`\n${t}`);
export async function finish() {
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) console.log('FAILED:\n  - ' + failures.join('\n  - '));
  await pool.end();
  process.exit(failures.length ? 1 : 0);
}

/** The catalog service as the gateway knows it (slug "cat"), pointed at `target`. */
export async function catalogService(target = SVC) {
  let ms = (await q(`SELECT id FROM super_admin."Microservice" WHERE slug = 'cat'`)).rows[0];
  if (!ms) {
    ms = { id: uuid() };
    await q(`INSERT INTO super_admin."Microservice" (id, slug, "displayName", "updatedAt") VALUES ($1, 'cat', 'Catalog (local test)', now())`, [ms.id]);
  }
  await q(`INSERT INTO super_admin."MicroserviceEnvironment" (id, "microserviceId", environment, "targetUrl", "internalSecret", "timeoutMs", "maxPayloadSize", "updatedAt")
           VALUES ($1, $2, 'PRODUCTION', $3, $4, 90000, 52428800, now())
           ON CONFLICT ("microserviceId", environment) DO UPDATE SET "targetUrl" = EXCLUDED."targetUrl", "internalSecret" = EXCLUDED."internalSecret", status = 'ACTIVE'`,
  [uuid(), ms.id, target, SVC_KEY]);
  return ms.id;
}

/** A client with an API key and access to the catalog service. */
export async function makeClient(name, { plan = null } = {}) {
  const msId = await catalogService();
  const id = uuid();
  const rawKey = `sk_test_${crypto.randomBytes(18).toString('hex')}`;
  const keyId = uuid();
  await q(`INSERT INTO super_admin."Client" (id, "companyName", email, "contactName", "updatedAt") VALUES ($1, $2, $3, 'Test Contact', now())`,
    [id, name, `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${RUN}-${crypto.randomBytes(2).toString('hex')}@example.test`]);
  await q(`INSERT INTO super_admin."ApiKey" (id, "clientId", name, "keyHash", permissions, "allowedDomains", "updatedAt") VALUES ($1, $2, 'test', $3, '{}', '{}', now())`,
    [keyId, id, sha256(rawKey)]);
  await q(`INSERT INTO super_admin."ClientAccess" (id, "clientId", "microserviceId", "updatedAt") VALUES ($1, $2, $3, now())`, [uuid(), id, msId]);
  if (plan) await q(`INSERT INTO super_admin."Subscription" (id, "clientId", plan, "updatedAt") VALUES ($1, $2, $3, now())`, [uuid(), id, plan]);
  return { id, rawKey, keyId, name };
}

/** A console admin for this run only; returns the session cookie. */
export async function signInAdmin() {
  const email = `billing-admin-${RUN}-${crypto.randomBytes(2).toString('hex')}@example.test`;
  const password = crypto.randomBytes(16).toString('hex');
  await q(`INSERT INTO super_admin."AdminUser" (id, email, name, "passwordHash", "updatedAt") VALUES ($1, $2, 'Billing Test Admin', $3, now())`,
    [uuid(), email, await bcrypt.hash(password, 8)]);
  const jar = new Map();
  const keep = (res) => (res.headers.getSetCookie?.() || []).forEach((c) => { const [kv] = c.split(';'); const i = kv.indexOf('='); jar.set(kv.slice(0, i), kv.slice(i + 1)); });
  const csrfRes = await fetch(`${GW}/api/auth/csrf`);
  keep(csrfRes);
  const { csrfToken } = await csrfRes.json();
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  const res = await fetch(`${GW}/api/auth/callback/credentials`, {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookie() },
    body: new URLSearchParams({ csrfToken, email, password, json: 'true' }),
  });
  keep(res);
  if (![...jar.keys()].some((k) => k.includes('session-token'))) throw new Error(`sign-in failed (${res.status})`);
  return { cookie: cookie(), jar };
}

export function adminClient(cookie) {
  return async (method, path, body) => {
    const res = await fetch(`${GW}/api/admin/v1${path}`, {
      method, headers: { cookie, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
    });
    const type = res.headers.get('content-type') || '';
    return { status: res.status, type, body: type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer()) };
  };
}

export async function generate(client, body, extraHeaders = {}) {
  const res = await fetch(`${GW}/api/gateway/cat/api/v1/draping/generate-catalog/women`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': client.rawKey, ...extraHeaders },
    body: JSON.stringify({ clientId: `shop-${RUN}-${crypto.randomBytes(3).toString('hex')}`, modelId: 'saree1', category: 'SAREE', ...body }),
  });
  const text = await res.text();
  const events = text.split('\n').filter((l) => l.startsWith('data: ')).map((l) => JSON.parse(l.slice(6)));
  let json = null;
  if (!events.length) { try { json = JSON.parse(text); } catch { /* not json */ } }
  return { status: res.status, events, json, done: events.at(-1)?.type === 'COMPLETE' };
}

export async function usage(client, query = '') {
  const res = await fetch(`${GW}/api/v1/usage${query}`, { headers: client ? { 'x-api-key': client.rawKey } : {} });
  let body = null; try { body = await res.json(); } catch { /* not json */ }
  return { status: res.status, body };
}

export const stubGenerations = async () => (await (await fetch(COUNTER)).json()).generations;
export const rowsFor = async (clientId) =>
  (await q(`SELECT kind, colour_name, request_key, delivered_at FROM se_catalog.billable_runs WHERE client_id = $1 ORDER BY delivered_at, id`, [clientId])).rows;

/** Record delivered runs directly, as the catalog service would have (for past months and big months). */
export async function insertRuns(clientId, runs) {
  for (const r of runs) {
    await q(`INSERT INTO se_catalog.billable_runs (id, client_id, kind, request_key, colour_name, colour_hex, garment_ref, views, delivered_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 4, $8)`,
    [uuid(), clientId, r.kind, `req:${uuid()}`, r.colourName || null, r.colourHex || null, r.garmentRef || null, r.at]);
  }
}

// India-time month helpers (same rule as the code under test).
export const IST = 330 * 60 * 1000;
export const periodOf = (d) => { const x = new Date(d.getTime() + IST); return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}`; };
export const prevPeriod = (p) => { const [y, m] = p.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; };
export const monthStart = (p) => { const [y, m] = p.split('-').map(Number); return new Date(Date.UTC(y, m - 1, 1) - IST); };
/** The India-time calendar date of an instant, as YYYY-MM-DD. */
export const istDate = (d) => new Date(d.getTime() + IST).toISOString().slice(0, 10);
