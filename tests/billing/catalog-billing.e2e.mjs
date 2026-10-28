#!/usr/bin/env node
/**
 * Catalog billing, end to end, against LOCAL servers and a LOCAL database only.
 *
 *   third party --x-api-key--> Gateway (next dev) --service key--> catalog service
 *                                                                  (image model stubbed)
 *
 * Real HTTP requests all the way: generations through the gateway with a client's
 * API key, the console's billing API with a signed-in admin, and GET /api/v1/usage
 * with the client's own key. Asserts exact paise and exact rows.
 *
 * Needs (all local):
 *   BILLING_TEST_DATABASE_URL  postgresql://...@localhost:55433/scaleezy_gateway_local
 *   BILLING_TEST_GATEWAY       http://127.0.0.1:3999   (next dev on the same database)
 *   BILLING_TEST_SERVICE       http://127.0.0.1:4995   (se_catalog_tryon_service: node tests/billing.js --serve 4995)
 *   BILLING_TEST_SERVICE_KEY   the service key that stubbed service was started with
 *
 * The test admin, clients and API keys are made here with random secrets that
 * live only for this run. Nothing outside localhost is ever contacted.
 */
import crypto from 'node:crypto';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const DB = process.env.BILLING_TEST_DATABASE_URL;
const GW = process.env.BILLING_TEST_GATEWAY || 'http://127.0.0.1:3999';
const SVC = process.env.BILLING_TEST_SERVICE || 'http://127.0.0.1:4995';
const SVC_KEY = process.env.BILLING_TEST_SERVICE_KEY;
for (const [name, url] of [['BILLING_TEST_DATABASE_URL', DB], ['BILLING_TEST_GATEWAY', GW], ['BILLING_TEST_SERVICE', SVC]]) {
  if (!url || !['localhost', '127.0.0.1', '::1'].includes(new URL(url).hostname)) {
    console.error(`${name} must point at localhost. Refusing to run.`);
    process.exit(2);
  }
}
if (!SVC_KEY) { console.error('Set BILLING_TEST_SERVICE_KEY.'); process.exit(2); }
const COUNTER = `${new URL(SVC).protocol}//${new URL(SVC).hostname}:${Number(new URL(SVC).port) + 1}`;

const pool = new pg.Pool({ connectionString: DB });
const q = (text, values) => pool.query(text, values);

