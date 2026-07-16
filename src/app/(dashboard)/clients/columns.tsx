'use client';

import { ColumnDef } from '@tanstack/react-table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import Link from 'next/link';

export type ClientListDTO = {
  id: string;
  companyName: string;
  status: string;
  subscriptionPlan: string;
  modules: string[];
  apiCount: number;
  requestsToday: number;
  successRate: number;
  lastRequestAt: string | null;
  apiKeyCount: number;
};

export const columns: ColumnDef<ClientListDTO>[] = [
  {
    accessorKey: 'companyName',
    header: 'Client',
    cell: ({ row }) => {
      const id = row.original.id;
      return (
        <Link href={`/clients/${id}`} className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
          {row.getValue('companyName')}
        </Link>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
  },
  {
    accessorKey: 'subscriptionPlan',
    header: 'Subscription',
    cell: ({ row }) => (
      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-400/10 dark:text-blue-400 dark:ring-blue-400/30">
        {row.getValue('subscriptionPlan')}
      </span>
    ),
  },
  {
    accessorKey: 'modules',
    header: 'Modules',
    cell: ({ row }) => {
      const mods = row.getValue<string[]>('modules');
      return (
        <div className="flex gap-1 flex-wrap max-w-[150px]">
          {mods.map((mod, i) => (
            <span key={i} className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 rounded">{mod}</span>
          ))}
        </div>
      );
    }
  },
  {
    accessorKey: 'requestsToday',
    header: 'Requests Today',
    cell: ({ row }) => <span className="font-medium">{row.getValue<number>('requestsToday').toLocaleString()}</span>,
  },
  {
    accessorKey: 'successRate',
    header: 'Success %',
    cell: ({ row }) => {
      const rate = row.getValue<number>('successRate');
      return (
        <span className={rate >= 99 ? 'text-green-600 dark:text-green-400 font-medium' : 'text-orange-600 dark:text-orange-400 font-medium'}>
          {rate}%
        </span>
      );
    },
  },
  {
    accessorKey: 'lastRequestAt',
    header: 'Last Request',
    cell: ({ row }) => {
      const date = row.getValue<string>('lastRequestAt');
      return <span className="text-gray-500 text-xs">{date ? new Date(date).toLocaleString() : 'Never'}</span>;
    },
  }
];
