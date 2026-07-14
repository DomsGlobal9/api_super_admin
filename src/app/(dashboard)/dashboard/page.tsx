'use client';

import { useEffect, useState } from 'react';
import { dashboardApi } from '@/lib/api-client/dashboard';
import { StatCard } from '@/components/dashboard/StatCard';
import { Activity, Server, Users, AlertTriangle, Zap, Database } from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      try {
        const result = await dashboardApi.getOverview();
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading metrics...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Overview</h1>
        <div className="flex items-center space-x-2">
          <span className="flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-3 w-3 rounded-full opacity-75 ${data.gatewayStatus === 'HEALTHY' ? 'bg-green-400' : 'bg-red-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${data.gatewayStatus === 'HEALTHY' ? 'bg-green-500' : 'bg-red-500'}`}></span>
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">Gateway is {data.gatewayStatus}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Requests (24h)"
          value={data.requestsToday.toLocaleString()}
          icon={Activity}
          trend={{ value: 12.5, isPositive: true }}
          description="from previous day"
        />
        <StatCard
          title="Active Clients"
          value={data.activeClients}
          icon={Users}
          description="Total provisioned clients"
        />
        <StatCard
          title="Average Latency"
          value={`${data.averageLatencyMs}ms`}
          icon={Zap}
          description="Across all endpoints"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Infrastructure Health</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center space-x-3">
                <Server className="h-5 w-5 text-gray-500" />
                <span className="font-medium">Redis Cache</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${data.redisStatus === 'HEALTHY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {data.redisStatus}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center space-x-3">
                <Database className="h-5 w-5 text-gray-500" />
                <span className="font-medium">PostgreSQL</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${data.databaseStatus === 'HEALTHY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {data.databaseStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
            Active Alerts
          </h2>
          {!data.recentAlerts || data.recentAlerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No active alerts. All systems operational.
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentAlerts.map((alert: any, i: number) => (
                <div key={i} className="flex items-start p-3 bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-400 rounded-md">
                  <span className="font-medium text-sm">{alert.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
