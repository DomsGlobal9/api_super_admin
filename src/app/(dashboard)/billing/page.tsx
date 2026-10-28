'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Receipt } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { billingApi } from '@/lib/api-client/billing';
import { KIND_LABEL, formatRupees, periodLabel, periodOf, previousPeriod } from '@/features/billing/catalog-billing.pricing';

const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm';
const button = 'inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50';
const primary = 'inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50';
const input = 'block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-white';

type Notice = { ok: boolean; text: string } | null;
const NoticeLine = ({ notice }: { notice: Notice }) => notice ? (
  <p className={`text-sm rounded-md px-3 py-2 ${notice.ok ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'}`}>{notice.text}</p>
) : null;

/** Catalog billing for every client: plan prices and the month-end bills. */
export default function CatalogBillingPage() {
  const lastMonth = previousPeriod(periodOf(new Date()));
  const [prices, setPrices] = useState<any[]>([]);
  const [plans, setPlans] = useState<string[]>(['DEFAULT']);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [plan, setPlan] = useState('DEFAULT');
  const [kind, setKind] = useState<'CATALOG' | 'COLOUR_VARIANT'>('CATALOG');
  const [amount, setAmount] = useState('');
  const [from, setFrom] = useState('');
  const [priceNotice, setPriceNotice] = useState<Notice>(null);

  const [month, setMonth] = useState(lastMonth);
  const [bills, setBills] = useState<any[]>([]);
  const [billNotice, setBillNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);

  const loadPrices = useCallback(async () => {
    try {
      const res = await billingApi.getPlanPrices();
      setPrices(res.prices);
      setPlans(res.plans);
    } catch (err: any) {
      setLoadError(err.message || 'Prices could not be loaded.');
    }
  }, []);
  const loadBills = useCallback(async () => {
    try { setBills((await billingApi.getBills(month)).bills); } catch { setBills([]); }
  }, [month]);

  useEffect(() => { loadPrices(); }, [loadPrices]);
  useEffect(() => { loadBills(); }, [loadBills]);

  const savePrice = async () => {
    setBusy(true);
    try {
      await billingApi.addPlanPrice({ plan, kind, amountRupees: amount, effectiveFrom: from || undefined });
      setPriceNotice({ ok: true, text: `${KIND_LABEL[kind]} price for ${plan === 'DEFAULT' ? 'every plan' : `the ${plan} plan`} saved.` });
      setAmount(''); setFrom('');
      await loadPrices();
    } catch (err: any) {
      setPriceNotice({ ok: false, text: err.message || 'The price was not saved. Please try again.' });
    } finally { setBusy(false); }
  };

  const makeBills = async () => {
    setBusy(true);
    try {
      const res = await billingApi.makeBills(month);
      const made = res.bills.filter((b: any) => b.created).length;
      setBillNotice({ ok: true, text: res.bills.length === 0 ? `No client had delivered runs in ${periodLabel(month)}.` : `${made} new bill${made === 1 ? '' : 's'} made; ${res.bills.length - made} already existed.` });
      await loadBills();
    } catch (err: any) {
      setBillNotice({ ok: false, text: err.message || 'The bills were not made. Please try again.' });
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader title="Catalog billing" description="What third parties pay for four-view catalogs and colour variants. Per-client prices, limits, usage and bills are on each client's Billing tab." />
      {loadError && <p className="text-sm rounded-md px-3 py-2 bg-red-50 text-red-700">{loadError}</p>}

      <section className={card}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-base font-medium text-gray-900 dark:text-white">Plan prices</h3>
          <p className="mt-1 text-sm text-gray-500">The DEFAULT price applies to any client whose plan has no price of its own. A client&apos;s own price comes first. Prices are before GST.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-gray-500"><tr><th className="px-6 py-2 font-medium">Plan</th><th className="px-3 py-2 font-medium">Kind</th><th className="px-3 py-2 font-medium">From</th><th className="px-3 py-2 font-medium text-right">Price</th><th className="px-6 py-2 font-medium">Note</th></tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {prices.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-2">{p.plan}</td>
                  <td className="px-3 py-2">{KIND_LABEL[p.kind as 'CATALOG'] || p.kind}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(p.effectiveFrom).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className="px-3 py-2 text-right">{formatRupees(p.amountPaise)}</td>
                  <td className="px-6 py-2 text-xs text-gray-500">{p.note || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
          <p className="text-sm font-medium text-gray-900 dark:text-white">Set a plan price</p>
          <div className="flex flex-wrap gap-2">
            {plans.map((p) => <button key={p} type="button" className={plan === p ? primary : button} onClick={() => setPlan(p)}>{p === 'DEFAULT' ? 'Every plan (DEFAULT)' : p}</button>)}
          </div>
          <div className="flex gap-2">
            {(['CATALOG', 'COLOUR_VARIANT'] as const).map((k) => <button key={k} type="button" className={kind === k ? primary : button} onClick={() => setKind(k)}>{KIND_LABEL[k]}</button>)}
          </div>
          <div className="grid grid-cols-2 gap-3 max-w-lg">
            <label className="text-sm text-gray-600 dark:text-gray-400">Price in ₹, before GST<input className={input} inputMode="decimal" placeholder="100" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
            <label className="text-sm text-gray-600 dark:text-gray-400">Starts on (empty = now)<input className={input} type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          </div>
          <button className={primary} disabled={busy || !amount} onClick={savePrice}>Set price</button>
          <NoticeLine notice={priceNotice} />
        </div>
      </section>

      <section className={card}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-medium text-gray-900 dark:text-white">Month-end bills</h3>
            <p className="mt-1 text-sm text-gray-500">Makes one bill for every client with delivered runs in a finished month. Safe to press again: no client ever gets two bills for one month.</p>
          </div>
          <div className="flex items-end gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Month<input className={input} type="month" max={lastMonth} value={month} onChange={(e) => setMonth(e.target.value)} /></label>
            <button className={primary} disabled={busy || !month} onClick={makeBills}><Receipt className="mr-2 h-4 w-4" />Make bills</button>
          </div>
        </div>
        <div className="px-6 pt-3"><NoticeLine notice={billNotice} /></div>
        {bills.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-500 text-center">No bills for {month ? periodLabel(month) : 'this month'} yet.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="text-left text-gray-500"><tr><th className="px-6 py-2 font-medium">Client</th><th className="px-3 py-2 font-medium">Bill</th><th className="px-3 py-2 font-medium text-right">Total</th><th className="px-6 py-2 font-medium">Status</th></tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {bills.map((b) => (
                <tr key={b.id}>
                  <td className="px-6 py-2"><Link className="text-indigo-600 hover:underline" href={`/clients/${b.clientId}/billing`}>{b.client?.companyName || b.clientId}</Link></td>
                  <td className="px-3 py-2 font-mono text-xs">{b.number}</td>
                  <td className="px-3 py-2 text-right">{formatRupees(b.totalPaise)}</td>
                  <td className="px-6 py-2">{b.status.charAt(0) + b.status.slice(1).toLowerCase()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