let passed = 0;
const failures = [];
const check = (name, ok, detail) => {
  if (ok) passed++; else failures.push(name);
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? '  ' + detail : ''}`);
};
const eq = (name, actual, expected) => {
  const a = JSON.stringify(actual); const e = JSON.stringify(expected);
  check(name, a === e, a === e ? '' : `\n      got      ${a}\n      expected ${e}`);
};
const section = (t) => console.log(`\n${t}`);
const RUN = crypto.randomBytes(3).toString('hex');
const uuid = () => crypto.randomUUID();
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// ── Local fixtures ─────────────────────────────────────────────────────────
async function seed() {
  // The catalog service, as the gateway knows it (slug "cat").
  let ms = (await q(`SELECT id FROM super_admin."Microservice" WHERE slug = 'cat'`)).rows[0];
  if (!ms) {
    ms = { id: uuid() };
    await q(`INSERT INTO super_admin."Microservice" (id, slug, "displayName", "updatedAt") VALUES ($1, 'cat', 'Catalog (local test)', now())`, [ms.id]);
  }
  await q(`INSERT INTO super_admin."MicroserviceEnvironment" (id, "microserviceId", environment, "targetUrl", "internalSecret", "timeoutMs", "maxPayloadSize", "updatedAt")
           VALUES ($1, $2, 'PRODUCTION', $3, $4, 90000, 52428800, now())
           ON CONFLICT ("microserviceId", environment) DO UPDATE SET "targetUrl" = EXCLUDED."targetUrl", "internalSecret" = EXCLUDED."internalSecret", status = 'ACTIVE'`,
  [uuid(), ms.id, SVC, SVC_KEY]);

  const clients = {};
  for (const name of ['a', 'b']) {
    const id = uuid();
    const rawKey = `sk_test_${crypto.randomBytes(18).toString('hex')}`;
    await q(`INSERT INTO super_admin."Client" (id, "companyName", email, "contactName", "updatedAt") VALUES ($1, $2, $3, 'Test Contact', now())`,
      [id, `Billing Test ${name.toUpperCase()} ${RUN}`, `billing-${name}-${RUN}@example.test`]);
    await q(`INSERT INTO super_admin."ApiKey" (id, "clientId", name, "keyHash", permissions, "allowedDomains", "updatedAt") VALUES ($1, $2, 'test', $3, '{}', '{}', now())`,
      [uuid(), id, sha256(rawKey)]);
    await q(`INSERT INTO super_admin."ClientAccess" (id, "clientId", "microserviceId", "updatedAt") VALUES ($1, $2, $3, now())`, [uuid(), id, ms.id]);
    clients[name] = { id, rawKey };
  }

  // A console admin for this run only.
  const email = `billing-admin-${RUN}@example.test`;
  const password = crypto.randomBytes(16).toString('hex');
  await q(`INSERT INTO super_admin."AdminUser" (id, email, name, "passwordHash", "updatedAt") VALUES ($1, $2, 'Billing Test Admin', $3, now())`,
    [uuid(), email, await bcrypt.hash(password, 8)]);
  return { clients, admin: { email, password } };
}

// ── HTTP helpers ───────────────────────────────────────────────────────────
async function signIn({ email, password }) {
  const csrfRes = await fetch(`${GW}/api/auth/csrf`);
  const jar = new Map();
  const keep = (res) => (res.headers.getSetCookie?.() || []).forEach((c) => { const [kv] = c.split(';'); const i = kv.indexOf('='); jar.set(kv.slice(0, i), kv.slice(i + 1)); });
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
  return cookie();
}

let adminCookie = '';
const admin = async (method, path, body) => {
  const res = await fetch(`${GW}/api/admin/v1${path}`, {
    method, headers: { cookie: adminCookie, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
  });
  const type = res.headers.get('content-type') || '';
  return { status: res.status, type, body: type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer()) };
};

async function generate(client, body) {
  const res = await fetch(`${GW}/api/gateway/cat/api/v1/draping/generate-catalog/women`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': client.rawKey },
    body: JSON.stringify({ clientId: `shop-${RUN}`, modelId: 'saree1', category: 'SAREE', ...body }),
  });
  const text = await res.text();
  const events = text.split('\n').filter((l) => l.startsWith('data: ')).map((l) => JSON.parse(l.slice(6)));
  let json = null;
  if (!events.length) { try { json = JSON.parse(text); } catch { /* not json */ } }
  return { status: res.status, events, json, done: events.at(-1)?.type === 'COMPLETE' };
}

const usage = async (client, month) => {
  const res = await fetch(`${GW}/api/v1/usage${month ? `?month=${month}` : ''}`, { headers: client ? { 'x-api-key': client.rawKey } : {} });
  return { status: res.status, body: await res.json() };
};
const stubGenerations = async () => (await (await fetch(COUNTER)).json()).generations;
const rowsFor = async (clientId) => (await q(`SELECT kind, colour_name, request_key FROM se_catalog.billable_runs WHERE client_id = $1 ORDER BY delivered_at, id`, [clientId])).rows;

// India-time month helpers (same rule as the code under test).
const IST = 330 * 60 * 1000;
const periodOf = (d) => { const x = new Date(d.getTime() + IST); return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}`; };
const prevPeriod = (p) => { const [y, m] = p.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; };
const monthStart = (p) => { const [y, m] = p.split('-').map(Number); return new Date(Date.UTC(y, m - 1, 1) - IST); };

