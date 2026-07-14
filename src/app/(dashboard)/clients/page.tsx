'use client';

import { useEffect, useState } from 'react';
import { clientsApi } from '@/lib/api-client/clients';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/data-table/DataTable';
import { DataTablePagination } from '@/components/ui/data-table/DataTablePagination';
import { DataTableToolbar } from '@/components/ui/data-table/DataTableToolbar';
import { TableSkeleton } from '@/components/ui/Skeletons';
import { columns, ClientListDTO } from './columns';
import { Plus } from 'lucide-react';
import { getCoreRowModel, useReactTable, getPaginationRowModel, getFilteredRowModel } from '@tanstack/react-table';
import { CreateClientModal } from '@/components/ui/CreateClientModal';

export default function ClientsPage() {
  const [data, setData] = useState<ClientListDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadClients = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await clientsApi.list({ pageSize: 100 });
      
      const clientsArray = Array.isArray(result) ? result : [];
      const mappedData = clientsArray.map((c: any) => ({
        id: c.id,
        companyName: c.companyName,
        status: c.status,
        subscriptionPlan: c.subscriptions?.[0]?.plan || 'NONE',
        modules: c.subscriptions?.[0]?.allowedModules?.map((am: any) => am.module.name) || [],
        apiCount: 0,
        requestsToday: c._count?.requestLogs || 0, 
        successRate: 100,
        lastRequestAt: c.lastRequestAt || c.updatedAt, 
        apiKeyCount: c._count?.apiKeys || 0,
      }));
      
      setData(mappedData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
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
        title="Clients" 
        description="Manage all provisioned API clients, subscriptions, and quotas."
        actions={
          <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 bg-indigo-600 text-white hover:bg-indigo-700 h-10 px-4 py-2">
            <Plus className="mr-2 h-4 w-4" />
            Provision Client
          </button>
        }
      />

      {loading ? (
        <TableSkeleton rows={10} />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 p-6 rounded-xl text-center">
          <div className="text-red-600 font-medium mb-2">Error loading clients</div>
          <div className="text-sm text-red-500 mb-4">{error}</div>
          <button 
            onClick={loadClients}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-red-200 bg-white text-red-600 hover:bg-red-50 h-9 px-4 py-2"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <DataTableToolbar table={table} searchKey="companyName" searchPlaceholder="Search clients by company name..." />
          <DataTable columns={columns} data={table.getRowModel().rows.map(r => r.original)} />
          <DataTablePagination table={table} />
        </div>
      )}

      <CreateClientModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={loadClients} 
      />
    </div>
  );
}
