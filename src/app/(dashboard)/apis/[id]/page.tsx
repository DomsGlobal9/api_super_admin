'use client';

import { use, useEffect, useState } from 'react';
import { apisClient } from '@/lib/api-client/apis';
import { MetricCardSkeleton } from '@/components/ui/Skeletons';
import { StatCard } from '@/components/dashboard/StatCard';
import { Activity, Box, ShieldCheck, Zap, AlertCircle } from 'lucide-react';

export default function ApiOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apisClient.getOverview(id);
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Requests Today"
          value={data?.api?.requestsToday || 0}
          icon={Activity}
          trend={{ value: 0, isPositive: true }}
        />
        <StatCard
          title="Total Endpoints"
          value={data?.api?.totalEndpoints || 0}
          icon={Box}
        />
        <StatCard
          title="Active Versions"
          value={data?.api?.activeVersions || 0}
          icon={ShieldCheck}
        />
        <StatCard
          title="Provisioned Clients"
          value={data?.clients?.length || 0}
          icon={Zap}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <Box className="h-5 w-5 mr-2 text-indigo-500" />
            Top Endpoints
          </h2>
          <div className="space-y-3">
            {[
              { path: 'POST /v2/generate', reqs: '850K', latency: '190ms' },
              { path: 'GET /v2/status', reqs: '250K', latency: '45ms' },
              { path: 'POST /v2/background-remove', reqs: '100K', latency: '350ms' }
            ].map((ep, i) => (
              <div key={i} className="flex justify-between items-center p-3 border border-gray-100 dark:border-gray-800 rounded-md bg-gray-50 dark:bg-gray-900">
                <span className="font-mono text-sm text-gray-900 dark:text-gray-100 font-semibold">{ep.path}</span>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>{ep.reqs} reqs</span>
                  <span>{ep.latency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
            API Health Alerts
          </h2>
          <div className="text-center py-8 text-gray-500 text-sm">
            No active alerts on this API.
          </div>
        </div>
      </div>
    </div>
  );
}
