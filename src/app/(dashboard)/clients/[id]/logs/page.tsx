'use client';

import { use, useEffect, useState } from 'react';
import { clientsApi } from '@/lib/api-client/clients';
import { Key, Calendar, Filter, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/Skeletons';

export default function ClientLogsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [logs, setLogs] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50); // Hardcoded to 50 items per page
  
  // Filter State
  const [filters, setFilters] = useState({
    status: '',
    days: '',
    specificDate: '',
    endpoint: '',
    apiKeyId: ''
  });

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Load API Keys for the dropdown filter
  useEffect(() => {
    let isMounted = true;
    async function loadApiKeys() {
      try {
        const overviewData = await clientsApi.getOverview(id);
        if (isMounted) setApiKeys(overviewData?.apiKeys || []);
      } catch (err) {
        console.error(err);
      }
    }
    loadApiKeys();
    return () => { isMounted = false; };
  }, [id]);

  // Load Logs and handle smart auto-polling
  useEffect(() => {
    let isMounted = true;
    
    async function loadLogs(showLoader = true) {
      try {
        if (showLoader) setLogsLoading(true);
        const logsData = await clientsApi.getRequests(id, { page, pageSize, ...filters });
        if (isMounted) {
          setLogs(logsData);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted && showLoader) setLogsLoading(false);
      }
    }
    
    // Initial load
    loadLogs(true);
    
    // Smart Polling: Only auto-refresh if on Page 1
    let intervalId: NodeJS.Timeout;
    if (page === 1) {
      intervalId = setInterval(() => {
        loadLogs(false);
      }, 3000);
    }
    
    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [id, filters, page, pageSize]);

  if (loading) {
    return (
      <div className="space-y-8">
        <TableSkeleton rows={15} />
      </div>
    );
  }

  return (
    <div className="space-y-8 h-[calc(100vh-12rem)] min-h-[600px] flex flex-col">
      {/* Full Logs Table with Filters and Pagination */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 flex flex-col flex-1 overflow-hidden">
        
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Full Request Logs</h3>
            <span className="text-xs font-medium px-3 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-full flex items-center gap-1.5">
              {page === 1 ? (
                <><span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span> Live Polling Active</>
              ) : (
                <><span className="w-2 h-2 rounded-full bg-gray-400"></span> Polling Paused (Historical View)</>
              )}
            </span>
          </div>
          
          {/* Sleek Filters Bar */}
          <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-4">
            
            {/* Date Filter */}
            <div className="relative group flex-1 min-w-[180px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <select
                value={filters.days === 'specific' ? '' : filters.days}
                onChange={(e) => setFilters({ ...filters, days: e.target.value, specificDate: '' })}
                className="block w-full pl-10 pr-10 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 appearance-none transition-all shadow-sm hover:border-gray-300 dark:hover:border-gray-700"
              >
                <option value="1">Last 24 Hours</option>
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="">All Time</option>
              </select>
            </div>
            
            {/* Specific Date Picker */}
            <div className="relative group flex-1 min-w-[150px]">
              <input
                type="date"
                value={filters.specificDate}
                onChange={(e) => setFilters({ ...filters, specificDate: e.target.value, days: e.target.value ? 'specific' : '7' })}
                title="Specific Date"
                className="block w-full px-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm hover:border-gray-300 dark:hover:border-gray-700"
              />
            </div>
            
            {/* Status Filter */}
            <div className="relative group flex-1 min-w-[180px]">
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
            
            {/* API Key Filter */}
            <div className="relative group flex-1 min-w-[180px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <select
                value={filters.apiKeyId}
                onChange={(e) => setFilters({ ...filters, apiKeyId: e.target.value })}
                className="block w-full pl-10 pr-10 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 appearance-none transition-all shadow-sm hover:border-gray-300 dark:hover:border-gray-700"
              >
                <option value="">All API Keys</option>
                {apiKeys.map(key => (
                  <option key={key.id} value={key.id}>{key.name}</option>
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
        
        {/* Table Content */}
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950">
          {logsLoading && logs?.requests?.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Loading logs...</div>
          ) : logs?.requests?.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 relative">
              <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">API Key</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Latency</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-950 divide-y divide-gray-200 dark:divide-gray-800">
                {logs.requests.map((req: any) => (
                  <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(req.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                          req.method === 'GET' ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
                          req.method === 'POST' ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                          "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                        }`}>
                          {req.method}
                        </span>
                        <span className="font-mono text-sm text-gray-900 dark:text-gray-100 truncate max-w-[200px] xl:max-w-[400px]">
                          {req.endpoint}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Key className="w-3 h-3 mr-1" />
                        {req.apiKey?.name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-right">
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
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                      {req.totalLatencyMs}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center h-full justify-center">
              <Search className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">No requests found</p>
              <p className="text-sm mt-1">Try adjusting your filters or search term.</p>
            </div>
          )}
        </div>
        
        {/* Pagination Footer */}
        {logs?.totalPages > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between shrink-0">
            <div className="text-sm text-gray-500">
              Showing page <span className="font-medium text-gray-900 dark:text-gray-100">{page}</span> of <span className="font-medium text-gray-900 dark:text-gray-100">{logs.totalPages}</span>
              <span className="ml-2">({logs.total.toLocaleString()} total logs)</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700/50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              
              <button
                onClick={() => setPage(Math.min(logs.totalPages, page + 1))}
                disabled={page === logs.totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700/50 transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
