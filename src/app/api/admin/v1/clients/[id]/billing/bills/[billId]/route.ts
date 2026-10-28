import { NextRequest } from 'next/server';
import { ok } from '@/lib/api/response';
import { asAdmin } from '@/features/billing/catalog-billing.http';
import { setBillStatus } from '@/features/billing/catalog-billing.service';

/** Mark a bill Draft, Sent or Paid. Body: { status }. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; billId: string }> }) {
  return asAdmin(async () => {
    const { id, billId } = await params;
    const body = await req.json().catch(() => ({}));
    return ok(await setBillStatus(billId, id, String(body.status || '')));
  }, { write: true });
}
