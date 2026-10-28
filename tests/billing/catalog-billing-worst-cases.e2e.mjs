#!/usr/bin/env node
/**
 * Catalog billing: worst cases, end to end, LOCAL ONLY (same setup as
 * catalog-billing.e2e.mjs). Collisions, duplicates, absences, odd money, the
 * month boundary in India time, abuse by a caller, and a dead usage route.
 *
 * Runs that a scenario needs in a PAST month, or in bulk, are written straight
 * into se_catalog.billable_runs exactly as the catalog service writes them; the
 * recording itself is proven by the service's own suite (tests/billing.js).
 */
import {
  GW, SVC, RUN, adminClient, catalogService, check, eq, finish, generate, insertRuns, istDate, makeClient,
  monthStart, periodOf, prevPeriod, q, rowsFor, section, signInAdmin, stubGenerations, usage, uuid,
} from './e2e-helpers.mjs';

const now = () => new Date();
const thisMonth = periodOf(now());
const lastMonth = prevPeriod(thisMonth);
const DAY = 86400e3;

async function main() {
  await catalogService();
  const { cookie } = await signInAdmin();
  const admin = adminClient(cookie);
  const lastStart = monthStart(lastMonth);
  const thisStart = monthStart(thisMonth);

  // ── MONEY ────────────────────────────────────────────────────────────────
  section('MONEY: a price of ₹0');
  {
    const c = await makeClient(`Zero Price ${RUN}`);
    const r = await admin('POST', `/clients/${c.id}/billing/prices`, { kind: 'CATALOG', amountRupees: '0' });
    eq('₹0 is accepted as a price (a free catalog)', [r.status, r.body.data?.amountPaise], [201, 0]);
    const g = await generate(c, { saree: `stub:ok:zero-${RUN}` });
    const u = await usage(c);
    eq('the run is listed at ₹0, total ₹0, no GST on nothing', [g.done, u.body.catalogs, u.body.subtotal.paise, u.body.gst.amount.paise, u.body.total.paise], [true, 1, 0, 0, 0]);
  }

  section('MONEY: ₹99.99 and GST rounding over many runs');
  {
    const c = await makeClient(`Paise Price ${RUN}`);
    await admin('POST', `/clients/${c.id}/billing/prices`, { kind: 'CATALOG', amountRupees: '99.99' });
    const t = Date.now() + 2000;
    await insertRuns(c.id, Array.from({ length: 7 }, (_, i) => ({ kind: 'CATALOG', at: new Date(t + i * 1000) })));
    const u = await usage(c);
    // The documented rule: GST = 18% of the month's subtotal, rounded once to the
    // nearest paisa (69993 × 0.18 = 12598.74 → 12599). Per-run rounding would give 12600.
    eq('7 × ₹99.99 = ₹699.93; GST ₹125.99 (rounded once on the subtotal); total ₹825.92',
      [u.body.subtotal.paise, u.body.gst.amount.paise, u.body.total.paise], [69993, 12599, 82592]);
    eq('the line shows the exact unit price', u.body.lines.map((l) => [l.quantity, l.unitPrice.rupees, l.amount.rupees]), [[7, '99.99', '699.93']]);
  }

  section('MONEY: a huge month (10,000 runs)');
  {
    const c = await makeClient(`Huge Month ${RUN}`);
    // 6,000 catalogs and 4,000 colour variants spread over last month.
    await q(`INSERT INTO se_catalog.billable_runs (id, client_id, kind, request_key, colour_name, views, delivered_at)
             SELECT gen_random_uuid()::text, $1, CASE WHEN g % 5 < 3 THEN 'CATALOG' ELSE 'COLOUR_VARIANT' END, 'req:' || gen_random_uuid()::text,
                    CASE WHEN g % 5 < 3 THEN NULL ELSE 'Colour ' || (g % 7) END, 4, $2::timestamptz + (g * interval '4 minutes')
             FROM generate_series(1, 10000) g`, [c.id, new Date(lastStart.getTime() + 3600e3)]);
    let t0 = Date.now();
    const bill = await admin('POST', `/clients/${c.id}/billing/bills`, { month: lastMonth });
    const billMs = Date.now() - t0;
    eq('bill: 6,000 × ₹100 + 4,000 × ₹60 = ₹8,40,000; GST ₹1,51,200; total ₹9,91,200',
      [bill.status, bill.body.data?.runCount, bill.body.data?.subtotalPaise, bill.body.data?.gstPaise, bill.body.data?.totalPaise], [201, 10000, 84000000, 15120000, 99120000]);
    t0 = Date.now();
    const page = await admin('GET', `/clients/${c.id}/billing?month=${lastMonth}`);
    const pageMs = Date.now() - t0;
    eq('the console page data loads with all 10,000 runs counted', [page.status, page.body.data.summary.counts], [200, { CATALOG: 6000, COLOUR_VARIANT: 4000 }]);
    const csv = await admin('GET', `/clients/${c.id}/billing/usage-csv?month=${lastMonth}`);
    eq('the CSV has a header, 10,000 runs, a blank line, subtotal, GST and total', csv.body.toString('utf8').trim().split('\r\n').length, 1 + 10000 + 1 + 3);
    const pdf = await admin('GET', `/clients/${c.id}/billing/bills/${bill.body.data.id}/pdf`);
    check('the PDF is still made, with the right total', pdf.status === 200 && pdf.body.toString('latin1').includes('Rs 9,91,200.00'));
    console.log(`      (bill made in ${billMs} ms, page data in ${pageMs} ms)`);
  }

  section('MONEY: refusals for prices and limits that are not amounts');
  {
    const c = await makeClient(`Bad Input ${RUN}`);
    for (const bad of ['-5', 'abc', '1e3', '', '12.345', '₹-1']) {
      const r = await admin('POST', `/clients/${c.id}/billing/prices`, { kind: 'CATALOG', amountRupees: bad });
      eq(`price "${bad}" is refused with a plain sentence`, [r.status, r.body.error?.message], [400, 'Enter a price in rupees, like 100 or 99.50.']);
    }
    for (const bad of ['-1', 'abc', '0', '0.50']) {
      const r = await admin('PATCH', `/clients/${c.id}/billing/settings`, { monthlyLimitRupees: bad });
      eq(`limit "${bad}" is refused with a plain sentence`, [r.status, r.body.error?.message], [400, 'Enter a monthly limit of at least ₹1, like 5000, or choose no limit.']);
    }
    const k = await admin('POST', `/clients/${c.id}/billing/prices`, { kind: 'MEN_CATALOG', amountRupees: '10' });
    eq('a kind that is not charged is refused', [k.status, k.body.error?.code], [400, 'INVALID_KIND']);
    const d = await admin('POST', `/clients/${c.id}/billing/prices`, { kind: 'CATALOG', amountRupees: '10', effectiveFrom: '28-10-2026' });
    eq('a date that is not YYYY-MM-DD is refused', [d.status, d.body.error?.code], [400, 'INVALID_DATE']);
  }

  section('MONEY: a price starting today, tomorrow, or in the past');
  {
    const c = await makeClient(`Price Dates ${RUN}`);
    await insertRuns(c.id, [{ kind: 'CATALOG', at: new Date(Date.now() - 60e3) }]); // made a minute ago at ₹100
    const today = await admin('POST', `/clients/${c.id}/billing/prices`, { kind: 'CATALOG', amountRupees: '150', effectiveFrom: istDate(now()) });
    eq('a price "starting today" is accepted', today.status, 201);
    const u1 = await usage(c);
    eq('…and the run made earlier today keeps the price it was made at (₹100)', u1.body.runs.map((r) => r.price.paise), [10000]);
    const tomorrow = await admin('POST', `/clients/${c.id}/billing/prices`, { kind: 'COLOUR_VARIANT', amountRupees: '70', effectiveFrom: istDate(new Date(Date.now() + DAY)) });
    const page = await admin('GET', `/clients/${c.id}/billing`);
    eq('a price starting tomorrow is saved but not yet current', [tomorrow.status, page.body.data.summary.currentPrices.COLOUR_VARIANT.amountPaise], [201, 6000]);
    if (istDate(new Date(Date.now() - DAY)).slice(0, 7) === thisMonth) {
      const y = await admin('POST', `/clients/${c.id}/billing/prices`, { kind: 'CATALOG', amountRupees: '1', effectiveFrom: istDate(new Date(Date.now() - DAY)) });
      eq('a price starting yesterday is refused: runs already made keep their price', [y.status, y.body.error?.code], [400, 'PRICE_IN_PAST']);
    }
    const lm = await admin('POST', `/clients/${c.id}/billing/prices`, { kind: 'CATALOG', amountRupees: '1', effectiveFrom: `${lastMonth}-10` });
    eq('a price starting last month is refused', [lm.status, lm.body.error?.code], [400, 'PRICE_IN_PAST']);
  }

  section('MONEY: two price changes on the same day');
  {
    const c = await makeClient(`Two Changes ${RUN}`);
    const tomorrow = istDate(new Date(Date.now() + DAY));
    for (const amount of ['110', '115', '112']) await admin('POST', `/clients/${c.id}/billing/prices`, { kind: 'CATALOG', amountRupees: amount, effectiveFrom: tomorrow });
    // A run delivered tomorrow at noon, India time.
    await insertRuns(c.id, [{ kind: 'CATALOG', at: new Date(`${tomorrow}T12:00:00+05:30`) }]);
    const u = await usage(c, tomorrow.slice(0, 7) !== thisMonth ? `?month=${tomorrow.slice(0, 7)}` : '');
    eq('the price set LAST wins (₹112), not a random one of the three', u.body.runs.map((r) => r.price.paise), [11200]);
  }

  // ── LIMIT ────────────────────────────────────────────────────────────────
  section('LIMIT: exactly at the limit vs one paisa under');
  {
    const c = await makeClient(`At Limit ${RUN}`);
    await admin('POST', `/clients/${c.id}/billing/prices`, { kind: 'CATALOG', amountRupees: '1000' });
    await insertRuns(c.id, Array.from({ length: 5 }, (_, i) => ({ kind: 'CATALOG', at: new Date(Date.now() + 1000 + i) })));
    await new Promise((r) => setTimeout(r, 1500));
    const g0 = await stubGenerations();
    const at = await generate(c, { saree: `stub:ok:at-${RUN}` });
    eq('₹5,000.00 used of ₹5,000: refused before any AI work', [at.status, at.json?.error?.code, (await stubGenerations()) - g0], [402, 'MONTHLY_LIMIT_REACHED', 0]);
    await admin('PATCH', `/clients/${c.id}/billing/settings`, { monthlyLimitRupees: '5000.01' });
    const under = await generate(c, { saree: `stub:ok:under-${RUN}` });
    check('limit ₹5,000.01 (one paisa over what is used): allowed', under.done, `status ${under.status}`);
    const lowered = await admin('PATCH', `/clients/${c.id}/billing/settings`, { monthlyLimitRupees: '100' });
    const afterLower = await generate(c, { saree: `stub:ok:lowered-${RUN}` });
    eq('limit lowered below what is already used: the next run is refused at once', [lowered.status, afterLower.status], [200, 402]);
    await admin('PATCH', `/clients/${c.id}/billing/settings`, { monthlyLimitRupees: null });
    check('limit switched off: allowed again', (await generate(c, { saree: `stub:ok:off-${RUN}` })).done);
  }

  section('LIMIT: two runs racing one paisa below the limit');
  {
    const c = await makeClient(`Race ${RUN}`);
    await insertRuns(c.id, [{ kind: 'CATALOG', at: new Date(Date.now() - 1000) }]); // ₹100 used
    await admin('PATCH', `/clients/${c.id}/billing/settings`, { monthlyLimitRupees: '100.01' });
    const [a, b] = await Promise.all([generate(c, { saree: 'stub:slow:300:race-a' }), generate(c, { saree: 'stub:slow:300:race-b' })]);
    // Each request is checked on its own before it is forwarded; neither has been
    // recorded yet when the other is checked, so both pass. Documented: the limit can
    // be overshot by the runs already in flight when it is reached (here one extra).
    eq('both racing runs were already admitted, so both are delivered and charged', [a.done, b.done, (await rowsFor(c.id)).length], [true, true, 3]);
    eq('…and the next one is refused', (await generate(c, { saree: `stub:ok:after-race-${RUN}` })).status, 402);
  }

  section('LIMIT: GST does not count toward the limit');
  {
    const c = await makeClient(`Limit GST ${RUN}`);
    await insertRuns(c.id, Array.from({ length: 49 }, () => ({ kind: 'CATALOG', at: new Date(Date.now() - 5000) }))); // ₹4,900 before GST, ₹5,782 with it
    const on = await generate(c, { saree: `stub:ok:gst-on-${RUN}` });
    check('GST on: ₹4,900 before GST (₹5,782 with it) is under ₹5,000, so allowed', on.done, `status ${on.status}`);
    await admin('PATCH', `/clients/${c.id}/billing/settings`, { gstEnabled: false });
    const off = await generate(c, { saree: `stub:ok:gst-off-${RUN}` });
    eq('GST off: ₹5,000 used: refused the same way', off.status, 402);
  }

  // ── BILLS ────────────────────────────────────────────────────────────────
  section('BILLS: a month with no runs');
  {
    const c = await makeClient(`No Runs ${RUN}`);
    const r = await admin('POST', `/clients/${c.id}/billing/bills`, { month: lastMonth });
    eq('no bill is made for nothing: plain refusal', [r.status, r.body.error?.code], [400, 'NOTHING_TO_BILL']);
    const all = await admin('POST', '/billing/bills', { month: lastMonth });
    eq('"Make bills for every client" skips a client with no runs', all.body.data.bills.some((b) => b.clientId === c.id), false);
    eq('…and no ₹0 bill row exists', (await q(`SELECT count(*)::int n FROM super_admin."CatalogBill" WHERE "clientId" = $1`, [c.id])).rows[0].n, 0);
  }

  section('BILLS: the month boundary is India time');
  {
    const c = await makeClient(`Boundary ${RUN}`);
    const lastMinute = new Date(thisStart.getTime() - 60e3);      // 23:59 IST on the last day of last month
    const afterMidnight = new Date(thisStart.getTime() + 30 * 60e3); // 00:30 IST on the 1st (still the last day in UTC)
    await insertRuns(c.id, [{ kind: 'CATALOG', at: lastMinute }, { kind: 'COLOUR_VARIANT', at: afterMidnight }]);
    const bill = await admin('POST', `/clients/${c.id}/billing/bills`, { month: lastMonth });
    eq('last month\'s bill has the 23:59 IST catalog only', bill.body.data.lines.map((l) => [l.kind, l.quantity]), [['CATALOG', 1]]);
    eq('the 00:30 IST run on the 1st is this month\'s, though UTC still says last month',
      [afterMidnight.toISOString().slice(0, 7), (await usage(c)).body.colourVariants], [lastMonth, 1]);

    // A run recorded late for last month: a draft picks it up, a sent bill does not.
    await insertRuns(c.id, [{ kind: 'CATALOG', at: new Date(lastStart.getTime() + 5 * DAY) }]);
    const refreshed = await admin('POST', `/clients/${c.id}/billing/bills`, { month: lastMonth });
    eq('re-making the draft brings it up to date (2 catalogs), same bill', [refreshed.status, refreshed.body.data.id === bill.body.data.id, refreshed.body.data.runCount], [200, true, 2]);
    await admin('PATCH', `/clients/${c.id}/billing/bills/${bill.body.data.id}`, { status: 'SENT' });
    await insertRuns(c.id, [{ kind: 'CATALOG', at: new Date(lastStart.getTime() + 6 * DAY) }]);
    const frozen = await admin('POST', `/clients/${c.id}/billing/bills`, { month: lastMonth });
    eq('once sent, a late run does not change the bill', [frozen.body.data.runCount, frozen.body.data.status], [2, 'SENT']);
  }

  section('BILLS: changing a sent or paid bill directly through the API');
  {
    const c = await makeClient(`Tamper ${RUN}`);
    const other = await makeClient(`Tamper Other ${RUN}`);
    await insertRuns(c.id, [{ kind: 'CATALOG', at: new Date(lastStart.getTime() + DAY) }]);
    const bill = (await admin('POST', `/clients/${c.id}/billing/bills`, { month: lastMonth })).body.data;
    await admin('PATCH', `/clients/${c.id}/billing/bills/${bill.id}`, { status: 'SENT' });
    const tamper = await admin('PATCH', `/clients/${c.id}/billing/bills/${bill.id}`, { status: 'PAID', totalPaise: 1, lines: [], subtotalPaise: 1 });
    eq('extra fields are ignored: only the status changes', [tamper.body.data.status, tamper.body.data.totalPaise, tamper.body.data.lines.length], ['PAID', 11800, 1]);
    const paidAt = tamper.body.data.paidAt;
    const again = await admin('PATCH', `/clients/${c.id}/billing/bills/${bill.id}`, { status: 'PAID' });
    eq('marking Paid twice is harmless: same paid date', [again.status, again.body.data.paidAt], [200, paidAt]);
    const toDraft = await admin('PATCH', `/clients/${c.id}/billing/bills/${bill.id}`, { status: 'DRAFT' });
    eq('a paid bill cannot go back to draft', [toDraft.status, toDraft.body.error?.message], [400, 'A paid bill cannot be marked draft.']);
    const bogus = await admin('PATCH', `/clients/${c.id}/billing/bills/${bill.id}`, { status: 'VOID' });
    eq('an unknown status is refused', [bogus.status, bogus.body.error?.code], [400, 'INVALID_STATUS']);
    const wrongClient = await admin('PATCH', `/clients/${other.id}/billing/bills/${bill.id}`, { status: 'SENT' });
    eq("another client's path cannot touch this bill", wrongClient.status, 404);
    const pdfWrong = await admin('GET', `/clients/${other.id}/billing/bills/${bill.id}/pdf`);
    eq("…nor read its PDF", pdfWrong.status, 404);
    const d = await makeClient(`Draft Undo ${RUN}`);
    await insertRuns(d.id, [{ kind: 'CATALOG', at: new Date(lastStart.getTime() + DAY) }]);
    const draft = (await admin('POST', `/clients/${d.id}/billing/bills`, { month: lastMonth })).body.data;
    const undo = await admin('PATCH', `/clients/${d.id}/billing/bills/${draft.id}`, { status: 'DRAFT' });
    eq('"undo" on a draft does nothing (there is nothing before draft)', [undo.status, undo.body.data.status], [200, 'DRAFT']);
  }

  section('BILLS: "Make bills" pressed twice at once');
  {
    const c = await makeClient(`Double Click ${RUN}`);
    await insertRuns(c.id, [{ kind: 'COLOUR_VARIANT', colourName: 'Teal', at: new Date(lastStart.getTime() + 2 * DAY) }]);
    const [x, y] = await Promise.all([admin('POST', '/billing/bills', { month: lastMonth }), admin('POST', '/billing/bills', { month: lastMonth })]);
    eq('both answer 200', [x.status, y.status], [200, 200]);
    eq('exactly one bill for the client', (await q(`SELECT count(*)::int n FROM super_admin."CatalogBill" WHERE "clientId" = $1`, [c.id])).rows[0].n, 1);
  }

  section('BILLS: a client suspended, or deleted, mid-month');
  {
    const s = await makeClient(`Suspended ${RUN}`);
    await generate(s, { saree: `stub:ok:susp-${RUN}` });
    await q(`UPDATE super_admin."Client" SET status = 'SUSPENDED' WHERE id = $1`, [s.id]);
    const refused = await generate(s, { saree: `stub:ok:susp2-${RUN}` });
    eq('a suspended client can no longer generate', refused.status, 403);
    const page = await admin('GET', `/clients/${s.id}/billing`);
    eq('…but their usage so far is still on the console (1 catalog)', [page.status, page.body.data.summary?.counts.CATALOG], [200, 1]);

    const del = await makeClient(`Deleted ${RUN}`);
    await insertRuns(del.id, [{ kind: 'CATALOG', at: new Date(lastStart.getTime() + 3 * DAY) }]);
    await q(`UPDATE super_admin."Client" SET status = 'DELETED', "deletedAt" = now() WHERE id = $1`, [del.id]);
    const all = await admin('POST', '/billing/bills', { month: lastMonth });
    const mine = all.body.data.bills.find((b) => b.clientId === del.id);
    eq('a client deleted (soft) still gets a bill for what was delivered', [!!mine, mine?.totalPaise], [true, 11800]);
    const list = await admin('GET', `/billing/bills?month=${lastMonth}`);
    check('…listed on the Catalog billing page, with its PDF reachable', list.body.data.bills.some((b) => b.clientId === del.id)
      && (await admin('GET', `/clients/${del.id}/billing/bills/${mine.billId}/pdf`)).status === 200);
  }

  section('BILLS: a client with a plan that has no price, and no own price');
  {
    const c = await makeClient(`Unpriced Plan ${RUN}`, { plan: 'ENTERPRISE' });
    await generate(c, { saree: `stub:ok:plan-${RUN}` });
    const page = await admin('GET', `/clients/${c.id}/billing`);
    eq('falls back to the DEFAULT price (₹100)', [page.body.data.summary.plan, page.body.data.summary.currentPrices.CATALOG.source, page.body.data.summary.totals.subtotalPaise], ['ENTERPRISE', 'DEFAULT', 10000]);
  }

  // ── DUPLICATES AND ABUSE ─────────────────────────────────────────────────
  section('ABUSE: the same jobId from two clients, and a jobId reused');
  {
    const a = await makeClient(`Job A ${RUN}`);
    const b = await makeClient(`Job B ${RUN}`);
    const jobId = `order-1001-${RUN}`;
    const [ra, rb] = await Promise.all([generate(a, { saree: 'stub:ok:j', jobId }), generate(b, { saree: 'stub:ok:j', jobId })]);
    eq('both clients get their catalog and one row each', [ra.done, rb.done, (await rowsFor(a.id)).length, (await rowsFor(b.id)).length], [true, true, 1, 1]);
    const g0 = await stubGenerations();
    const reuse = await generate(a, { saree: 'stub:ok:j', jobId });
    eq('the same client reusing a delivered jobId: 409 with a plain sentence, no AI work',
      [reuse.status, reuse.json?.code, reuse.json?.error, (await stubGenerations()) - g0],
      [409, 'ALREADY_DELIVERED', 'This jobId was already delivered and charged. Send a new jobId to make another catalog.', 0]);
  }

  section('ABUSE: forging the client header, reading another client, revoked keys');
  {
    const a = await makeClient(`Forger ${RUN}`);
    const victim = await makeClient(`Victim ${RUN}`);
    const forged = await generate(a, { saree: `stub:ok:forge-${RUN}` }, { 'x-gateway-client-id': victim.id });
    eq('a forged x-gateway-client-id is overwritten: the run is charged to the caller', [forged.done, (await rowsFor(a.id)).length, (await rowsFor(victim.id)).length], [true, 1, 0]);
    const peek = await usage(a, `?clientId=${victim.id}`);
    eq('/v1/usage ignores a clientId in the query: the caller sees only their own', [peek.status, peek.body.catalogs], [200, 1]);
    const internal = await fetch(`${GW}/api/gateway/cat/internal/billing/usage?from=2020-01-01&to=2030-01-01`, { headers: { 'x-api-key': a.rawKey } });
    eq('/internal/* through the gateway: 404', internal.status, 404);
    const internalDirect = await fetch(`${SVC}/internal/billing/usage?from=2020-01-01&to=2030-01-01`, { headers: { 'x-api-key': a.rawKey } });
    eq('/internal/* on the service with a client API key: 401', internalDirect.status, 401);
    await q(`UPDATE super_admin."ApiKey" SET status = 'REVOKED' WHERE id = $1`, [a.keyId]);
    const revoked = await usage(a);
    eq('a revoked key: /v1/usage 401', revoked.status, 401);
    eq('a revoked key: generation 401', (await generate(a, { saree: 'stub:ok:rev' })).status, 401);
  }

  section('ABUSE: month values that are not months');
  {
    const c = await makeClient(`Months ${RUN}`);
    for (const bad of ['2026-13', '2026-00', "2026-10'; DROP TABLE x;--", '2026-1', 'abc', '20261']) {
      const u = await usage(c, `?month=${encodeURIComponent(bad)}`);
      const a = await admin('GET', `/clients/${c.id}/billing?month=${encodeURIComponent(bad)}`);
      const b = await admin('POST', `/clients/${c.id}/billing/bills`, { month: bad });
      eq(`"${bad}": refused by /v1/usage, the console page and Make bill`, [u.status, a.status, b.status], [400, 400, 400]);
    }
    const old = await usage(c, '?month=1999-01');
    eq('1999-01 is a real month with nothing in it', [old.status, old.body.catalogs, old.body.total.paise], [200, 0, 0]);
    eq('the DB tables are all still there', (await q(`SELECT count(*)::int n FROM information_schema.tables WHERE table_schema = 'super_admin' AND table_name LIKE 'Catalog%'`)).rows[0].n, 3);
  }

  // ── FAILURE PATHS ────────────────────────────────────────────────────────
  section('FAILURE: the catalog service usage route is down');
  {
    const c = await makeClient(`Service Down ${RUN}`);
    await catalogService('http://127.0.0.1:4999'); // nothing listens there
    try {
      const page = await admin('GET', `/clients/${c.id}/billing`);
      eq('the console page still opens, with one plain sentence about usage', [page.status, page.body.data.summary, page.body.data.usageError],
        [200, null, 'The catalog service did not answer, so usage cannot be shown right now. Try again in a minute.']);
      check('…and still shows settings and bills', !!page.body.data.settings && Array.isArray(page.body.data.bills));
      const u = await usage(c);
      eq('/v1/usage: 503 with a plain sentence', [u.status, u.body.error?.code], [503, 'USAGE_UNAVAILABLE']);
      const g = await generate(c, { saree: 'stub:ok:down' });
      eq('a generation: the limit check lets it through (fails open), the service itself is unreachable: 502', g.status, 502);
      const csv = await admin('GET', `/clients/${c.id}/billing/usage-csv`);
      eq('the CSV download refuses with a plain sentence, not a crash', [csv.status, csv.body.error?.code], [503, 'USAGE_UNAVAILABLE']);
    } finally {
      await catalogService(SVC);
    }
  }

  await finish();
}

main().catch(async (err) => { console.error(err); process.exit(1); });
