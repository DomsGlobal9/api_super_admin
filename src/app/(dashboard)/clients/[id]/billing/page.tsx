'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, FileText, Receipt } from 'lucide-react';
import { billingApi } from '@/lib/api-client/billing';
import { KIND_LABEL, formatRupees, periodLabel, periodOf, previousPeriod } from '@/features/billing/catalog-billing.pricing';

const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm';
const button = 'inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50';
const primary = 'inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50';
const input = 'block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-white';

function nextPeriod(period: string) {
  const [y, m] = period.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

/** A big month has thousands of runs; the page lists the latest, the CSV has every one. */
const RUN_ROWS_SHOWN = 200;

const SOURCE_LABEL: Record<string, string> = {
  CLIENT: "This client's own price",
  PLAN: 'Their plan price',
  DEFAULT: 'Default for every plan',
};

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  SENT: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  PAID: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
};

function Notice({ notice }: { notice: { ok: boolean; text: string } | null }) {
  if (!notice) return null;
  return (
    <p className={`text-sm rounded-md px-3 py-2 ${notice.ok ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'}`}>
      {notice.text}
    </p>
  );
}

export default function ClientBillingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const thisMonth = periodOf(new Date());
  const todayIst = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  const [month, setMonth] = useState(thisMonth);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [priceKind, setPriceKind] = useState<'CATALOG' | 'COLOUR_VARIANT'>('CATALOG');
  const [priceAmount, setPriceAmount] = useState('');
  const [priceFrom, setPriceFrom] = useState('');
  const [priceNotice, setPriceNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const [limitText, setLimitText] = useState('');
  const [noLimit, setNoLimit] = useState(false);
  const [gstOn, setGstOn] = useState(true);
  const [settingsNotice, setSettingsNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const [billMonth, setBillMonth] = useState(previousPeriod(thisMonth));
  const [billNotice, setBillNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const settingsLoaded = useRef(false);
  const fillSettings = (settings: { monthlyLimitPaise: number | null; gstEnabled: boolean }) => {
    setNoLimit(settings.monthlyLimitPaise === null);
    setLimitText(settings.monthlyLimitPaise === null ? '' : String(settings.monthlyLimitPaise / 100));
    setGstOn(settings.gstEnabled);
  };

  const load = useCallback(async () => {
    try {
      const res = await billingApi.getClient(id, month);
      setData(res);
      setLoadError(null);
      // The limit and GST form is filled from the server once, and again only
      // after it is saved, so a reload never overwrites what is being typed.
      if (!settingsLoaded.current) {
        settingsLoaded.current = true;
        fillSettings(res.settings);
      }
    } catch (err: any) {
      setLoadError(err.message || 'Billing could not be loaded. Try again in a minute.');
    } finally {
      setLoading(false);
    }
  }, [id, month]);

  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<void>, setNotice: (n: { ok: boolean; text: string }) => void) => {
    setBusy(true);
    try { await fn(); } catch (err: any) { setNotice({ ok: false, text: err.message || 'That did not work. Please try again.' }); } finally { setBusy(false); }
  };

  const savePrice = () => run(async () => {
    await billingApi.addClientPrice(id, { kind: priceKind, amountRupees: priceAmount, effectiveFrom: priceFrom || undefined });
    setPriceNotice({ ok: true, text: `${KIND_LABEL[priceKind]} price saved. Runs from ${priceFrom || 'now'} on are charged at ${formatRupees(Math.round(Number(priceAmount.replace(/,/g, '')) * 100))}.` });
    setPriceAmount(''); setPriceFrom('');
    await load();
  }, setPriceNotice);

  const saveSettings = () => run(async () => {
    const saved = await billingApi.saveSettings(id, { monthlyLimitRupees: noLimit ? null : limitText, gstEnabled: gstOn });
    fillSettings(saved);
    setSettingsNotice({ ok: true, text: 'Saved.' });
    await load();
  }, setSettingsNotice);

  const makeBill = () => run(async () => {
    const bill = await billingApi.makeBill(id, billMonth);
    setBillNotice({ ok: true, text: bill.created ? `Bill ${bill.number} made for ${periodLabel(billMonth)}.` : `The bill for ${periodLabel(billMonth)} already exists (${bill.number}); ${bill.status === 'DRAFT' ? 'it was brought up to date' : 'it was left as it is'}.` });
    await load();
  }, setBillNotice);

  const setStatus = (billId: string, status: string) => run(async () => {
    await billingApi.setBillStatus(id, billId, status);
    setBillNotice(null);
    await load();
  }, setBillNotice);

  if (loading) return <div className="space-y-6 animate-pulse"><div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl" /><div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl" /></div>;
  if (loadError || !data) return <div className="p-4 bg-red-50 text-red-700 rounded-md text-sm">{loadError || 'Billing could not be loaded.'}</div>;

  const s = data.summary;
  const limit = s?.limit;
  const usedPct = limit && limit.monthlyLimitPaise ? Math.min(100, Math.round((limit.usedPaise / limit.monthlyLimitPaise) * 100)) : 0;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Month */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className={button} onClick={() => setMonth(previousPeriod(month))} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white min-w-40 text-center">{periodLabel(month)}{month === thisMonth ? ' so far' : ''}</h2>
          <button className={button} onClick={() => setMonth(nextPeriod(month))} disabled={month >= thisMonth} aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
        </div>
        {s && <a className={button} href={billingApi.csvUrl(id, month)}><Download className="mr-2 h-4 w-4" />Download CSV</a>}
      </div>

      {data.usageError && <p className="text-sm rounded-md px-3 py-2 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300">{data.usageError}</p>}

      {s && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`${card} p-5`}><p className="text-sm text-gray-500">Catalogs</p><p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{s.counts.CATALOG}</p></div>
          <div className={`${card} p-5`}><p className="text-sm text-gray-500">Colour variants</p><p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{s.counts.COLOUR_VARIANT}</p></div>
          <div className={`${card} p-5`}>
            <p className="text-sm text-gray-500">Amount</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{formatRupees(s.totals.totalPaise)}</p>
            <p className="mt-1 text-xs text-gray-500">{formatRupees(s.totals.subtotalPaise)}{s.totals.gstEnabled ? ` + GST ${formatRupees(s.totals.gstPaise)}` : ' (no GST)'}</p>
          </div>
          <div className={`${card} p-5`}>
            <p className="text-sm text-gray-500">Monthly limit</p>
            {limit.monthlyLimitPaise === null ? (
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">No limit</p>
            ) : (
              <>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{formatRupees(limit.usedPaise)} <span className="text-sm font-normal text-gray-500">of {formatRupees(limit.monthlyLimitPaise)}</span></p>
                <div className="mt-2 h-2 rounded bg-gray-100 dark:bg-gray-800"><div className={`h-2 rounded ${limit.reached ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${usedPct}%` }} /></div>
                <p className={`mt-1 text-xs ${limit.reached ? 'text-red-600' : 'text-gray-500'}`}>{limit.reached ? 'Reached: new catalogs are refused until it is raised.' : `${formatRupees(limit.remainingPaise)} left, before GST`}</p>
              </>
            )}
          </div>
        </div>
      )}

      {s && (
        <section className={card}>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-base font-medium text-gray-900 dark:text-white">Delivered runs</h3>
            <p className="mt-1 text-sm text-gray-500">Only fully delivered runs are charged. Failed, cancelled and partial runs are free and not listed.</p>
          </div>
          {s.lines.length > 0 && (
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 text-sm space-y-1">
              {s.lines.map((l: any) => (
                <div key={`${l.kind}-${l.unitPaise}`} className="flex justify-between"><span>{l.description} × {l.quantity} at {formatRupees(l.unitPaise)}</span><span>{formatRupees(l.amountPaise)}</span></div>
              ))}
              {s.totals.gstEnabled && <div className="flex justify-between text-gray-500"><span>GST {s.totals.gstRateBp / 100}%</span><span>{formatRupees(s.totals.gstPaise)}</span></div>}
              <div className="flex justify-between font-medium"><span>Total</span><span>{formatRupees(s.totals.totalPaise)}</span></div>
            </div>
          )}
          {s.runs.length === 0 ? (
            <p className="px-6 py-8 text-sm text-gray-500 text-center">No catalogs or colour variants delivered in {periodLabel(month)}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-gray-500"><tr><th className="px-4 sm:px-6 py-2 font-medium">Delivered</th><th className="px-3 py-2 font-medium">Kind</th><th className="px-3 py-2 font-medium">Colour</th><th className="hidden sm:table-cell px-3 py-2 font-medium">Garment</th><th className="hidden md:table-cell px-3 py-2 font-medium">Request</th><th className="px-6 py-2 font-medium text-right">Price</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[...s.runs].reverse().slice(0, RUN_ROWS_SHOWN).map((r: any) => (
                    <tr key={r.id}>
                      <td className="px-4 sm:px-6 py-2 sm:whitespace-nowrap">{new Date(r.deliveredAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</td>
                      <td className="px-3 py-2">{KIND_LABEL[r.kind as 'CATALOG'] || r.kind}</td>
                      <td className="px-3 py-2">{r.colourName ? <span className="inline-flex items-center gap-2">{r.colourHex && <span className="h-3 w-3 rounded-full border border-gray-300" style={{ background: r.colourHex }} />}{r.colourName}</span> : '—'}</td>
                      <td className="hidden sm:table-cell px-3 py-2 font-mono text-xs text-gray-500">{r.garmentRef ? r.garmentRef.slice(0, 8) : '—'}</td>
                      <td className="hidden md:table-cell px-3 py-2 font-mono text-xs text-gray-500 max-w-48 truncate" title={r.requestKey}>{r.requestKey}</td>
                      <td className="px-6 py-2 text-right">{r.amountPaise === null ? 'No price set' : formatRupees(r.amountPaise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {s.runs.length > RUN_ROWS_SHOWN && (
                <p className="px-6 py-3 text-xs text-gray-500">Showing the latest {RUN_ROWS_SHOWN} of {s.runs.length.toLocaleString('en-IN')} runs. The CSV has them all.</p>
              )}
            </div>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prices */}
        <section className={card}>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-base font-medium text-gray-900 dark:text-white">Prices</h3>
            <p className="mt-1 text-sm text-gray-500">A new price applies from its start date on. Runs already made keep the price they were made at.</p>
          </div>
          <div className="px-6 py-4 space-y-2 text-sm">
            {(['CATALOG', 'COLOUR_VARIANT'] as const).map((k) => {
              const p = s?.currentPrices?.[k];
              return (
                <div key={k} className="flex justify-between">
                  <span>{KIND_LABEL[k]}</span>
                  <span className="text-right">{p ? <>{formatRupees(p.amountPaise)} <span className="text-gray-500">· {SOURCE_LABEL[p.source]}{p.source === 'DEFAULT' ? ' (placeholder until set)' : ''}</span></> : <span className="text-gray-500">No price set</span>}</span>
                </div>
              );
            })}
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Set a price for this client</p>
            <div className="flex gap-2">
              {(['CATALOG', 'COLOUR_VARIANT'] as const).map((k) => (
                <button key={k} type="button" onClick={() => setPriceKind(k)} className={priceKind === k ? primary : button}>{KIND_LABEL[k]}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-gray-600 dark:text-gray-400">Price in ₹, before GST<input className={input} inputMode="decimal" placeholder="100" value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} /></label>
              <label className="text-sm text-gray-600 dark:text-gray-400">Starts on (empty = now)<input className={input} type="date" min={todayIst} value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} /></label>
            </div>
            <button className={primary} disabled={busy || !priceAmount} onClick={savePrice}>Set price</button>
            <Notice notice={priceNotice} />
            {data.clientPrices.length > 0 && (
              <div className="pt-2 text-xs text-gray-500 space-y-1">
                <p className="font-medium">Price history for this client</p>
                {data.clientPrices.map((p: any) => (
                  <div key={p.id} className="flex justify-between"><span>{KIND_LABEL[p.kind as 'CATALOG'] || p.kind} from {new Date(p.effectiveFrom).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</span><span>{formatRupees(p.amountPaise)}</span></div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Limit and GST */}
        <section className={card}>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-base font-medium text-gray-900 dark:text-white">Monthly limit and GST</h3>
            <p className="mt-1 text-sm text-gray-500">Once a month&apos;s amount reaches the limit, new catalogs are refused before any work starts. The limit counts the amount before GST.</p>
          </div>
          <div className="px-6 py-4 space-y-4">
            <label className="block text-sm text-gray-600 dark:text-gray-400">Monthly limit in ₹
              <input className={input} inputMode="decimal" disabled={noLimit} value={noLimit ? '' : limitText} placeholder={noLimit ? 'No limit' : '5000'} onChange={(e) => setLimitText(e.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" checked={noLimit} onChange={(e) => setNoLimit(e.target.checked)} />No limit</label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" checked={gstOn} onChange={(e) => setGstOn(e.target.checked)} />Add GST (18%) on top of the prices</label>
            {data.settings.isDefault && <p className="text-xs text-gray-500">Using the defaults: a ₹5,000 limit and GST added.</p>}
            <button className={primary} disabled={busy} onClick={saveSettings}>Save</button>
            <Notice notice={settingsNotice} />
          </div>
        </section>
      </div>

      {/* Bills */}
      <section className={card}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-medium text-gray-900 dark:text-white">Monthly bills</h3>
            <p className="mt-1 text-sm text-gray-500">One bill per month. Making it again brings a draft up to date; a sent or paid bill is never changed.</p>
          </div>
          <div className="flex items-end gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Month<input className={input} type="month" max={previousPeriod(thisMonth)} value={billMonth} onChange={(e) => setBillMonth(e.target.value)} /></label>
            <button className={primary} disabled={busy || !billMonth} onClick={makeBill}><Receipt className="mr-2 h-4 w-4" />Make bill</button>
          </div>
        </div>
        <div className="px-6 pt-3"><Notice notice={billNotice} /></div>
        {data.bills.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-500 text-center">No bills yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
            {data.bills.map((b: any) => (
              <li key={b.id} className="px-4 sm:px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="min-w-40 flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{periodLabel(b.period)}</p>
                  <p className="font-mono text-xs text-gray-500">{b.number}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatRupees(b.totalPaise)}</p>
                  {b.gstEnabled ? <p className="text-xs text-gray-500">incl. GST {formatRupees(b.gstPaise)}</p> : <p className="text-xs text-gray-500">no GST</p>}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[b.status] || ''}`}>{b.status.charAt(0) + b.status.slice(1).toLowerCase()}</span>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:ml-auto">
                  <a className={button} href={billingApi.pdfUrl(id, b.id)} target="_blank" rel="noreferrer"><FileText className="mr-1 h-4 w-4" />PDF</a>
                  {b.status === 'DRAFT' && <button className={button} disabled={busy} onClick={() => setStatus(b.id, 'SENT')}>Mark sent</button>}
                  {b.status === 'SENT' && <button className={button} disabled={busy} onClick={() => setStatus(b.id, 'PAID')}>Mark paid</button>}
                  {b.status === 'SENT' && <button className={button} disabled={busy} onClick={() => setStatus(b.id, 'DRAFT')}>Back to draft</button>}
                  {b.status === 'PAID' && <button className={button} disabled={busy} onClick={() => setStatus(b.id, 'SENT')}>Not paid after all</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
