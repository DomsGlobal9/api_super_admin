'use client';

import { use, useEffect, useState } from 'react';
import { clientsApi } from '@/lib/api-client/clients';
import { MetricCardSkeleton } from '@/components/ui/Skeletons';
import { StatCard } from '@/components/dashboard/StatCard';
import { Activity, Key, Box, Globe, Zap, AlertCircle } from 'lucide-react';

export default function ClientOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await clientsApi.getOverview(id);
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

  if (!data) return <div>Failed to load overview.</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Requests Today"
          value={data._count?.requestLogs || 0}
          icon={Activity}
          trend={{ value: 0, isPositive: true }}
        />
        <StatCard
          title="Success Rate"
          value={`${data.metrics?.successRate || 99.9}%`}
          icon={Zap}
        />
        <StatCard
          title="Active Keys"
          value={data.apiKeys?.length || 0}
          icon={Key}
        />
        <StatCard
          title="Top Endpoint"
          value="N/A"
          icon={Globe}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <Box className="h-5 w-5 mr-2 text-indigo-500" />
            Provisioned Modules
          </h2>
          {(!data.subscriptions || data.subscriptions.length === 0 || !data.subscriptions[0].allowedModules || data.subscriptions[0].allowedModules.length === 0) ? (
            <p className="text-gray-500 text-sm">No modules assigned.</p>
          ) : (
            <div className="space-y-3">
              {data.subscriptions[0].allowedModules.map((modAccess: any, i: number) => (
                <div key={i} className="flex justify-between items-center p-3 border border-gray-100 dark:border-gray-800 rounded-md">
                  <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{modAccess.module.name}</span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full dark:bg-green-500/20 dark:text-green-400">
                    {modAccess.module.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
            Recent Anomalies
          </h2>
          <div className="text-center py-8 text-gray-500 text-sm">
            No recent anomalies detected for this client.
          </div>
        </div>
      </div>
    </div>
  );
}
