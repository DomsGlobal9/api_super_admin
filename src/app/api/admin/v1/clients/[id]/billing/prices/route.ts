import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { created } from '@/lib/api/response';
import { asAdmin, badRequest, effectiveFromParam, notFound } from '@/features/billing/catalog-billing.http';
import { addPrice } from '@/features/billing/catalog-billing.service';
import { isKind, rupeesToPaise } from '@/features/billing/catalog-billing.pricing';

/**
 * Set this client's own price for one kind, from a date on (ahead of their plan's).
 * Body: { kind: "CATALOG" | "COLOUR_VARIANT", amountRupees, effectiveFrom?: "YYYY-MM-DD" (India time; empty = now) }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return asAdmin(async (admin) => {
    const { id } = await params;
    const client = await prisma.client.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!client) return notFound('Client not found.');

    const body = await req.json().catch(() => ({}));
    if (!isKind(body.kind)) return badRequest('INVALID_KIND', 'Choose catalog or colour variant.');
    const amountPaise = rupeesToPaise(body.amountRupees);
    if (amountPaise === null) return badRequest('INVALID_AMOUNT', 'Enter a price in rupees, like 100 or 99.50.');
    const effectiveFrom = effectiveFromParam(body.effectiveFrom);
    if (!effectiveFrom) return badRequest('INVALID_DATE', 'Enter the start date as YYYY-MM-DD, or leave it empty to start now.');

    const price = await addPrice({ scope: 'CLIENT', clientId: id, kind: body.kind, amountPaise, effectiveFrom, adminId: admin.id });
    return created(price);
  }, { write: true });
}
