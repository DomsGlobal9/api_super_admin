'use client';

import { useEffect, useState, useMemo } from 'react';
import { apikeysClient } from '@/lib/api-client/apikeys';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/data-table/DataTable';
import { DataTablePagination } from '@/components/ui/data-table/DataTablePagination';
import { DataTableToolbar } from '@/components/ui/data-table/DataTableToolbar';
import { TableSkeleton } from '@/components/ui/Skeletons';
import { ApiKeyDrawer } from '@/components/ui/ApiKeyDrawer';
import { getColumns, ApiKeyDTO } from './columns';
import { Plus } from 'lucide-react';
import { getCoreRowModel, useReactTable, getPaginationRowModel, getFilteredRowModel, Row } from '@tanstack/react-table';
import { GenerateKeyModal } from '@/components/ui/GenerateKeyModal';

export default function ApiKeysPage() {
  const [data, setData] = useState<ApiKeyDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedKey, setSelectedKey] = useState<ApiKeyDTO | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadKeys = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await apikeysClient.list({ pageSize: 100 });
      
      const keysArray = Array.isArray(result) ? result : [];
      const mappedData = keysArray.map((key: any, index: number) => ({
        id: key.id,
        name: key.name,
        clientName: key.clientName || 'Unknown Client',
        subscription: key.subscription || 'N/A',
        modules: key.modules || [],
        apis: key.apis || [],
        status: key.status,
        lastUsedAt: key.lastUsedAt,
        lastIp: key.lastIp || 'N/A',
        requestsToday: key.requestsToday || 0,
        requestCount: key.requestCount || 0,
        expiresAt: key.expiresAt,
      }));
      
      setData(mappedData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  // Memoize columns so they don't recreate on every render, passing the selectedKey setter
  const columns = useMemo(() => getColumns(setSelectedKey), []);

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
        title="API Keys" 
        description="Security Operations Center (SOC) view of all provisioned credentials."
        actions={
          <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 bg-indigo-600 text-white hover:bg-indigo-700 h-10 px-4 py-2">
            <Plus className="mr-2 h-4 w-4" />
            Generate Key
          </button>
        }
      />

      {loading ? (
        <TableSkeleton rows={8} />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 p-6 rounded-xl text-center">
          <div className="text-red-600 font-medium mb-2">Error loading API Keys</div>
          <div className="text-sm text-red-500 mb-4">{error}</div>
          <button 
            onClick={loadKeys}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-red-200 bg-white text-red-600 hover:bg-red-50 h-9 px-4 py-2"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <DataTableToolbar table={table} searchKey="name" searchPlaceholder="Search keys by name..." />
          <DataTable columns={columns} data={table.getRowModel().rows.map(r => r.original)} />
          <DataTablePagination table={table} />
        </div>
      )}

      <ApiKeyDrawer
        isOpen={!!selectedKey}
        onClose={() => setSelectedKey(null)}
        apiKey={selectedKey}
      />

      <GenerateKeyModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadKeys}
      />
    </div>
  );
}
