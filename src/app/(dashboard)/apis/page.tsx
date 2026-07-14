'use client';

import { useEffect, useState } from 'react';
import { apisClient } from '@/lib/api-client/apis';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/data-table/DataTable';
import { DataTablePagination } from '@/components/ui/data-table/DataTablePagination';
import { DataTableToolbar } from '@/components/ui/data-table/DataTableToolbar';
import { TableSkeleton } from '@/components/ui/Skeletons';
import { columns, ApiListDTO } from './columns';
import { Plus } from 'lucide-react';
import { getCoreRowModel, useReactTable, getPaginationRowModel, getFilteredRowModel } from '@tanstack/react-table';
import { CreateApiDialog } from '@/components/ui/CreateApiDialog';

export default function ApisPage() {
  const [data, setData] = useState<ApiListDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadApis = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await apisClient.list({ pageSize: 100 });
      
      const apisArray = Array.isArray(result) ? result : [];
      const mappedData = apisArray.map((api: any) => ({
        id: api.id,
        name: api.displayName,
        module: api.moduleName || 'Unassigned',
        activeVersions: api.activeVersions || 0,
        totalEndpoints: api.totalEndpoints || 0,
        requestsToday: api.requestsToday || 0,
        health: 'HEALTHY',
      }));
      
      setData(mappedData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApis();
  }, []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      }
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Platform APIs" 
        description="Manage microservices, endpoint configurations, and Gateway routing rules."
        actions={
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 bg-indigo-600 text-white hover:bg-indigo-700 h-10 px-4 py-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            Register API
          </button>
        }
      />

      {loading ? (
        <TableSkeleton rows={8} />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 p-6 rounded-xl text-center">
          <div className="text-red-600 font-medium mb-2">Error loading APIs</div>
          <div className="text-sm text-red-500 mb-4">{error}</div>
          <button 
            onClick={loadApis}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-red-200 bg-white text-red-600 hover:bg-red-50 h-9 px-4 py-2"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <DataTableToolbar table={table} searchKey="name" searchPlaceholder="Search APIs by name..." />
          <DataTable columns={columns} data={table.getRowModel().rows.map(r => r.original)} />
          <DataTablePagination table={table} />
        </div>
      )}

      <CreateApiDialog 
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={loadApis}
      />
    </div>
  );
}
