'use client';

import { useEffect, useState } from 'react';
import { logsClient } from '@/lib/api-client/logs';
import { clientsApi } from '@/lib/api-client/clients';
import { apisClient } from '@/lib/api-client/apis';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/data-table/DataTable';
import { DataTablePagination } from '@/components/ui/data-table/DataTablePagination';
import { DataTableToolbar } from '@/components/ui/data-table/DataTableToolbar';
import { TableSkeleton } from '@/components/ui/Skeletons';
import { RequestLogDrawer } from '@/components/ui/RequestLogDrawer';
import { columns, RequestLogDTO } from './columns';
import { Filter } from 'lucide-react';
import { getCoreRowModel, useReactTable, getPaginationRowModel, getFilteredRowModel } from '@tanstack/react-table';

export default function RequestLogsPage() {
  const [data, setData] = useState<RequestLogDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLog, setSelectedLog] = useState<RequestLogDTO | null>(null);

  const [clients, setClients] = useState<any[]>([]);
  const [apis, setApis] = useState<any[]>([]);
  
  const [filterClient, setFilterClient] = useState('');
  const [filterApi, setFilterApi] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    async function loadFilters() {
      try {
        const [c, a] = await Promise.allSettled([
          clientsApi.list({ pageSize: 100 }),
          apisClient.list({ pageSize: 100 })
        ]);
        if (c.status === 'fulfilled') setClients(Array.isArray(c.value) ? c.value : []);
        if (a.status === 'fulfilled') setApis(Array.isArray(a.value) ? a.value : []);
      } catch (e) {}
    }
    loadFilters();
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    async function loadLogs(isPolling = false) {
      try {
        if (!isPolling) setLoading(true);
        const params: any = { pageSize: 100 };
        if (filterClient) params.clientId = filterClient;
        if (filterApi) params.apiId = filterApi;
        if (filterStatus) params.status = filterStatus;
        
        const result = await logsClient.list(params);
        
        // Map data directly from backend payload
        const logsArray = Array.isArray(result) ? result : [];
        const mappedData = logsArray.map((log: any) => ({
          id: log.id,
          timestamp: log.timestamp,
          method: log.method,
          path: log.endpoint,
          statusCode: log.statusCode,
          latencyMs: log.totalLatency,
          clientName: log.clientName || 'Unknown',
          apiKeyName: log.apiKeyName || 'Unknown Key',
          cacheHit: log.cacheHit,
          errorMessage: log.errorMessage,
          requestPayload: log.requestPayload,
          responsePayload: log.responsePayload
        }));
        
        setData(mappedData);
      } catch (err: any) {
        if (!isPolling) setError(err.message);
      } finally {
        if (!isPolling) setLoading(false);
      }
    }

    async function initializeAndPoll() {
      await loadLogs(false);
      intervalId = setInterval(() => {
        loadLogs(true);
      }, 3000);
    }

    initializeAndPoll();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [filterClient, filterApi, filterStatus]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 15,
      }
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Global Request Logs" 
        description="Search, filter, and inspect detailed HTTP traces across all Gateway instances."
      />

      <div className="bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-wrap gap-4 items-center">
        <div className="flex items-center text-sm font-medium text-gray-500 mr-2">
          <Filter className="w-4 h-4 mr-2" /> Filters
        </div>
        <select 
          className="text-sm border-gray-300 rounded-md dark:bg-gray-900 dark:border-gray-700 py-1.5 pl-3 pr-8"
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
        >
          <option value="">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
        </select>
        <select 
          className="text-sm border-gray-300 rounded-md dark:bg-gray-900 dark:border-gray-700 py-1.5 pl-3 pr-8"
          value={filterApi}
          onChange={(e) => setFilterApi(e.target.value)}
        >
          <option value="">All APIs</option>
          {apis.map(a => <option key={a.id} value={a.id}>{a.displayName}</option>)}
        </select>
        <select 
          className="text-sm border-gray-300 rounded-md dark:bg-gray-900 dark:border-gray-700 py-1.5 pl-3 pr-8"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <TableSkeleton rows={15} />
      ) : error ? (
        <div className="text-red-500 bg-red-50 p-4 rounded-md">Error loading logs: {error}</div>
      ) : (
        <div className="space-y-4">
          <DataTableToolbar table={table} searchKey="path" searchPlaceholder="Search by endpoint path (e.g. /v2/generate)..." />
          <div onClick={() => { if(data.length > 0) setSelectedLog(data[0]) }} className="cursor-pointer">
            <DataTable columns={columns} data={table.getRowModel().rows.map(r => r.original)} />
          </div>
          <DataTablePagination table={table} />
        </div>
      )}

      <RequestLogDrawer
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        log={selectedLog}
      />
    </div>
  );
}
