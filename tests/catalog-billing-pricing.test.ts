/**
 * Catalog billing arithmetic: months in India time, which price a run gets,
 * bill lines, GST on top, and rupee parsing. Exact paise everywhere.
 */
import { describe, it, expect } from 'vitest';
import {
  PriceRow, UsageRun, buildLines, computeTotals, paiseToRupees, periodOf, periodRange,
  previousPeriod, priceRuns, resolvePrice, rupeesToPaise,
} from '../src/features/billing/catalog-billing.pricing';

const at = (iso: string) => new Date(iso);
const price = (p: Partial<PriceRow> & Pick<PriceRow, 'id' | 'kind' | 'amountPaise' | 'effectiveFrom'>): PriceRow =>
  ({ scope: 'PLAN', plan: 'DEFAULT', clientId: null, ...p });

const DEFAULTS = [
  price({ id: 'd-cat', kind: 'CATALOG', amountPaise: 10000, effectiveFrom: at('2025-12-31T18:30:00Z') }),
  price({ id: 'd-col', kind: 'COLOUR_VARIANT', amountPaise: 6000, effectiveFrom: at('2025-12-31T18:30:00Z') }),
];

const run = (id: string, kind: string, deliveredAt: string): UsageRun => ({
  id, clientId: 'c1', kind, requestKey: `req:${id}`, colourName: null, colourHex: null, garmentRef: null,
  views: 4, gatewayRequestId: null, deliveredAt,
});

describe('months are India time', () => {
  it('October 2026 runs from 30 Sep 18:30 UTC to 31 Oct 18:30 UTC', () => {
    const { start, end } = periodRange('2026-10');
    expect(start.toISOString()).toBe('2026-09-30T18:30:00.000Z');
    expect(end.toISOString()).toBe('2026-10-31T18:30:00.000Z');
  });
  it('00:30 on 1 November in India is November, though it is still 31 October in UTC', () => {
    expect(periodOf(at('2026-10-31T19:00:00Z'))).toBe('2026-11');
    expect(periodOf(at('2026-10-31T18:29:59Z'))).toBe('2026-10');
  });
  it('the month before January is December of the year before', () => {
    expect(previousPeriod('2027-01')).toBe('2026-12');
  });
});

describe('which price a run gets', () => {
  const prices = [
    ...DEFAULTS,
    price({ id: 'gold-cat', plan: 'GOLD', kind: 'CATALOG', amountPaise: 9000, effectiveFrom: at('2026-01-01T00:00:00Z') }),
    price({ id: 'c1-cat', scope: 'CLIENT', plan: null, clientId: 'c1', kind: 'CATALOG', amountPaise: 8000, effectiveFrom: at('2026-10-15T00:00:00Z') }),
  ];
  it('the default, for a client with no plan price and no price of their own', () => {
    expect(resolvePrice(prices, { clientId: 'c2', plan: null, kind: 'CATALOG', at: at('2026-10-20T00:00:00Z') })?.amountPaise).toBe(10000);
  });
  it('their plan price ahead of the default', () => {
    const p = resolvePrice(prices, { clientId: 'c2', plan: 'gold', kind: 'CATALOG', at: at('2026-10-20T00:00:00Z') });
    expect([p?.amountPaise, p?.source]).toEqual([9000, 'PLAN']);
  });
  it("the client's own price ahead of the plan, only once it has started", () => {
    expect(resolvePrice(prices, { clientId: 'c1', plan: 'GOLD', kind: 'CATALOG', at: at('2026-10-14T23:59:59Z') })?.amountPaise).toBe(9000);
    expect(resolvePrice(prices, { clientId: 'c1', plan: 'GOLD', kind: 'CATALOG', at: at('2026-10-15T00:00:00Z') })?.amountPaise).toBe(8000);
  });
  it('two prices starting at the same moment: the one set last wins, whatever their ids', () => {
    const t = at('2026-10-29T00:00:00Z');
    const same = [
      price({ id: 'zzz-set-first', scope: 'CLIENT', plan: null, clientId: 'c9', kind: 'CATALOG', amountPaise: 11000, effectiveFrom: t, createdAt: at('2026-10-28T10:00:00Z') }),
      price({ id: 'aaa-set-second', scope: 'CLIENT', plan: null, clientId: 'c9', kind: 'CATALOG', amountPaise: 11500, effectiveFrom: t, createdAt: at('2026-10-28T10:05:00Z') }),
    ];
    expect(resolvePrice(same, { clientId: 'c9', plan: null, kind: 'CATALOG', at: at('2026-10-29T06:00:00Z') })?.amountPaise).toBe(11500);
  });
  it('a kind with no price at all is unpriced, not free', () => {
    expect(resolvePrice(DEFAULTS, { clientId: 'c1', plan: null, kind: 'MEN_CATALOG', at: at('2026-10-20T00:00:00Z') })).toBeNull();
  });
});

