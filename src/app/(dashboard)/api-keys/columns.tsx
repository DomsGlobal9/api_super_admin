'use client';

import { ColumnDef } from '@tanstack/react-table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MoreHorizontal, KeyRound, ShieldAlert } from 'lucide-react';

export type ApiKeyDTO = {
  id: string;
  name: string;
  clientName: string;
  subscription: string;
  modules: string[];
  apis: string[];
  status: string;
  lastUsedAt: string | null;
  lastIp: string | null;
  requestsToday: number;
  requestCount: number;
  expiresAt: string | null;
};

export const getColumns = (onAction: (key: ApiKeyDTO) => void): ColumnDef<ApiKeyDTO>[] => [
  {
    accessorKey: 'name',
    header: 'Key Name',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-gray-400" />
        <span className="font-medium text-gray-900 dark:text-gray-100">{row.getValue('name')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'clientName',
    header: 'Owner',
    cell: ({ row }) => <span className="text-gray-700 dark:text-gray-300">{row.getValue('clientName')}</span>,
  },
  {
    accessorKey: 'modules',
    header: 'Scope (Modules)',
    cell: ({ row }) => {
      const mods = row.getValue<string[]>('modules');
      return (
        <div className="flex gap-1 flex-wrap max-w-[120px]">
          {mods.map((mod, i) => (
            <span key={i} className="text-[10px] text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded uppercase tracking-wider">{mod}</span>
          ))}
        </div>
      );
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
  },
  {
    accessorKey: 'lastUsedAt',
    header: 'Last Used',
    cell: ({ row }) => {
      const date = row.getValue<string>('lastUsedAt');
      return <span className="text-gray-500 text-xs">{date ? new Date(date).toLocaleString() : 'Never'}</span>;
    },
  },
  {
    accessorKey: 'lastIp',
    header: 'Last IP',
    cell: ({ row }) => <span className="font-mono text-xs text-gray-500">{row.getValue('lastIp') || 'N/A'}</span>,
  },
  {
    accessorKey: 'requestsToday',
    header: 'Usage (24h)',
    cell: ({ row }) => <span className="font-medium">{row.getValue<number>('requestsToday').toLocaleString()}</span>,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      // In a real app this would trigger the drawer
      return (
        <button 
          onClick={() => onAction(row.original)}
          className="text-gray-400 hover:text-indigo-600 transition-colors p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      );
    },
  }
];
