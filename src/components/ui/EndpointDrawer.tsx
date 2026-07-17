import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HealthBadge } from './HealthBadge';

interface EndpointDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  endpoint: any | null; // Replace with proper DTO later
}

export function EndpointDrawer({ isOpen, onClose, endpoint }: EndpointDrawerProps) {
  if (!isOpen || !endpoint) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={cn(
        "fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white dark:bg-gray-950 shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-gray-200 dark:border-gray-800 flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3">
              <span className={cn(
                "px-2 py-0.5 rounded text-xs font-bold font-mono",
                endpoint.method === 'GET' ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
                endpoint.method === 'POST' ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                endpoint.method === 'DELETE' ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
              )}>
                {endpoint.method}
              </span>
              <span className="font-mono">{endpoint.path}</span>
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <HealthBadge status={endpoint.status || 'HEALTHY'} />
            <button
              onClick={onClose}
              className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <span className="sr-only">Close panel</span>
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="border-b border-gray-200 dark:border-gray-800 px-6">
              <button
                className="border-indigo-500 text-indigo-600 dark:text-indigo-400 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium"
              >
                General
              </button>
          </div>

          <div className="p-6 space-y-6">
            {/* General Content */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Endpoint Configuration</h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Backend Target Path</dt>
                  <dd className="mt-1 text-sm font-mono text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-800">
                    {endpoint.backendPath ? endpoint.backendPath : <span className="text-gray-400 italic">Inherited from API Gateway</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Timeout (ms)</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{endpoint.timeoutMs || 30000}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Payload Limit</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {endpoint.payloadLimit ? `${Math.round(endpoint.payloadLimit / 1024 / 1024)} MB` : 'Default'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Visibility</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 capitalize">{endpoint.visibility || 'Public'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Requests</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{endpoint.requests || 0}</dd>
                </div>
              </dl>
            </div>
            
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700">
            Close Panel
          </button>
        </div>
      </div>
    </>
  );
}
