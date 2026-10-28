import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/api/response';
import { asAdmin, badRequest, notFound } from '@/features/billing/catalog-billing.http';
import { updateSettings } from '@/features/billing/catalog-billing.service';
import { rupeesToPaise } from '@/features/billing/catalog-billing.pricing';

/**
 * Change a client's monthly limit and GST switch.
 * Body: { monthlyLimitRupees?: string | number | null (null = no limit), gstEnabled?: boolean }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return asAdmin(async (admin) => {
    const { id } = await params;
    const client = await prisma.client.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!client) return notFound('Client not found.');

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return badRequest('INVALID_BODY', 'Nothing to save.');

    const data: { monthlyLimitPaise?: number | null; gstEnabled?: boolean } = {};
    if ('monthlyLimitRupees' in body) {
      if (body.monthlyLimitRupees === null) data.monthlyLimitPaise = null;
      else {
        const paise = rupeesToPaise(body.monthlyLimitRupees);
        if (paise === null || paise < 100) return badRequest('INVALID_LIMIT', 'Enter a monthly limit of at least ₹1, like 5000, or choose no limit.');
        data.monthlyLimitPaise = paise;
      }
    }
    if ('gstEnabled' in body) {
      if (typeof body.gstEnabled !== 'boolean') return badRequest('INVALID_GST', 'GST must be switched on or off.');
      data.gstEnabled = body.gstEnabled;
    }
    if (!Object.keys(data).length) return badRequest('INVALID_BODY', 'Nothing to save.');

    const saved = await updateSettings(id, data, admin.id);
    return ok({ monthlyLimitPaise: saved.monthlyLimitPaise, gstEnabled: saved.gstEnabled, isDefault: false });
  }, { write: true });
}
