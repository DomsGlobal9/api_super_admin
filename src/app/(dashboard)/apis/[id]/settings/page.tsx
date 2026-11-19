'use client';

import { use, useEffect, useState } from 'react';
import { apisClient } from '@/lib/api-client/apis';

const MB = 1024 * 1024;

type Environment = { environment?: string; timeoutMs?: number; maxPayloadSize?: number };

const toMb = (bytes?: number) => (bytes ? String(Math.round((bytes / MB) * 100) / 100) : '');
const toSec = (ms?: number) => (ms ? String(ms / 1000) : '');

export default function SettingsTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [current, setCurrent] = useState<Environment | null>(null);
  const [form, setForm] = useState({ maxPayloadMb: '', timeoutSec: '' });

  const load = async () => {
    try {
      const api = await apisClient.getApiById(id);
      // The gateway only reads the PRODUCTION environment.
      const envs: Environment[] = api?.environments || [];
      const env = envs.find((e) => e.environment === 'PRODUCTION') || envs[0] || null;
      setCurrent(env);
      setForm({ maxPayloadMb: toMb(env?.maxPayloadSize), timeoutSec: toSec(env?.timeoutMs) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved('');
    const megabytes = Number(form.maxPayloadMb);
    const seconds = Number(form.timeoutSec);
    if (!form.maxPayloadMb.trim() || !Number.isFinite(megabytes) || megabytes < 0.01 || megabytes > 100) {
      setError('Request size limit must be a number of MB from 0.01 to 100.');
      return;
    }
    if (!form.timeoutSec.trim() || !Number.isFinite(seconds) || seconds < 1 || seconds > 300) {
      setError('Timeout must be a number of seconds from 1 to 300.');
      return;
    }
    setSaving(true);
    try {
      await apisClient.updateApi(id, {
        maxPayloadSize: Math.round(megabytes * MB),
        timeoutMs: Math.round(seconds * 1000),
      });
      await load();
      setSaved('Saved. The gateway uses these limits from the next request.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the limits.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-48 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 animate-pulse" />;
  }

  if (!current) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 text-sm text-gray-600 dark:text-gray-400">
        {error || 'This API has no production environment yet. Set its Target Server URL with Edit API first.'}
      </div>
    );
  }

  const inputClass =
    'w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <form onSubmit={handleSave} className="max-w-2xl rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Gateway limits</h2>
        <p className="mt-1 text-sm text-gray-500">Applied by the gateway to every request for this API (production).</p>
      </div>

      <div className="p-6 space-y-5">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">{error}</div>}
        {saved && <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm border border-green-200">{saved}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="maxPayloadMb" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Request size limit (MB)
            </label>
            <input
              id="maxPayloadMb"
              type="text"
              inputMode="decimal"
              value={form.maxPayloadMb}
              onChange={(e) => setForm((f) => ({ ...f, maxPayloadMb: e.target.value }))}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-500">Bigger requests are refused before they reach the service. Up to 100.</p>
          </div>
          <div>
            <label htmlFor="timeoutSec" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Timeout (seconds)
            </label>
            <input
              id="timeoutSec"
              type="text"
              inputMode="numeric"
              value={form.timeoutSec}
              onChange={(e) => setForm((f) => ({ ...f, timeoutSec: e.target.value }))}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-500">How long to wait for the service to start answering. Up to 300.</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save limits'}
        </button>
      </div>
    </form>
  );
}
