import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { created, ok } from '@/lib/api/response';
import { asAdmin, badRequest, effectiveFromParam } from '@/features/billing/catalog-billing.http';
import { addPrice } from '@/features/billing/catalog-billing.service';
import { DEFAULT_PLAN, isKind, rupeesToPaise } from '@/features/billing/catalog-billing.pricing';

/** Plan prices (DEFAULT applies to any plan without its own), newest first, plus the plan names in use. */
export async function GET() {
  return asAdmin(async () => {
    const [prices, plans] = await Promise.all([
      prisma.catalogPrice.findMany({ where: { scope: 'PLAN' }, orderBy: [{ plan: 'asc' }, { effectiveFrom: 'desc' }] }),
      prisma.subscription.findMany({ distinct: ['plan'], select: { plan: true } }),
    ]);
    const planNames = [...new Set([DEFAULT_PLAN, ...plans.map((p) => p.plan.toUpperCase())])];
    return ok({ prices, plans: planNames });
  });
}

/**
 * Set a plan's price for one kind, from a date on.
 * Body: { plan: "DEFAULT" | plan name, kind, amountRupees, effectiveFrom?: "YYYY-MM-DD" }
 */
export async function POST(req: NextRequest) {
  return asAdmin(async (admin) => {
    const body = await req.json().catch(() => ({}));
    const plan = typeof body.plan === 'string' && /^[A-Za-z0-9 _-]{1,40}$/.test(body.plan.trim()) ? body.plan.trim().toUpperCase() : null;
    if (!plan) return badRequest('INVALID_PLAN', 'Choose a plan.');
    if (!isKind(body.kind)) return badRequest('INVALID_KIND', 'Choose catalog or colour variant.');
    const amountPaise = rupeesToPaise(body.amountRupees);
    if (amountPaise === null) return badRequest('INVALID_AMOUNT', 'Enter a price in rupees, like 100 or 99.50.');
    const effectiveFrom = effectiveFromParam(body.effectiveFrom);
    if (!effectiveFrom) return badRequest('INVALID_DATE', 'Enter the start date as YYYY-MM-DD, or leave it empty to start now.');
    return created(await addPrice({ scope: 'PLAN', plan, kind: body.kind, amountPaise, effectiveFrom, adminId: admin.id }));
  }, { write: true });
}
