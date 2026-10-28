import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/api/response';
import { asAdmin, badRequest } from '@/features/billing/catalog-billing.http';
import { generateBillsForPeriod } from '@/features/billing/catalog-billing.service';
import { isPeriod, periodOf, previousPeriod } from '@/features/billing/catalog-billing.pricing';

/** Bills made for a month (?month=YYYY-MM, default last month), every client. */
export async function GET(req: NextRequest) {
  return asAdmin(async () => {
    const month = req.nextUrl.searchParams.get('month') || previousPeriod(periodOf(new Date()));
    if (!isPeriod(month)) return badRequest('INVALID_MONTH', 'Choose a month as YYYY-MM.');
    const bills = await prisma.catalogBill.findMany({
      where: { period: month },
      include: { client: { select: { companyName: true } } },
      orderBy: { number: 'asc' },
    });
    return ok({ month, bills });
  });
}

/** Make the bills for a finished month for every client with delivered runs. Body: { month }. Safe to repeat. */
export async function POST(req: NextRequest) {
  return asAdmin(async (admin) => {
    const body = await req.json().catch(() => ({}));
    if (!isPeriod(body.month)) return badRequest('INVALID_MONTH', 'Choose a month as YYYY-MM.');
    return ok(await generateBillsForPeriod(body.month, admin.id));
  }, { write: true });
}
