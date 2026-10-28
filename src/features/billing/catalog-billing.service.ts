/**
 * Catalog billing - charging third parties per delivered catalog / colour variant.
 *
 * Who decides what:
 *   - The catalog service records each FULLY delivered run, once
 *     (se_catalog.billable_runs) and answers GET /internal/billing/usage.
 *   - This module owns the money: prices (per plan, overridable per client,
 *     effective-dated), the monthly limit, GST and the monthly bill.
 *
 * The catalog service is reached the same way the gateway proxies to it: the
 * PRODUCTION environment of the microservice whose slug is
 * CATALOG_BILLING_SERVICE_SLUG (default "cat"), with that environment's internal
 * service key. Our own calls never carry x-gateway-client-id, which is how the
 * service tells them apart from proxied third-party traffic.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  DEFAULT_MONTHLY_LIMIT_PAISE, DEFAULT_PLAN, KINDS, RunKind, PriceRow, UsageRun,
  buildLines, computeTotals, isKind, periodOf, periodRange, priceRuns, resolvePrice,
} from './catalog-billing.pricing';

export const CATALOG_SERVICE_SLUG = process.env.CATALOG_BILLING_SERVICE_SLUG || 'cat';
const USAGE_TIMEOUT_MS = Number(process.env.CATALOG_BILLING_USAGE_TIMEOUT_MS || 8000);

export const BILL_STATUSES = ['DRAFT', 'SENT', 'PAID'] as const;
export type BillStatus = (typeof BILL_STATUSES)[number];

/** A refusal or failure with a sentence fit to show the owner as it is. */
export class BillingError extends Error {
  constructor(public readonly code: string, message: string, public readonly statusCode = 400) {
    super(message);
    this.name = 'BillingError';
  }
}

interface ServiceTarget { targetUrl: string; internalSecret: string | null }

async function catalogServiceTarget(): Promise<ServiceTarget> {
  const ms = await prisma.microservice.findUnique({
    where: { slug: CATALOG_SERVICE_SLUG },
    include: { environments: { where: { environment: 'PRODUCTION' } } },
  });
  const env = ms?.environments[0];
  if (!env) {
    throw new BillingError('CATALOG_SERVICE_NOT_SET_UP', 'The catalog service is not set up in the Gateway, so its usage cannot be read.', 503);
  }
  return { targetUrl: env.targetUrl, internalSecret: env.internalSecret };
}

export interface ServiceUsage {
  totals: Record<string, number>;
  garments: { clientId: string; garmentRef: string | null; catalogs: number; colourVariants: number; colours: string[] }[];
  runs: UsageRun[];
}

/** Delivered runs in [from, to) from the catalog service, for one client or all. */
export async function fetchUsage(
  params: { clientId?: string; from: Date; to: Date },
  target?: ServiceTarget
): Promise<ServiceUsage> {
  const t = target || await catalogServiceTarget();
  const base = t.targetUrl.endsWith('/') ? t.targetUrl.slice(0, -1) : t.targetUrl;
  const qs = new URLSearchParams({ from: params.from.toISOString(), to: params.to.toISOString() });
  if (params.clientId) qs.set('clientId', params.clientId);
  const headers: Record<string, string> = { accept: 'application/json' };
  if (t.internalSecret) headers['x-api-key'] = t.internalSecret;

  let res: Response;
  try {
    res = await fetch(`${base}/internal/billing/usage?${qs}`, { headers, signal: AbortSignal.timeout(USAGE_TIMEOUT_MS), cache: 'no-store' });
  } catch (err: any) {
    console.error('[Billing] catalog service usage unreachable:', err?.message || err);
    throw new BillingError('USAGE_UNAVAILABLE', 'The catalog service did not answer, so usage cannot be shown right now. Try again in a minute.', 503);
  }
  if (!res.ok) {
    console.error(`[Billing] catalog service usage answered ${res.status}`);
    throw new BillingError('USAGE_UNAVAILABLE', 'The catalog service could not report usage right now. Try again in a minute.', 503);
  }
  const body = await res.json();
  return { totals: body.totals || {}, garments: body.garments || [], runs: body.runs || [] };
}

