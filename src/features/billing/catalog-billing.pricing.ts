/**
 * Catalog billing - the arithmetic. Pure functions only (no database, no network),
 * so every rupee on a bill can be pinned by a unit test.
 *
 * Money is whole paise (integers) everywhere; rupees appear only when shown.
 * Months are calendar months in India time (UTC+05:30, no daylight saving), so a
 * run delivered at 00:30 on 1 November in India is November's, not October's.
 */

export const KINDS = ['CATALOG', 'COLOUR_VARIANT'] as const;
export type RunKind = (typeof KINDS)[number];

export const KIND_LABEL: Record<RunKind, string> = {
  CATALOG: 'Four-view catalog',
  COLOUR_VARIANT: 'Colour variant',
};

/** 18% GST, in basis points. Added on top of the prices when a client's GST switch is on. */
export const GST_RATE_BP = 1800;

/** Placeholder monthly limit for a client with no setting of their own: Rs 5,000. */
export const DEFAULT_MONTHLY_LIMIT_PAISE = 500000;

/** The plan name whose prices apply to any client without a price of their own or of their plan. */
export const DEFAULT_PLAN = 'DEFAULT';

const IST_OFFSET_MS = 330 * 60 * 1000;
const PERIOD = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isKind(value: unknown): value is RunKind {
  return typeof value === 'string' && (KINDS as readonly string[]).includes(value);
}

/**
 * GST rule (documented): 18% of the month's subtotal, rounded ONCE to the nearest
 * paisa (half up). It is never rounded per run, so a bill's GST cannot drift by a
 * paisa from what the subtotal says.
 */

