import { NextRequest } from 'next/server';
import { validateApiKey } from '@/lib/auth/api-key';
import { GatewayError, createErrorResponse } from '@/lib/gateway/errors';
import { BillingError, monthSummary } from '@/features/billing/catalog-billing.service';
import { isPeriod, paiseToRupees, periodOf } from '@/features/billing/catalog-billing.pricing';

/**
 * GET /api/v1/usage?month=YYYY-MM  (x-api-key: the client's own key)
 *
 * What the calling client will be billed for catalog generation this month (or
 * the month asked for): counts, the amount so far, GST, the monthly limit and the
 * delivered runs. Only ever the caller's own usage - the client comes from the key.
 * Amounts are given in paise (integers) and as rupee strings.
 */
export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const key = await validateApiKey(req.headers.get('x-api-key'));
    const month = req.nextUrl.searchParams.get('month') || periodOf(new Date());
    if (!isPeriod(month)) {
      return Response.json({ error: { code: 'INVALID_MONTH', message: 'month must be YYYY-MM.' } }, { status: 400, headers: { 'X-Request-ID': requestId } });
    }

    const s = await monthSummary(key.client.id, month);
    const money = (paise: number | null) => (paise === null ? null : { paise, rupees: paiseToRupees(paise) });
    return Response.json({
      month: s.period,
      from: s.from,
      to: s.to,
      currency: 'INR',
      catalogs: s.counts.CATALOG,
      colourVariants: s.counts.COLOUR_VARIANT,
      lines: s.lines.map((l) => ({ kind: l.kind, description: l.description, quantity: l.quantity, unitPrice: money(l.unitPaise), amount: money(l.amountPaise) })),
      subtotal: money(s.totals.subtotalPaise),
      gst: s.totals.gstEnabled ? { ratePercent: s.totals.gstRateBp / 100, amount: money(s.totals.gstPaise) } : null,
      total: money(s.totals.totalPaise),
      monthlyLimit: s.limit.monthlyLimitPaise === null ? null : {
        limit: money(s.limit.monthlyLimitPaise),
        used: money(s.limit.usedPaise),
        remaining: money(s.limit.remainingPaise),
        reached: s.limit.reached,
        note: 'The limit counts the amount before GST.',
      },
      runs: s.runs.map((r) => ({
        deliveredAt: r.deliveredAt,
        kind: r.kind,
        colourName: r.colourName,
        colourHex: r.colourHex,
        garmentRef: r.garmentRef,
        views: r.views,
        request: r.requestKey,
        price: money(r.amountPaise),
      })),
    }, { headers: { 'X-Request-ID': requestId, 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    if (err instanceof GatewayError) return createErrorResponse(err, requestId);
    if (err instanceof BillingError) {
      return Response.json({ error: { code: err.code, message: err.message } }, { status: err.statusCode, headers: { 'X-Request-ID': requestId } });
    }
    console.error('[Billing] /v1/usage failed:', err);
    return createErrorResponse(new Error('unexpected'), requestId);
  }
}