/** The plan name that picks a client's plan prices: their newest ACTIVE subscription's. */
async function clientPlan(clientId: string): Promise<string | null> {
  const sub = await prisma.subscription.findFirst({
    where: { clientId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    select: { plan: true },
  });
  return sub?.plan ? sub.plan.toUpperCase() : null;
}

export interface ClientTerms {
  plan: string | null;
  monthlyLimitPaise: number | null;
  gstEnabled: boolean;
  prices: PriceRow[];
}

export async function clientTerms(clientId: string): Promise<ClientTerms> {
  const [plan, setting] = await Promise.all([
    clientPlan(clientId),
    prisma.catalogBillingSetting.findUnique({ where: { clientId } }),
  ]);
  const planNames = [DEFAULT_PLAN, ...(plan && plan !== DEFAULT_PLAN ? [plan] : [])];
  const prices = await prisma.catalogPrice.findMany({
    where: { OR: [{ scope: 'CLIENT', clientId }, { scope: 'PLAN', plan: { in: planNames, mode: 'insensitive' } }] },
  });
  return {
    plan,
    monthlyLimitPaise: setting ? setting.monthlyLimitPaise : DEFAULT_MONTHLY_LIMIT_PAISE,
    gstEnabled: setting ? setting.gstEnabled : true,
    prices,
  };
}

function priceSummary(terms: ClientTerms, clientId: string, at: Date) {
  const out: Record<string, { amountPaise: number; source: string; effectiveFrom: string } | null> = {};
  for (const kind of KINDS) {
    const p = resolvePrice(terms.prices, { clientId, plan: terms.plan, kind, at });
    out[kind] = p ? { amountPaise: p.amountPaise, source: p.source, effectiveFrom: p.effectiveFrom.toISOString() } : null;
  }
  return out;
}

/** A client's month: counts, priced runs, bill lines, totals and where they stand against the limit. */
export async function monthSummary(clientId: string, period: string, target?: ServiceTarget) {
  const { start, end } = periodRange(period);
  const [terms, usage] = await Promise.all([clientTerms(clientId), fetchUsage({ clientId, from: start, to: end }, target)]);
  const runs = priceRuns(usage.runs, terms.prices, { clientId, plan: terms.plan });
  const { lines, unpriced } = buildLines(runs);
  const totals = computeTotals(lines, terms.gstEnabled);
  const counts = { CATALOG: 0, COLOUR_VARIANT: 0 } as Record<RunKind, number>;
  for (const r of runs) if (isKind(r.kind)) counts[r.kind] += 1;
  const limit = terms.monthlyLimitPaise;
  return {
    period,
    from: start.toISOString(),
    to: end.toISOString(),
    plan: terms.plan,
    gstEnabled: terms.gstEnabled,
    currentPrices: priceSummary(terms, clientId, new Date()),
    counts,
    lines,
    unpriced,
    totals,
    limit: {
      monthlyLimitPaise: limit,
      usedPaise: totals.subtotalPaise,
      remainingPaise: limit === null ? null : Math.max(0, limit - totals.subtotalPaise),
      reached: limit !== null && totals.subtotalPaise >= limit,
    },
    garments: usage.garments,
    runs,
  };
}

export const LIMIT_REACHED_MESSAGE = "This month's limit is reached. Ask ScaleEzy to raise it.";

/**
 * May this client start another paid run this month? Asked by the gateway BEFORE
 * forwarding a generation, so a refusal costs no AI work. The limit is on the
 * amount before GST. Fails OPEN: if usage cannot be read the run is allowed (the
 * generation itself still needs the same service), and the reason is logged.
 */
export async function checkMonthlyLimit(
  clientId: string,
  target: ServiceTarget
): Promise<{ allowed: boolean; usedPaise?: number; monthlyLimitPaise?: number | null }> {
  try {
    const setting = await prisma.catalogBillingSetting.findUnique({ where: { clientId } });
    const limit = setting ? setting.monthlyLimitPaise : DEFAULT_MONTHLY_LIMIT_PAISE;
    if (limit === null) return { allowed: true, monthlyLimitPaise: null };
    const summary = await monthSummary(clientId, periodOf(new Date()), target);
    return { allowed: !summary.limit.reached, usedPaise: summary.limit.usedPaise, monthlyLimitPaise: limit };
  } catch (err: any) {
    console.error(`[Billing] monthly limit check failed for ${clientId}, allowing the run:`, err?.message || err);
    return { allowed: true };
  }
}

// ── Prices and settings ──────────────────────────────────────────────────────

function assertEffectiveFrom(effectiveFrom: Date) {
  // Past months are closed: a price may start no earlier than this month (India
  // time), so a change can never re-price a month that is already billed.
  const thisMonth = periodRange(periodOf(new Date())).start;
  if (effectiveFrom.getTime() < thisMonth.getTime()) {
    throw new BillingError('PRICE_IN_PAST_MONTH', 'A new price can start this month or later, not in a past month.');
  }
}

export async function addPrice(input: {
  scope: 'PLAN' | 'CLIENT'; plan?: string | null; clientId?: string | null; kind: RunKind;
  amountPaise: number; effectiveFrom: Date; note?: string | null; adminId?: string | null;
}) {
  assertEffectiveFrom(input.effectiveFrom);
  return prisma.catalogPrice.create({
    data: {
      scope: input.scope,
      plan: input.scope === 'PLAN' ? (input.plan || DEFAULT_PLAN).toUpperCase() : null,
      clientId: input.scope === 'CLIENT' ? input.clientId! : null,
      kind: input.kind,
      amountPaise: input.amountPaise,
      effectiveFrom: input.effectiveFrom,
      note: input.note || null,
      createdById: input.adminId || null,
    },
  });
}

export async function updateSettings(clientId: string, data: { monthlyLimitPaise?: number | null; gstEnabled?: boolean }, adminId?: string | null) {
  return prisma.catalogBillingSetting.upsert({
    where: { clientId },
    create: {
      clientId,
      monthlyLimitPaise: data.monthlyLimitPaise === undefined ? DEFAULT_MONTHLY_LIMIT_PAISE : data.monthlyLimitPaise,
      gstEnabled: data.gstEnabled === undefined ? true : data.gstEnabled,
      updatedById: adminId || null,
    },
    update: { ...data, updatedById: adminId || null },
  });
}

// ── Bills ────────────────────────────────────────────────────────────────────

function billNumber(clientId: string, period: string) {
  return `CAT-${period.replace('-', '')}-${clientId.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase()}`;
}

/**
 * Make (or refresh) a client's bill for a finished month. Unique per client and
 * month, so doing it twice - or twice at once - never makes a second bill. A
 * DRAFT is refreshed from the current usage; a SENT or PAID bill is returned as
 * it is and never changed.
 */
export async function generateBill(clientId: string, period: string, adminId?: string | null, target?: ServiceTarget) {
  const { start, end } = periodRange(period);
  if (end.getTime() > Date.now()) {
    throw new BillingError('MONTH_NOT_OVER', 'This month is not over yet. Bills are made once a month has ended.');
  }
  const existing = await prisma.catalogBill.findUnique({ where: { clientId_period: { clientId, period } } });
  if (existing && existing.status !== 'DRAFT') return { bill: existing, created: false };

  const s = await monthSummary(clientId, period, target);
  const data = {
    periodStart: start,
    periodEnd: end,
    lines: s.lines as unknown as Prisma.InputJsonValue,
    runCount: s.lines.reduce((n, l) => n + l.quantity, 0),
    subtotalPaise: s.totals.subtotalPaise,
    gstEnabled: s.totals.gstEnabled,
    gstRateBp: s.totals.gstRateBp,
    gstPaise: s.totals.gstPaise,
    totalPaise: s.totals.totalPaise,
  };

  if (existing) {
    // Only a draft is refreshed, and only while it is still a draft.
    const updated = await prisma.catalogBill.updateMany({ where: { id: existing.id, status: 'DRAFT' }, data: { ...data, generatedAt: new Date() } });
    const bill = await prisma.catalogBill.findUniqueOrThrow({ where: { id: existing.id } });
    return { bill, created: false, refreshed: updated.count === 1 };
  }
  try {
    const bill = await prisma.catalogBill.create({
      data: { ...data, clientId, period, number: billNumber(clientId, period), createdById: adminId || null },
    });
    return { bill, created: true };
  } catch (err: any) {
    if (err?.code === 'P2002') {
      // Made by a concurrent request a moment ago: that one is THE bill.
      const bill = await prisma.catalogBill.findUniqueOrThrow({ where: { clientId_period: { clientId, period } } });
      return { bill, created: false };
    }
    throw err;
  }
}

/** Bills for every client with delivered runs in a finished month. */
export async function generateBillsForPeriod(period: string, adminId?: string | null) {
  const { start, end } = periodRange(period);
  if (end.getTime() > Date.now()) {
    throw new BillingError('MONTH_NOT_OVER', 'This month is not over yet. Bills are made once a month has ended.');
  }
  const target = await catalogServiceTarget();
  const usage = await fetchUsage({ from: start, to: end }, target);
  const clientIds = [...new Set(usage.runs.map((r) => r.clientId))];
  const known = await prisma.client.findMany({ where: { id: { in: clientIds } }, select: { id: true } });
  const results = [];
  for (const { id } of known) {
    const r = await generateBill(id, period, adminId, target);
    results.push({ clientId: id, billId: r.bill.id, number: r.bill.number, created: r.created, status: r.bill.status, totalPaise: r.bill.totalPaise });
  }
  return { period, bills: results, unknownClients: clientIds.length - known.length };
}

const NEXT_STATUS: Record<BillStatus, BillStatus[]> = {
  DRAFT: ['SENT'],
  SENT: ['PAID', 'DRAFT'],
  PAID: ['SENT'],
};

export async function setBillStatus(billId: string, clientId: string, status: string) {
  if (!(BILL_STATUSES as readonly string[]).includes(status)) {
    throw new BillingError('INVALID_STATUS', 'A bill can be Draft, Sent or Paid.');
  }
  const bill = await prisma.catalogBill.findFirst({ where: { id: billId, clientId } });
  if (!bill) throw new BillingError('BILL_NOT_FOUND', 'That bill was not found.', 404);
  if (bill.status === status) return bill;
  if (!NEXT_STATUS[bill.status as BillStatus]?.includes(status as BillStatus)) {
    throw new BillingError('INVALID_STATUS_CHANGE', `A ${bill.status.toLowerCase()} bill cannot be marked ${status.toLowerCase()}.`);
  }
  const now = new Date();
  return prisma.catalogBill.update({
    where: { id: billId },
    data: {
      status,
      sentAt: status === 'SENT' ? (bill.sentAt || now) : status === 'DRAFT' ? null : bill.sentAt,
      paidAt: status === 'PAID' ? now : null,
    },
  });
}
