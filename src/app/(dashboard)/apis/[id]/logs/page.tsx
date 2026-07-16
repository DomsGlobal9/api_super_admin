'use client';

import { use, useEffect, useState } from 'react';
import { apisClient } from '@/lib/api-client/apis';
import { TableSkeleton } from '@/components/ui/Skeletons';
import { Key, Filter, Calendar, Search, Users, Activity } from 'lucide-react';

export default function ApiLogsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [logs, setLogs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  
  const [filters, setFilters] = useState({
    status: '',
    days: '7',
    endpoint: '',
    clientId: ''
  });

  useEffect(() => {
    let isMounted = true;
    
    async function fetchClients() {
      try {
        const res = await apisClient.getClients(id);
        if (isMounted && res.clients) {
          setClients(res.clients);
        }
      } catch (e) {}
    }
    fetchClients();
    
    async function loadLogs(showLoader = true) {
      try {
        if (showLoader) setLoading(true);
        const logsData = await apisClient.getLogs(id, { pageSize: 50, ...filters });
        if (isMounted) setLogs(logsData);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted && showLoader) setLoading(false);
      }
    }
    
    loadLogs(true);
    
    // Auto-refresh table every 3 seconds seamlessly
    const intervalId = setInterval(() => {
      loadLogs(false);
    }, 3000);
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [id, filters]);

  if (loading) return <TableSkeleton rows={10} />;
  if (!logs) return <div className="text-red-500">Failed to load request logs.</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
              <Activity className="h-5 w-5 mr-2 text-indigo-500" />
              Live Traffic Logs
            </h3>
            <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-indigo-900 dark:text-indigo-300">
              {logs.total} Requests
            </span>
          </div>
          
          {/* Sleek Filters Bar */}
          <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-4">
            
            {/* Date Filter */}
            <div className="relative group flex-1 min-w-[150px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <select
                value={filters.days}
                onChange={(e) => setFilters({ ...filters, days: e.target.value })}
                className="block w-full pl-10 pr-10 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 appearance-none transition-all shadow-sm hover:border-gray-300 dark:hover:border-gray-700"
              >
                <option value="1">Last 24 Hours</option>
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="">All Time</option>
              </select>
            </div>
            
            {/* Status Filter */}
            <div className="relative group flex-1 min-w-[150px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="block w-full pl-10 pr-10 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 appearance-none transition-all shadow-sm hover:border-gray-300 dark:hover:border-gray-700"
              >
                <option value="">All Statuses</option>
                <option value="success">Success (2xx - 3xx)</option>
                <option value="client_error">Client Errors (4xx)</option>
                <option value="server_error">Server Errors (5xx)</option>
              </select>
            </div>
            
            {/* Client Filter */}
            <div className="relative group flex-1 min-w-[150px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Users className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <select
                value={filters.clientId}
                onChange={(e) => setFilters({ ...filters, clientId: e.target.value })}
                className="block w-full pl-10 pr-10 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 appearance-none transition-all shadow-sm hover:border-gray-300 dark:hover:border-gray-700"
              >
                <option value="">All Clients</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
            </div>
            
            {/* Endpoint Search */}
            <div className="relative group flex-[2] min-w-[200px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Filter by endpoint..."
                value={filters.endpoint}
                onChange={(e) => setFilters({ ...filters, endpoint: e.target.value })}
                className="block w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm hover:border-gray-300 dark:hover:border-gray-700 placeholder-gray-400"
              />
            </div>
          </div>
        </div>
        
        {logs?.requests?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50/50 dark:bg-gray-900/20">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">API Key</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Latency</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-950 divide-y divide-gray-200 dark:divide-gray-800">
                {logs.requests.map((req: any) => (
                  <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(req.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {req.client?.companyName || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                          req.method === 'GET' ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
                          req.method === 'POST' ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                          "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                        }`}>
                          {req.method}
                        </span>
                        <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                          {req.endpoint}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Key className="w-3 h-3 mr-1" />
                        {req.apiKey?.name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        req.statusCode >= 200 && req.statusCode < 300
                          ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20'
                          : req.statusCode >= 400
                          ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                          : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                      }`}>
                        {req.statusCode || req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {req.totalLatencyMs}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Traffic Found</h3>
            <p className="mt-1 text-sm text-gray-500">There are no request logs matching your current filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
