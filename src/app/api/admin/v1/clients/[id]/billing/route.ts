import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/api/response';
import { asAdmin, badRequest, monthParam, notFound } from '@/features/billing/catalog-billing.http';
import { monthSummary } from '@/features/billing/catalog-billing.service';
import { DEFAULT_MONTHLY_LIMIT_PAISE } from '@/features/billing/catalog-billing.pricing';

/** A client's catalog billing: the month so far (or ?month=YYYY-MM), settings, client prices and bills. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return asAdmin(async () => {
    const { id } = await params;
    const month = monthParam(req.nextUrl.searchParams.get('month'));
    if (!month) return badRequest('INVALID_MONTH', 'Choose a month as YYYY-MM.');

    const client = await prisma.client.findFirst({ where: { id, deletedAt: null }, select: { id: true, companyName: true, email: true } });
    if (!client) return notFound('Client not found.');

    const [setting, clientPrices, bills] = await Promise.all([
      prisma.catalogBillingSetting.findUnique({ where: { clientId: id } }),
      prisma.catalogPrice.findMany({ where: { scope: 'CLIENT', clientId: id }, orderBy: { effectiveFrom: 'desc' } }),
      prisma.catalogBill.findMany({ where: { clientId: id }, orderBy: { period: 'desc' } }),
    ]);

    // Usage comes from the catalog service; if it cannot answer, the page still
    // shows settings, prices and bills, with one sentence about the usage.
    let summary = null;
    let usageError = null;
    try {
      summary = await monthSummary(id, month);
    } catch (err: any) {
      usageError = err?.code === 'USAGE_UNAVAILABLE' || err?.code === 'CATALOG_SERVICE_NOT_SET_UP'
        ? err.message
        : 'Usage could not be loaded right now. Try again in a minute.';
      if (!err?.code) console.error('[Billing] month summary failed:', err);
    }

    return ok({
      client,
      month,
      settings: {
        monthlyLimitPaise: setting ? setting.monthlyLimitPaise : DEFAULT_MONTHLY_LIMIT_PAISE,
        gstEnabled: setting ? setting.gstEnabled : true,
        isDefault: !setting,
      },
      clientPrices,
      bills,
      summary,
      usageError,
    });
  });
}
