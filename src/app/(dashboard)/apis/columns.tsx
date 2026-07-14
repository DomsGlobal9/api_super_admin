'use client';

import { ColumnDef } from '@tanstack/react-table';
import { HealthBadge } from '@/components/ui/HealthBadge';
import Link from 'next/link';
import { Cpu } from 'lucide-react';

export type ApiListDTO = {
  id: string;
  name: string;
  module: string;
  activeVersions: number;
  totalEndpoints: number;
  requestsToday: number;
  health: string;
};

export const columns: ColumnDef<ApiListDTO>[] = [
  {
    accessorKey: 'name',
    header: 'API Name',
    cell: ({ row }) => {
      const id = row.original.id;
      return (
        <Link href={`/apis/${id}`} className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-2">
          <Cpu className="h-4 w-4 text-gray-400" />
          {row.getValue('name')}
        </Link>
      );
    },
  },
  {
    accessorKey: 'module',
    header: 'Module',
    cell: ({ row }) => (
      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        {row.getValue('module')}
      </span>
    ),
  },
  {
    accessorKey: 'activeVersions',
    header: 'Versions',
    cell: ({ row }) => <span className="font-medium text-gray-700 dark:text-gray-300">{row.getValue<number>('activeVersions')}</span>,
  },
  {
    accessorKey: 'totalEndpoints',
    header: 'Endpoints',
    cell: ({ row }) => <span className="font-medium text-gray-700 dark:text-gray-300">{row.getValue<number>('totalEndpoints')}</span>,
  },
  {
    accessorKey: 'requestsToday',
    header: 'Usage (24h)',
    cell: ({ row }) => <span className="font-medium">{row.getValue<number>('requestsToday').toLocaleString()}</span>,
  },
  {
    accessorKey: 'health',
    header: 'Health',
    cell: ({ row }) => <HealthBadge status={row.getValue('health')} />,
  }
];
