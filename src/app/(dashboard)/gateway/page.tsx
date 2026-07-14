'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { gatewayClient } from '@/lib/api-client/gateway';
import { Server, Activity, ShieldCheck, HardDrive, Database, Network } from 'lucide-react';
import { WorkspaceSkeleton } from '@/components/ui/Skeletons';

export default function GatewayNOCPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await gatewayClient.getOverview();
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Failed to load gateway overview');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <WorkspaceSkeleton />;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Gateway NOC" 
        description="Network Operations Center view of the Data Plane infrastructure."
      />

      {/* Infrastructure */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
          <Server className="h-5 w-5 text-indigo-500" />
          Infrastructure
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-gray-400" />
              <span className="font-medium text-gray-700 dark:text-gray-300">PostgreSQL</span>
            </div>
            <HealthBadge status={data.infrastructure.postgres} />
          </div>
          <div className="bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <HardDrive className="h-5 w-5 text-gray-400" />
              <span className="font-medium text-gray-700 dark:text-gray-300">Redis</span>
            </div>
            <HealthBadge status={data.infrastructure.redis} />
          </div>
          <div className="bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Network className="h-5 w-5 text-gray-400" />
              <span className="font-medium text-gray-700 dark:text-gray-300">Gateway Cluster</span>
            </div>
            <HealthBadge status={data.infrastructure.gateway} />
          </div>
          <div className="bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-gray-400" />
              <span className="font-medium text-gray-700 dark:text-gray-300">Cache Layer</span>
            </div>
            <HealthBadge status={data.infrastructure.cache} />
          </div>
        </div>
      </div>

      {/* Traffic */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
          <Activity className="h-5 w-5 text-green-500" />
          Traffic
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricBlock label="Requests/sec" value={data.traffic.rps} />
          <MetricBlock label="Active Requests" value={data.traffic.activeRequests} />
          <MetricBlock label="Throughput" value={data.traffic.throughput} />
          <MetricBlock label="Average Latency" value={data.traffic.avgLatency} />
        </div>
      </div>

      {/* Reliability */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
          <ShieldCheck className="h-5 w-5 text-blue-500" />
          Reliability
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricBlock label="Open Circuit Breakers" value={data.reliability.circuitBreakers} alertIf={data.reliability.circuitBreakers > 0} />
          <MetricBlock label="Timeouts (24h)" value={data.reliability.timeouts} />
          <MetricBlock label="Retries (24h)" value={data.reliability.retries} />
          <MetricBlock label="Error Rate" value={data.reliability.errorRate} />
        </div>
      </div>

      {/* Capacity */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
          <HardDrive className="h-5 w-5 text-amber-500" />
          Capacity
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricBlock label="Memory Usage" value={data.capacity.memory} />
          <MetricBlock label="Connections" value={data.capacity.connections} />
          <MetricBlock label="Cache Hit Rate" value={data.capacity.cacheHitRate} />
          <MetricBlock label="Queue Depth" value={data.capacity.queueDepth} />
        </div>
      </div>

    </div>
  );
}

function MetricBlock({ label, value, alertIf = false }: { label: string, value: string | number, alertIf?: boolean }) {
  return (
    <div className={`p-4 rounded-xl border ${alertIf ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-900/30' : 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-800'}`}>
      <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${alertIf ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{value}</div>
    </div>
  );
}
