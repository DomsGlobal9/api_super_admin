'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { ShieldAlert, Database, Cpu, HardDrive } from 'lucide-react';
import { useEffect, useState } from 'react';
import { healthClient } from '@/lib/api-client/health';

export default function HealthPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHealth() {
      try {
        const res = await healthClient.getStatus();
        setData(res || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load health status');
      } finally {
        setLoading(false);
      }
    }
    loadHealth();
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Service Health" 
        description="High-level availability and SLA tracking across all APIs and Microservices."
      />

      {loading && <div className="space-y-4 animate-pulse"><div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-xl"></div></div>}
      {error && <div className="p-4 bg-red-50 text-red-500 rounded-md">Error: {error}</div>}
      {!loading && !error && data.length === 0 && <div>No health data available.</div>}

      <div className="space-y-6">
        {data.map((service, i) => (
          <div key={i} className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-800">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  {service.name}
                  <HealthBadge status={service.status} />
                </h2>
                <p className="text-sm text-gray-500 mt-1">{service.description}</p>
              </div>
              <div className="flex gap-6">
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Avg Latency</div>
                  <div className={`text-xl font-bold ${service.latencyMs > 500 ? 'text-amber-600 dark:text-amber-500' : 'text-gray-900 dark:text-white'}`}>{service.latencyMs}ms</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Availability</div>
                  <div className={`text-xl font-bold ${service.successRate < 99.0 ? 'text-red-600 dark:text-red-400' : service.successRate < 99.9 ? 'text-amber-600 dark:text-amber-500' : 'text-green-600 dark:text-green-400'}`}>
                    {service.successRate.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">SLA Target</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">{service.sla}</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Core Dependencies</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {service.dependencies?.map((dep: any, j: number) => (
                  <DependencyItem key={j} icon={Database} name={dep.name} status={dep.status} latency="Unknown" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DependencyItem({ icon: Icon, name, status, latency }: { icon: any, name: string, status: string, latency: string }) {
  const isHealthy = status === 'HEALTHY';
  return (
    <div className={`p-4 rounded-lg border ${isHealthy ? 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-800' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/30'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${isHealthy ? 'text-gray-500' : 'text-amber-500'}`} />
          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{name}</span>
        </div>
        <HealthBadge status={status} showIcon={false} />
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400">Response: {latency}</div>
    </div>
  );
}
