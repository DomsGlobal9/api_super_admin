import { StatCard } from '@/components/dashboard/StatCard';
import { Users, Cpu, Activity, TrendingUp } from 'lucide-react';

export default function ModuleOverviewPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Subscriptions" value="120" icon={Users} trend={{ value: 12, isPositive: true }} />
        <StatCard title="APIs in Module" value="2" icon={Cpu} />
        <StatCard title="Total API Calls (24h)" value="8.5M" icon={Activity} />
        <StatCard title="MRR Contribution" value="$45,000" icon={TrendingUp} />
      </div>
      
      <div className="bg-white dark:bg-gray-950 p-6 rounded-xl border border-gray-200 dark:border-gray-800 text-center text-gray-500">
        Module description and linked API summary list will appear here.
      </div>
    </div>
  );
}
