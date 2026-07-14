'use client';

import { ColumnDef } from '@tanstack/react-table';
import { FileText, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RequestLogDTO = {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  latencyMs: number;
  clientName: string;
  apiKeyPrefix: string;
  cacheHit: boolean;
};

export const columns: ColumnDef<RequestLogDTO>[] = [
  {
    accessorKey: 'timestamp',
    header: 'Time',
    cell: ({ row }) => {
      const date = new Date(row.getValue('timestamp'));
      return (
        <span className="text-gray-500 text-xs">
          {date.toLocaleDateString()} <span className="font-mono text-gray-900 dark:text-gray-100">{date.toLocaleTimeString()}</span>
        </span>
      );
    },
  },
  {
    accessorKey: 'statusCode',
    header: 'Status',
    cell: ({ row }) => {
      const code = row.getValue<number>('statusCode');
      const isSuccess = code >= 200 && code < 300;
      const StatusIcon = isSuccess ? CheckCircle2 : (code >= 500 ? XCircle : AlertTriangle);
      
      return (
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold font-mono border",
          isSuccess ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400" :
          "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400"
        )}>
          {code}
        </span>
      );
    },
  },
  {
    accessorKey: 'method',
    header: 'Method',
    cell: ({ row }) => (
      <span className={cn(
        "px-2 py-0.5 rounded text-xs font-bold font-mono",
        row.getValue('method') === 'GET' ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
        row.getValue('method') === 'POST' ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
        "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
      )}>
        {row.getValue('method')}
      </span>
    )
  },
  {
    accessorKey: 'path',
    header: 'Path',
    cell: ({ row }) => <span className="font-mono text-sm text-gray-900 dark:text-gray-100">{row.getValue('path')}</span>,
  },
  {
    accessorKey: 'latencyMs',
    header: 'Latency',
    cell: ({ row }) => <span className="font-mono text-sm">{row.getValue('latencyMs')}ms</span>,
  },
  {
    accessorKey: 'clientName',
    header: 'Client',
    cell: ({ row }) => <span className="text-gray-700 dark:text-gray-300 font-medium">{row.getValue('clientName')}</span>,
  },
  {
    accessorKey: 'apiKeyPrefix',
    header: 'API Key',
    cell: ({ row }) => <span className="font-mono text-xs text-gray-500">{row.getValue('apiKeyPrefix')}</span>,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      return (
        <button className="text-indigo-600 hover:text-indigo-800 transition-colors p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1 text-xs font-medium">
          <FileText className="h-4 w-4" />
          View Trace
        </button>
      );
    },
  }
];
