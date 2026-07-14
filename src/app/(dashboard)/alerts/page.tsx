import { PageHeader } from '@/components/ui/PageHeader';
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

export default function AlertsPage() {
  return (
    <div className="space-y-8">
      <PageHeader 
        title="Platform Alerts" 
        description="Active anomalies, SLA breaches, and infrastructure warnings."
      />

      <div className="space-y-6">
        {/* Critical Alerts */}
        <div>
          <h2 className="text-lg font-bold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Critical (1)
          </h2>
          <div className="bg-white dark:bg-gray-950 border border-red-200 dark:border-red-900/30 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="font-semibold text-red-900 dark:text-red-300 text-lg">Inventory API Sync Failure</span>
                <span className="text-sm text-red-700 dark:text-red-400">Source: External Sync Partner Cluster</span>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-white dark:bg-gray-900 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-md text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">Acknowledge</button>
                <button className="px-3 py-1.5 bg-red-600 text-white border border-transparent rounded-md text-sm font-medium hover:bg-red-700 transition-colors">Resolve</button>
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-gray-950 flex flex-wrap gap-x-8 gap-y-4 text-sm">
              <div>
                <span className="text-gray-500 block mb-1 uppercase text-xs tracking-wider font-medium">Status</span>
                <span className="text-red-700 dark:text-red-400 font-semibold flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Active</span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1 uppercase text-xs tracking-wider font-medium">Started</span>
                <span className="text-gray-900 dark:text-gray-100">Today at 14:32</span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1 uppercase text-xs tracking-wider font-medium">Duration</span>
                <span className="text-gray-900 dark:text-gray-100">45 minutes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Warning Alerts */}
        <div>
          <h2 className="text-lg font-bold text-amber-700 dark:text-amber-400 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Warning (2)
          </h2>
          <div className="space-y-4">
            <AlertRow 
              title="Elevated Latency Detected" 
              source="TryOn API -> POST /v2/background-remove"
              status="Acknowledged"
              duration="2 hours"
              type="warning"
            />
            <AlertRow 
              title="Approaching Quota Limit" 
              source="Client: Adidas Global"
              status="Active"
              duration="15 minutes"
              type="warning"
            />
          </div>
        </div>

        {/* Info Alerts */}
        <div>
          <h2 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-4 flex items-center gap-2">
            <Info className="h-5 w-5" />
            Information (1)
          </h2>
          <div className="space-y-4">
            <AlertRow 
              title="Scheduled Maintenance Window Approaching" 
              source="System"
              status="Scheduled"
              duration="In 14 hours"
              type="info"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertRow({ title, source, status, duration, type }: { title: string, source: string, status: string, duration: string, type: 'warning' | 'info' }) {
  const isWarning = type === 'warning';
  
  return (
    <div className={`border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-gray-950 ${isWarning ? 'border-amber-200 dark:border-amber-900/30' : 'border-blue-200 dark:border-blue-900/30'}`}>
      <div className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isWarning ? 'bg-amber-50/50 dark:bg-amber-900/10' : 'bg-blue-50/50 dark:bg-blue-900/10'}`}>
        <div>
          <span className={`font-semibold text-lg block ${isWarning ? 'text-amber-900 dark:text-amber-300' : 'text-blue-900 dark:text-blue-300'}`}>{title}</span>
          <span className={`text-sm mt-1 ${isWarning ? 'text-amber-700 dark:text-amber-400' : 'text-blue-700 dark:text-blue-400'}`}>Source: {source}</span>
        </div>
        <div className="flex gap-2">
          {status !== 'Acknowledged' && (
            <button className={`px-3 py-1.5 bg-white dark:bg-gray-900 border rounded-md text-sm font-medium transition-colors ${isWarning ? 'text-amber-700 border-amber-200 hover:bg-amber-50' : 'text-blue-700 border-blue-200 hover:bg-blue-50'}`}>Acknowledge</button>
          )}
          <button className={`px-3 py-1.5 text-white border border-transparent rounded-md text-sm font-medium transition-colors ${isWarning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>Resolve</button>
        </div>
      </div>
      <div className="p-4 flex flex-wrap gap-x-8 gap-y-4 text-sm border-t border-gray-100 dark:border-gray-800">
        <div>
          <span className="text-gray-500 block mb-1 uppercase text-xs tracking-wider font-medium">Status</span>
          <span className="text-gray-900 dark:text-gray-100 font-medium">{status}</span>
        </div>
        <div>
          <span className="text-gray-500 block mb-1 uppercase text-xs tracking-wider font-medium">Duration/Time</span>
          <span className="text-gray-900 dark:text-gray-100">{duration}</span>
        </div>
      </div>
    </div>
  );
}
