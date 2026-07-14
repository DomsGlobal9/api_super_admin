'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { Activity, Zap, Clock, ShieldCheck, Users, Cpu, FileJson, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { analyticsClient } from '@/lib/api-client/analytics';

export default function UsagePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await analyticsClient.getUsage();
        setData(res);
      } catch (err: any) {
        setError(err.message || 'Failed to load usage metrics');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div className="space-y-4 animate-pulse"><div className="h-10 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div><div className="grid grid-cols-4 gap-4"><div className="h-24 bg-gray-200 dark:bg-gray-800 rounded"></div><div className="h-24 bg-gray-200 dark:bg-gray-800 rounded"></div><div className="h-24 bg-gray-200 dark:bg-gray-800 rounded"></div><div className="h-24 bg-gray-200 dark:bg-gray-800 rounded"></div></div></div>;
  if (error) return <div className="p-4 bg-red-50 text-red-500 rounded-md">Error: {error}</div>;
  if (!data) return <div>No usage metrics found.</div>;

  const { summary, topPerformers } = data;

  // Formatting helpers
  const formatNumber = (num: number) => num >= 1000000 ? (num / 1000000).toFixed(1) + 'M' : num >= 1000 ? (num / 1000).toFixed(1) + 'K' : num.toString();
  const formatBytes = (bytes: number) => bytes >= 1099511627776 ? (bytes / 1099511627776).toFixed(1) + ' TB' : bytes >= 1073741824 ? (bytes / 1073741824).toFixed(1) + ' GB' : (bytes / 1048576).toFixed(1) + ' MB';
  const successRate = summary.totalRequests > 0 ? (((summary.totalRequests - summary.totalErrors) / summary.totalRequests) * 100).toFixed(2) : 100;

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Usage Metrics" 
        description="Business and operational consumption metrics across the entire platform."
      />

      {/* Top Level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricBlock icon={Activity} label="Total Requests (24h)" value={formatNumber(summary.totalRequests)} />
        <MetricBlock icon={Zap} label="Bandwidth (24h)" value={formatBytes(summary.bandwidth)} />
        <MetricBlock icon={Clock} label="Avg Latency" value={`${summary.averageLatency}ms`} />
        <MetricBlock icon={ShieldCheck} label="Success Rate" value={`${successRate}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients */}
        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-500" />
            Top Clients by Volume
          </h2>
          <div className="space-y-4">
            {topPerformers.clients?.map((item: any, i: number) => {
              const maxReqs = topPerformers.clients[0]?.reqs || 1;
              const percent = (item.reqs / maxReqs) * 100;
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span className="text-gray-900 dark:text-gray-100">{item.name}</span>
                    <span className="text-gray-500">{formatNumber(item.reqs)} reqs</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-900 rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top APIs */}
        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-indigo-500" />
            Most Accessed APIs
          </h2>
          <div className="space-y-4">
            {topPerformers.apis?.map((item: any, i: number) => {
              const maxReqs = topPerformers.apis[0]?.reqs || 1;
              const percent = (item.reqs / maxReqs) * 100;
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span className="text-gray-900 dark:text-gray-100">{item.name}</span>
                    <span className="text-gray-500">{formatNumber(item.reqs)} reqs</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-900 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Endpoints */}
        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileJson className="h-5 w-5 text-indigo-500" />
            Top Endpoints
          </h2>
          <div className="space-y-3">
            {topPerformers.endpoints?.map((ep: any, i: number) => (
              <div key={i} className="flex justify-between items-center p-3 border border-gray-100 dark:border-gray-800 rounded-md bg-gray-50 dark:bg-gray-900">
                <span className="font-mono text-sm text-gray-900 dark:text-gray-100 font-semibold">{ep.path}</span>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>{formatNumber(ep.reqs)} reqs</span>
                  <span>{ep.latency}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trends Chart Placeholder */}
        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6 flex flex-col items-center justify-center text-center">
          <TrendingUp className="h-12 w-12 text-gray-300 dark:text-gray-700 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Traffic Trends</h3>
          <p className="text-sm text-gray-500">Time-series chart component will be injected here.</p>
        </div>
      </div>

    </div>
  );
}

function MetricBlock({ icon: Icon, label, value, trend, trendPositive }: { icon: any, label: string, value: string | number, trend?: string, trendPositive?: boolean }) {
  return (
    <div className="bg-white dark:bg-gray-950 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="flex items-end justify-between">
        <div className="text-3xl font-bold text-gray-900 dark:text-white">{value}</div>
        {trend && (
          <div className={`text-sm font-medium ${trendPositive === undefined ? 'text-indigo-600 dark:text-indigo-400' : (trendPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}`}>
            {trend}
          </div>
        )}
      </div>
    </div>
  );
}