/** "2026-10" -> the instants that month starts and ends in India time. */
export function periodRange(period: string): { start: Date; end: Date } {
  const m = PERIOD.exec(period);
  if (!m) throw new Error(`Not a month: ${period}`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const start = new Date(Date.UTC(year, month - 1, 1) - IST_OFFSET_MS);
  const end = new Date(Date.UTC(year, month, 1) - IST_OFFSET_MS);
  return { start, end };
}

export function isPeriod(value: unknown): value is string {
  return typeof value === 'string' && PERIOD.test(value);
}

/** The India-time month an instant falls in, as "YYYY-MM". */
export function periodOf(at: Date): string {
  const ist = new Date(at.getTime() + IST_OFFSET_MS);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function previousPeriod(period: string): string {
  const { start } = periodRange(period);
  return periodOf(new Date(start.getTime() - 1));
}

/** "2026-10" -> "October 2026". */
export function periodLabel(period: string): string {
  const { start } = periodRange(period);
  return new Date(start.getTime() + IST_OFFSET_MS).toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export interface PriceRow {
  id: string;
  scope: string; // PLAN | CLIENT
  plan: string | null;
  clientId: string | null;
  kind: string;
  amountPaise: number;
  effectiveFrom: Date;
  createdAt?: Date; // breaks a tie between prices starting at the same moment: set last wins
}

export type PriceSource = 'CLIENT' | 'PLAN' | 'DEFAULT';

export interface ResolvedPrice {
  amountPaise: number;
  source: PriceSource;
  priceId: string;
  effectiveFrom: Date;
}

/**
 * The price of one run of `kind` delivered at `at`: this client's own price if
 * one had taken effect by then, else their plan's, else the DEFAULT plan's.
 * Within a level the latest price that had taken effect wins. Null = no price.
 */
export function resolvePrice(
  prices: PriceRow[],
  ctx: { clientId: string; plan: string | null; kind: string; at: Date }
): ResolvedPrice | null {
  const latest = (match: (p: PriceRow) => boolean) => {
    let best: PriceRow | null = null;
    for (const p of prices) {
      if (p.kind !== ctx.kind || !match(p)) continue;
      if (p.effectiveFrom.getTime() > ctx.at.getTime()) continue;
      if (!best || p.effectiveFrom.getTime() > best.effectiveFrom.getTime()) { best = p; continue; }
      if (p.effectiveFrom.getTime() === best.effectiveFrom.getTime()) {
        const pc = p.createdAt ? p.createdAt.getTime() : 0;
        const bc = best.createdAt ? best.createdAt.getTime() : 0;
        if (pc > bc || (pc === bc && p.id > best.id)) best = p;
      }
    }
    return best;
  };
  const plan = ctx.plan ? ctx.plan.toUpperCase() : null;
  const levels: [PriceSource, (p: PriceRow) => boolean][] = [
    ['CLIENT', (p) => p.scope === 'CLIENT' && p.clientId === ctx.clientId],
    ['PLAN', (p) => !!plan && plan !== DEFAULT_PLAN && p.scope === 'PLAN' && (p.plan || '').toUpperCase() === plan],
    ['DEFAULT', (p) => p.scope === 'PLAN' && (p.plan || '').toUpperCase() === DEFAULT_PLAN],
  ];
  for (const [source, match] of levels) {
    const hit = latest(match);
    if (hit) return { amountPaise: hit.amountPaise, source, priceId: hit.id, effectiveFrom: hit.effectiveFrom };
  }
  return null;
}

export interface UsageRun {
  id: string;
  clientId: string;
  kind: string;
  requestKey: string;
  colourName: string | null;
  colourHex: string | null;
  garmentRef: string | null;
  views: number;
  gatewayRequestId: string | null;
  deliveredAt: string;
}

export interface PricedRun extends UsageRun {
  amountPaise: number | null; // null = no price set for this kind
  priceSource: PriceSource | null;
}

export function priceRuns(runs: UsageRun[], prices: PriceRow[], ctx: { clientId: string; plan: string | null }): PricedRun[] {
  return runs.map((run) => {
    const price = isKind(run.kind)
      ? resolvePrice(prices, { ...ctx, kind: run.kind, at: new Date(run.deliveredAt) })
      : null;
    return { ...run, amountPaise: price ? price.amountPaise : null, priceSource: price ? price.source : null };
  });
}

export interface BillLine {
  kind: RunKind;
  description: string;
  quantity: number;
  unitPaise: number;
  amountPaise: number;
}

/**
 * One line per kind per price: a price change mid-month gives two lines for that
 * kind, each at the price its runs were delivered under. Runs with no price, or
 * of a kind that is not charged, are left out (and counted as `unpriced`).
 */
export function buildLines(priced: PricedRun[]): { lines: BillLine[]; unpriced: number } {
  const groups = new Map<string, BillLine>();
  let unpriced = 0;
  for (const run of priced) {
    if (!isKind(run.kind) || run.amountPaise === null) { unpriced += 1; continue; }
    const key = `${KINDS.indexOf(run.kind)}|${run.amountPaise}`;
    const line = groups.get(key) || { kind: run.kind, description: KIND_LABEL[run.kind], quantity: 0, unitPaise: run.amountPaise, amountPaise: 0 };
    line.quantity += 1;
    line.amountPaise += run.amountPaise;
    groups.set(key, line);
  }
  const lines = [...groups.entries()]
    .sort(([a], [b]) => {
      const [ka, pa] = a.split('|').map(Number);
      const [kb, pb] = b.split('|').map(Number);
      return ka - kb || pa - pb;
    })
    .map(([, line]) => line);
  return { lines, unpriced };
}

export interface Totals {
  subtotalPaise: number;
  gstEnabled: boolean;
  gstRateBp: number;
  gstPaise: number;
  totalPaise: number;
}

/** GST is added on top, rounded to the nearest paisa; off when the client's switch is off. */
export function computeTotals(lines: BillLine[], gstEnabled: boolean): Totals {
  const subtotalPaise = lines.reduce((sum, l) => sum + l.amountPaise, 0);
  const gstRateBp = gstEnabled ? GST_RATE_BP : 0;
  const gstPaise = gstEnabled ? Math.round((subtotalPaise * GST_RATE_BP) / 10000) : 0;
  return { subtotalPaise, gstEnabled, gstRateBp, gstPaise, totalPaise: subtotalPaise + gstPaise };
}

/** 123456 -> "1234.56" (exact, for APIs and CSV). */
export function paiseToRupees(paise: number): string {
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** 123456 -> "₹1,234.56" (Indian grouping, for people). */
export function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * "100", "99.5", "1,250.00" -> paise. Null when it is not a plain amount of
 * rupees with at most two decimals, between 0 and Rs 10,00,000.
 */
export function rupeesToPaise(input: unknown): number | null {
  if (typeof input === 'number') input = String(input);
  if (typeof input !== 'string') return null;
  const text = input.replace(/[,\s₹]/g, '');
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(text)) return null;
  const [whole, frac = ''] = text.split('.');
  const paise = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  return paise <= 100000000 ? paise : null;
}