describe('a bill', () => {
  it('prices each run at the price of its own moment: a mid-month change gives two lines', () => {
    const prices = [...DEFAULTS, price({ id: 'd-cat-2', kind: 'CATALOG', amountPaise: 12000, effectiveFrom: at('2026-10-16T00:00:00Z') })];
    const runs = [
      run('1', 'CATALOG', '2026-10-02T10:00:00Z'),
      run('2', 'CATALOG', '2026-10-10T10:00:00Z'),
      run('3', 'COLOUR_VARIANT', '2026-10-11T10:00:00Z'),
      run('4', 'CATALOG', '2026-10-20T10:00:00Z'),
    ];
    const { lines, unpriced } = buildLines(priceRuns(runs, prices, { clientId: 'c1', plan: null }));
    expect(unpriced).toBe(0);
    expect(lines).toEqual([
      { kind: 'CATALOG', description: 'Four-view catalog', quantity: 2, unitPaise: 10000, amountPaise: 20000 },
      { kind: 'CATALOG', description: 'Four-view catalog', quantity: 1, unitPaise: 12000, amountPaise: 12000 },
      { kind: 'COLOUR_VARIANT', description: 'Colour variant', quantity: 1, unitPaise: 6000, amountPaise: 6000 },
    ]);
    expect(computeTotals(lines, true)).toEqual({ subtotalPaise: 38000, gstEnabled: true, gstRateBp: 1800, gstPaise: 6840, totalPaise: 44840 });
  });

  it('GST is 18% on top, rounded to the paisa; nothing added when switched off', () => {
    const lines = [{ kind: 'CATALOG' as const, description: 'x', quantity: 1, unitPaise: 9999, amountPaise: 9999 }];
    expect(computeTotals(lines, true)).toEqual({ subtotalPaise: 9999, gstEnabled: true, gstRateBp: 1800, gstPaise: 1800, totalPaise: 11799 });
    expect(computeTotals(lines, false)).toEqual({ subtotalPaise: 9999, gstEnabled: false, gstRateBp: 0, gstPaise: 0, totalPaise: 9999 });
  });
});

describe('rupees and paise', () => {
  it('reads plain rupee amounts exactly', () => {
    expect(rupeesToPaise('100')).toBe(10000);
    expect(rupeesToPaise('99.5')).toBe(9950);
    expect(rupeesToPaise('1,250.05')).toBe(125005);
    expect(rupeesToPaise(60)).toBe(6000);
  });
  it('refuses what is not an amount', () => {
    for (const bad of ['', '-5', '1.234', 'abc', '1e3', null, undefined, '99999999']) expect(rupeesToPaise(bad)).toBeNull();
  });
  it('writes paise as exact rupee strings', () => {
    expect(paiseToRupees(44840)).toBe('448.40');
    expect(paiseToRupees(5)).toBe('0.05');
  });
});
