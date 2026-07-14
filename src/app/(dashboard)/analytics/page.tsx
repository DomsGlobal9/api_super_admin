import { PageHeader } from '@/components/ui/PageHeader';
import { LineChart, BarChart, PieChart, Activity, Users, Globe } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <PageHeader 
        title="Historical Analytics" 
        description="Long-term trends, client growth, and SLA compliance metrics."
      />

      <div className="bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-wrap gap-4 items-center">
        <span className="text-sm font-medium text-gray-500">Time Range:</span>
        <select className="text-sm border-gray-300 rounded-md dark:bg-gray-900 dark:border-gray-700 py-1.5 pl-3 pr-8 font-medium">
          <option>Last 30 Days</option>
          <option>Last 90 Days</option>
          <option>Year to Date</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests over 30 days */}
        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6 h-80 flex flex-col items-center justify-center text-center">
          <LineChart className="h-10 w-10 text-indigo-300 mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white">API Requests (30 Days)</h3>
          <p className="text-sm text-gray-500 mt-1">Trend analysis chart goes here</p>
        </div>

        {/* Client Growth */}
        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6 h-80 flex flex-col items-center justify-center text-center">
          <BarChart className="h-10 w-10 text-emerald-300 mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Client Growth</h3>
          <p className="text-sm text-gray-500 mt-1">Monthly active clients and new subscriptions</p>
        </div>

        {/* SLA Compliance */}
        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6 h-80 flex flex-col items-center justify-center text-center">
          <Activity className="h-10 w-10 text-amber-300 mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white">SLA Compliance</h3>
          <p className="text-sm text-gray-500 mt-1">Uptime vs Target SLA historical comparison</p>
        </div>

        {/* API Adoption */}
        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6 h-80 flex flex-col items-center justify-center text-center">
          <PieChart className="h-10 w-10 text-blue-300 mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white">API Adoption Share</h3>
          <p className="text-sm text-gray-500 mt-1">Distribution of traffic across module APIs</p>
        </div>
      </div>
    </div>
  );
}
