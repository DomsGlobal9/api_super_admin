'use client';

import { use, useEffect, useState } from 'react';
import { apisClient } from '@/lib/api-client/apis';
import { MetricCardSkeleton } from '@/components/ui/Skeletons';
import { StatCard } from '@/components/dashboard/StatCard';
import { Activity, Box, ShieldCheck, Zap, AlertCircle, Pencil } from 'lucide-react';
import { EditApiDialog } from '@/components/ui/EditApiDialog';

export default function ApiOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const load = async () => {
    try {
      const res = await apisClient.getOverview(id);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {data?.api?.displayName}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            API Slug: <span className="font-mono">{data?.api?.slug}</span>
          </p>
        </div>
        <button
          onClick={() => setIsEditOpen(true)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 h-9 px-4 py-2"
        >
          <Pencil className="mr-2 h-4 w-4" />
          Edit API
        </button>
      </div>

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
          {data?.topEndpoints && data.topEndpoints.length > 0 ? (
            <div className="space-y-4">
              {data.topEndpoints.map((ep: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 truncate">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                      ep.method === 'GET' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      ep.method === 'POST' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      ep.method === 'PUT' || ep.method === 'PATCH' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {ep.method}
                    </span>
                    <span className="text-sm text-gray-900 dark:text-white truncate font-mono" title={ep.endpoint}>
                      {ep.endpoint.length > 30 ? ep.endpoint.substring(0, 30) + '...' : ep.endpoint}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white ml-4 shrink-0">
                    {ep.requests.toLocaleString()} reqs
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              No endpoint traffic recorded yet.
            </div>
          )}
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

      <EditApiDialog 
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={load}
        apiId={id}
        initialData={data?.api}
      />
    </div>
  );
}