async function main() {
  const { clients, admin: adminUser } = await seed();
  const A = clients.a; const B = clients.b;
  adminCookie = await signIn(adminUser);
  const thisMonth = periodOf(new Date());
  const lastMonth = prevPeriod(thisMonth);

  section('DELIVERED RUNS THROUGH THE GATEWAY  → charged, at the placeholder prices');
  {
    const g0 = await stubGenerations();
    const cat = await generate(A, { saree: `stub:ok:garment-${RUN}` });
    check('a catalog streams to completion through the gateway', cat.done, `status ${cat.status}`);
    const col = await generate(A, { saree: `stub:ok:garment-${RUN}`, jobId: `teal-${RUN}`, color: { name: 'Teal', hex: '#008080' } });
    check('a colour variant streams to completion', col.done, col.done ? '' : `status ${col.status} events ${col.events.map((e) => e.type).join(',')}`);
    eq('the image model was asked twice', (await stubGenerations()) - g0, 2);
    eq('two rows for client A, one of each kind, keyed per request', (await rowsFor(A.id)).map((r) => [r.kind, r.colour_name, r.request_key.split(':')[0]]),
      [['CATALOG', null, 'req'], ['COLOUR_VARIANT', 'Teal', 'job']]);
    const failed = await generate(A, { saree: 'stub:fail-after:3:x' });
    check('a partial run ends in an error', failed.events.at(-1)?.type === 'ERROR', `status ${failed.status} events ${failed.events.map((e) => e.type).join(',')} ${JSON.stringify(failed.json)}`);
    eq('…and adds no row', (await rowsFor(A.id)).length, 2);

    const u = await usage(A);
    eq('GET /v1/usage: counts', [u.status, u.body.catalogs, u.body.colourVariants], [200, 1, 1]);
    eq('GET /v1/usage: Rs 100 + Rs 60, GST 18% on top = Rs 188.80', [u.body.subtotal, u.body.gst, u.body.total],
      [{ paise: 16000, rupees: '160.00' }, { ratePercent: 18, amount: { paise: 2880, rupees: '28.80' } }, { paise: 18880, rupees: '188.80' }]);
    eq('GET /v1/usage: the default limit is Rs 5,000, before GST', [u.body.monthlyLimit.limit.paise, u.body.monthlyLimit.used.paise, u.body.monthlyLimit.remaining.paise, u.body.monthlyLimit.reached], [500000, 16000, 484000, false]);
    eq('GET /v1/usage: client B sees only its own (nothing)', [(await usage(B)).body.catalogs, (await usage(B)).body.runs.length], [0, 0]);
    eq('GET /v1/usage without a key: 401', (await usage(null)).status, 401);
  }

  section('A THIRD PARTY CANNOT REACH THE INTERNAL USAGE ROUTE THROUGH THE GATEWAY');
  {
    const g0 = await stubGenerations();
    const res = await fetch(`${GW}/api/gateway/cat/internal/billing/usage?clientId=${A.id}&from=2020-01-01&to=2030-01-01`, { headers: { 'x-api-key': B.rawKey } });
    const body = await res.json();
    eq('refused as not found, with no usage in the answer', [res.status, body.runs === undefined], [404, true]);
    eq('no generation happened', (await stubGenerations()) - g0, 0);
  }

  section('PRICE CHANGED MID-MONTH  → each run at its own price');
  {
    const set = await admin('POST', `/clients/${A.id}/billing/prices`, { kind: 'CATALOG', amountRupees: '120' });
    eq('a client price is set from the console (from now)', [set.status, set.body.data?.amountPaise, set.body.data?.scope], [201, 12000, 'CLIENT']);
    const past = await admin('POST', `/clients/${A.id}/billing/prices`, { kind: 'CATALOG', amountRupees: '1', effectiveFrom: `${lastMonth}-15` });
    eq('a price that would start in a past month is refused', [past.status, past.body.error?.code], [400, 'PRICE_IN_PAST_MONTH']);
    const bad = await admin('POST', `/clients/${A.id}/billing/prices`, { kind: 'CATALOG', amountRupees: '-5' });
    eq('a bad amount is refused with a plain sentence', [bad.status, bad.body.error?.message], [400, 'Enter a price in rupees, like 100 or 99.50.']);
    await generate(A, { saree: `stub:ok:garment2-${RUN}` });
    const u = await usage(A);
    eq('two catalog lines: one at Rs 100 (before the change), one at Rs 120', u.body.lines.map((l) => [l.kind, l.quantity, l.unitPrice.paise, l.amount.paise]),
      [['CATALOG', 1, 10000, 10000], ['CATALOG', 1, 12000, 12000], ['COLOUR_VARIANT', 1, 6000, 6000]]);
    eq('subtotal Rs 280, GST Rs 50.40, total Rs 330.40', [u.body.subtotal.paise, u.body.gst.amount.paise, u.body.total.paise], [28000, 5040, 33040]);
  }

  section('MONTHLY LIMIT REACHED  → refused before generation, nothing charged');
  {
    const setLimit = await admin('PATCH', `/clients/${A.id}/billing/settings`, { monthlyLimitRupees: '300' });
    eq('the limit is set to Rs 300 from the console', [setLimit.status, setLimit.body.data?.monthlyLimitPaise], [200, 30000]);
    const under = await generate(A, { saree: `stub:ok:garment3-${RUN}`, color: 'Bottle Green' });
    check('Rs 280 used of Rs 300: one more run is still allowed', under.done);
    const g0 = await stubGenerations();
    const rows0 = (await rowsFor(A.id)).length;
    const refused = await generate(A, { saree: `stub:ok:garment4-${RUN}` });
    eq('Rs 340 used: the next run is refused with a plain sentence', [refused.status, refused.json?.error?.code, refused.json?.error?.message],
      [402, 'MONTHLY_LIMIT_REACHED', "This month's limit is reached. Ask ScaleEzy to raise it."]);
    eq('…before any AI work', (await stubGenerations()) - g0, 0);
    eq('…and nothing charged', (await rowsFor(A.id)).length, rows0);
    const otherClient = await generate(B, { saree: `stub:ok:b-${RUN}` });
    check("another client's runs are not affected", otherClient.done);
    const raised = await admin('PATCH', `/clients/${A.id}/billing/settings`, { monthlyLimitRupees: null });
    eq('switching the limit off from the console', raised.body.data?.monthlyLimitPaise, null);
    check('…lets runs through again', (await generate(A, { saree: `stub:ok:garment5-${RUN}` })).done);
    await admin('PATCH', `/clients/${A.id}/billing/settings`, { monthlyLimitRupees: '5000' });
  }

  section('CONSOLE: THE MONTH SO FAR, AND THE CSV');
  {
    const page = await admin('GET', `/clients/${A.id}/billing`);
    const s = page.body.data.summary;
    eq('counts: 3 catalogs, 2 colour variants', s.counts, { CATALOG: 3, COLOUR_VARIANT: 2 });
    eq('Rs 100 + Rs 120×2 + Rs 60×2 = Rs 460 before GST', s.totals.subtotalPaise, 46000);
    eq('current prices: catalog Rs 120 (client), colour Rs 60 (default)', [s.currentPrices.CATALOG.amountPaise, s.currentPrices.CATALOG.source, s.currentPrices.COLOUR_VARIANT.amountPaise, s.currentPrices.COLOUR_VARIANT.source], [12000, 'CLIENT', 6000, 'DEFAULT']);
    const csv = await admin('GET', `/clients/${A.id}/billing/usage-csv?month=${thisMonth}`);
    const text = csv.body.toString('utf8');
    eq('CSV: a header, five runs, then subtotal, GST and total', [csv.status, csv.type.startsWith('text/csv'), text.trim().split('\r\n').length], [200, true, 1 + 5 + 1 + 3]);
    check('CSV: the total line reads 542.80', /"Total".*"542\.80"/.test(text), text.trim().split('\r\n').at(-1));
    const anon = await fetch(`${GW}/api/admin/v1/clients/${A.id}/billing`);
    eq('the console billing API needs a signed-in admin', anon.status, 401);
  }

  section('THE MONTHLY BILL  (last month, from delivered runs)');
  {
    // Last month's delivered runs, as the catalog service would have recorded
    // them, and a price change in the middle of that month (set back then).
    const start = monthStart(lastMonth);
    const day = (n) => new Date(start.getTime() + n * 86400e3 + 3600e3);
    await q(`INSERT INTO super_admin."CatalogPrice" (id, scope, plan, "clientId", kind, "amountPaise", "effectiveFrom") VALUES ($1, 'CLIENT', NULL, $2, 'COLOUR_VARIANT', 7500, $3)`, [uuid(), B.id, day(10)]);
    const runs = [['CATALOG', day(2)], ['COLOUR_VARIANT', day(3)], ['COLOUR_VARIANT', day(12)], ['CATALOG', day(20)]];
    for (const [kind, at] of runs) {
      await q(`INSERT INTO se_catalog.billable_runs (id, client_id, kind, request_key, views, delivered_at) VALUES ($1, $2, $3, $4, 4, $5)`, [uuid(), B.id, kind, `req:${uuid()}`, at]);
    }
    const [first, second] = await Promise.all([
      admin('POST', `/clients/${B.id}/billing/bills`, { month: lastMonth }),
      admin('POST', `/clients/${B.id}/billing/bills`, { month: lastMonth }),
    ]);
    eq('made twice at once: one 201, one 200, the same bill', [[first.status, second.status].sort(), first.body.data.id === second.body.data.id], [[200, 201], true]);
    const bill = first.body.data;
    eq('lines: 2 catalogs at Rs 100, a colour at Rs 60 (before the change) and one at Rs 75 (after)', bill.lines.map((l) => [l.kind, l.quantity, l.unitPaise, l.amountPaise]),
      [['CATALOG', 2, 10000, 20000], ['COLOUR_VARIANT', 1, 6000, 6000], ['COLOUR_VARIANT', 1, 7500, 7500]]);
    eq('subtotal Rs 335, GST 18% Rs 60.30, total Rs 395.30', [bill.subtotalPaise, bill.gstRateBp, bill.gstPaise, bill.totalPaise, bill.status], [33500, 1800, 6030, 39530, 'DRAFT']);
    eq('exactly one bill row for that client and month', (await q(`SELECT count(*)::int n FROM super_admin."CatalogBill" WHERE "clientId" = $1 AND period = $2`, [B.id, lastMonth])).rows[0].n, 1);

    await admin('PATCH', `/clients/${B.id}/billing/settings`, { gstEnabled: false });
    const again = await admin('POST', `/clients/${B.id}/billing/bills`, { month: lastMonth });
    eq('GST switched off, made again: the same draft, now without GST', [again.status, again.body.data.id === bill.id, again.body.data.gstPaise, again.body.data.totalPaise, again.body.data.gstEnabled], [200, true, 0, 33500, false]);

    const sent = await admin('PATCH', `/clients/${B.id}/billing/bills/${bill.id}`, { status: 'SENT' });
    eq('marked Sent', [sent.status, sent.body.data.status, !!sent.body.data.sentAt], [200, 'SENT', true]);
    await admin('PATCH', `/clients/${B.id}/billing/settings`, { gstEnabled: true });
    const frozen = await admin('POST', `/clients/${B.id}/billing/bills`, { month: lastMonth });
    eq('a sent bill is never changed by making it again', [frozen.status, frozen.body.data.totalPaise, frozen.body.data.status], [200, 33500, 'SENT']);
    const skip = await admin('PATCH', `/clients/${B.id}/billing/bills/${bill.id}`, { status: 'DRAFT' });
    eq('Sent can go back to Draft', skip.body.data.status, 'DRAFT');
    await admin('PATCH', `/clients/${B.id}/billing/bills/${bill.id}`, { status: 'SENT' });
    const paid = await admin('PATCH', `/clients/${B.id}/billing/bills/${bill.id}`, { status: 'PAID' });
    eq('marked Paid', [paid.body.data.status, !!paid.body.data.paidAt], ['PAID', true]);
    const backToDraft = await admin('PATCH', `/clients/${B.id}/billing/bills/${bill.id}`, { status: 'DRAFT' });
    eq('a paid bill cannot jump back to draft', [backToDraft.status, backToDraft.body.error?.code], [400, 'INVALID_STATUS_CHANGE']);

    const pdf = await admin('GET', `/clients/${B.id}/billing/bills/${bill.id}/pdf`);
    const pdfText = pdf.body.toString('latin1');
    eq('the PDF is a PDF', [pdf.status, pdf.type, pdfText.startsWith('%PDF-1.4'), pdfText.trimEnd().endsWith('%%EOF')], [200, 'application/pdf', true, true]);
    check('…with the bill number, the lines and the total', pdfText.includes(bill.number) && pdfText.includes('Colour variant') && pdfText.includes('Rs 335.00'));

    const notOver = await admin('POST', `/clients/${B.id}/billing/bills`, { month: thisMonth });
    eq('a bill for a month that is not over is refused', [notOver.status, notOver.body.error?.message], [400, 'This month is not over yet. Bills are made once a month has ended.']);

    const all = await admin('POST', '/billing/bills', { month: lastMonth });
    const mine = all.body.data.bills.filter((b) => b.clientId === B.id);
    eq('"make bills for every client" again: still the one bill, untouched', [all.status, mine.length, mine[0]?.created, mine[0]?.status], [200, 1, false, 'PAID']);
  }

  section('PLAN PRICES FROM THE CONSOLE');
  {
    const list = await admin('GET', '/billing/prices');
    const placeholders = list.body.data.prices.filter((p) => p.plan === 'DEFAULT' && /PLACEHOLDER/.test(p.note || ''));
    eq('the seeded placeholders are listed: Rs 100 catalog, Rs 60 colour', placeholders.map((p) => [p.kind, p.amountPaise]).sort(), [['CATALOG', 10000], ['COLOUR_VARIANT', 6000]]);
    const gold = await admin('POST', '/billing/prices', { plan: 'gold-' + RUN, kind: 'CATALOG', amountRupees: '90' });
    eq('a plan price can be added', [gold.status, gold.body.data.plan, gold.body.data.amountPaise], [201, ('gold-' + RUN).toUpperCase(), 9000]);
  }

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) console.log('FAILED:\n  - ' + failures.join('\n  - '));
  await pool.end();
  process.exit(failures.length ? 1 : 0);
}

main().catch(async (err) => { console.error(err); await pool.end().catch(() => {}); process.exit(1); });
