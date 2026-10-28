/**
 * Small helpers shared by the catalog billing API routes: the session check and
 * turning failures into one plain sentence (never a raw error).
 */
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth/authOptions';
import { BillingError } from './catalog-billing.service';
import { periodOf, isPeriod } from './catalog-billing.pricing';

export interface Admin { id: string | null; role: string | null }

type Handler = (admin: Admin) => Promise<Response>;

const fail = (status: number, code: string, message: string) =>
  NextResponse.json({ success: false, error: { code, message } }, { status });

/** Runs `handler` for a signed-in console user; `write` also refuses read-only (VIEWER) users. */
export async function asAdmin(handler: Handler, { write = false } = {}): Promise<Response> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return fail(401, 'UNAUTHORIZED', 'Please sign in again.');
  const admin: Admin = { id: (session.user as any).id || null, role: (session.user as any).role || null };
  if (write && admin.role === 'VIEWER') return fail(403, 'FORBIDDEN', 'Your role can view billing but not change it.');
  try {
    return await handler(admin);
  } catch (err: any) {
    if (err instanceof BillingError) return fail(err.statusCode, err.code, err.message);
    console.error('[Billing] request failed:', err);
    return fail(500, 'INTERNAL_ERROR', 'Something went wrong on our side. Please try again.');
  }
}

export const badRequest = (code: string, message: string) => fail(400, code, message);
export const notFound = (message: string) => fail(404, 'NOT_FOUND', message);

/** ?month=YYYY-MM, else this month (India time). */
export function monthParam(value: string | null): string | null {
  if (!value) return periodOf(new Date());
  return isPeriod(value) ? value : null;
}

/**
 * "YYYY-MM-DD" -> the start of that day in India time. Empty -> now.
 * Null when it is not a date.
 */
export function effectiveFromParam(value: unknown): Date | null {
  if (value === undefined || value === null || value === '') return new Date();
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : d;
}
