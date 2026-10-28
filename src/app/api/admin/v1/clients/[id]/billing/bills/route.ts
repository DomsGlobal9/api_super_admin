import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { asAdmin, badRequest, notFound } from '@/features/billing/catalog-billing.http';
import { generateBill } from '@/features/billing/catalog-billing.service';
import { isPeriod } from '@/features/billing/catalog-billing.pricing';

/**
 * Make this client's bill for a finished month. Body: { month: "YYYY-MM" }.
 * Doing it again never makes a second bill: a draft is refreshed, a sent or
 * paid bill is returned unchanged. 201 when it was made now, 200 otherwise.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return asAdmin(async (admin) => {
    const { id } = await params;
    const client = await prisma.client.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!client) return notFound('Client not found.');
    const body = await req.json().catch(() => ({}));
    if (!isPeriod(body.month)) return badRequest('INVALID_MONTH', 'Choose a month as YYYY-MM.');

    const result = await generateBill(id, body.month, admin.id);
    return NextResponse.json({ success: true, data: { ...result.bill, created: result.created } }, { status: result.created ? 201 : 200 });
  }, { write: true });
}
