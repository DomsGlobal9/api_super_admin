import { X, FileText, Clock, Server, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RequestLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  log: any | null; // Replace with proper RequestLogDTO later
}

export function RequestLogDrawer({ isOpen, onClose, log }: RequestLogDrawerProps) {
  if (!isOpen || !log) return null;

  const isSuccess = log.statusCode >= 200 && log.statusCode < 300;
  const StatusIcon = isSuccess ? CheckCircle2 : (log.statusCode >= 500 ? XCircle : AlertTriangle);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={cn(
        "fixed inset-y-0 right-0 z-50 w-full max-w-3xl bg-white dark:bg-gray-950 shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-gray-200 dark:border-gray-800 flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center gap-4">
            <span className={cn(
              "px-2.5 py-1 rounded text-sm font-bold font-mono border",
              isSuccess ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400" :
              "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400"
            )}>
              {log.statusCode}
            </span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="font-mono text-gray-500">{log.method}</span>
                <span className="font-mono">{log.path}</span>
              </h2>
              <p className="text-xs text-gray-500 font-mono mt-1">Req ID: {log.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <span className="sr-only">Close panel</span>
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Latency</span>
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{log.latencyMs}ms</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                <Server className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Gateway</span>
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">gw-xyz-1</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                <FileText className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Payload</span>
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{log.payloadBytes || '142 B'}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                <StatusIcon className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Cache</span>
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{log.cacheHit ? 'HIT' : 'MISS'}</div>
            </div>
          </div>

          <hr className="border-gray-200 dark:border-gray-800" />

          {/* Context Details */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Request Context</h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Client</dt>
                <dd className="mt-1 text-sm font-medium text-indigo-600 dark:text-indigo-400">{log.clientName || 'Nike'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">API Key</dt>
                <dd className="mt-1 text-sm font-mono text-gray-900 dark:text-gray-100">{log.apiKeyPrefix || 'sk_live_****'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Timestamp</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{new Date(log.timestamp).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Source IP</dt>
                <dd className="mt-1 text-sm font-mono text-gray-900 dark:text-gray-100">{log.ipAddress || '192.168.1.1'}</dd>
              </div>
            </dl>
          </div>

          {/* Raw Data (Headers/Response) */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Request Headers</h3>
            <div className="bg-[#1E1E1E] rounded-md p-4 overflow-x-auto text-gray-300 text-xs font-mono">
              <pre>
{`{
  "host": "api.scaleeasy.com",
  "user-agent": "ScaleEasy-Client/1.0",
  "authorization": "Bearer sk_live_****************",
  "content-type": "application/json"
}`}
              </pre>
            </div>
            
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mt-6">Response Payload (Preview)</h3>
            <div className="bg-[#1E1E1E] rounded-md p-4 overflow-x-auto text-gray-300 text-xs font-mono">
              <pre>
{`{
  "success": true,
  "data": {
    "jobId": "job_948f29ea",
    "status": "processing"
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
