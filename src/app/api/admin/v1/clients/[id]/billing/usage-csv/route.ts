import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { asAdmin, badRequest, monthParam, notFound } from '@/features/billing/catalog-billing.http';
import { monthSummary } from '@/features/billing/catalog-billing.service';
import { KIND_LABEL, isKind, paiseToRupees } from '@/features/billing/catalog-billing.pricing';

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  // Quote everything; neutralise spreadsheet formulas.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** The month's delivered runs, one row each, with the price each was charged at. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return asAdmin(async () => {
    const { id } = await params;
    const month = monthParam(req.nextUrl.searchParams.get('month'));
    if (!month) return badRequest('INVALID_MONTH', 'Choose a month as YYYY-MM.');
    const client = await prisma.client.findFirst({ where: { id, deletedAt: null }, select: { id: true, companyName: true } });
    if (!client) return notFound('Client not found.');

    const s = await monthSummary(id, month);
    const header = ['Delivered at (UTC)', 'Kind', 'Colour', 'Colour hex', 'Garment', 'Views', 'Request', 'Gateway request id', 'Price (Rs)'];
    const rows = s.runs.map((r) => [
      r.deliveredAt, isKind(r.kind) ? KIND_LABEL[r.kind] : r.kind, r.colourName, r.colourHex, r.garmentRef, r.views,
      r.requestKey, r.gatewayRequestId, r.amountPaise === null ? 'no price set' : paiseToRupees(r.amountPaise),
    ]);
    rows.push([]);
    rows.push(['Subtotal', '', '', '', '', '', '', '', paiseToRupees(s.totals.subtotalPaise)]);
    if (s.totals.gstEnabled) rows.push([`GST ${s.totals.gstRateBp / 100}%`, '', '', '', '', '', '', '', paiseToRupees(s.totals.gstPaise)]);
    rows.push(['Total', '', '', '', '', '', '', '', paiseToRupees(s.totals.totalPaise)]);

    const csv = [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
    const name = `${client.companyName.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'client'}-catalog-usage-${month}.csv`;
    return new Response(csv, {
      status: 200,
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' },
    });
  });
}
