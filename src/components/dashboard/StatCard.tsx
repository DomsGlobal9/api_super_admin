import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, icon: Icon, description, trend, className }: StatCardProps) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950", className)}>
      <div className="p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">{title}</dt>
              <dd>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      {(description || trend) && (
        <div className="bg-gray-50 px-6 py-3 dark:bg-gray-900">
          <div className="text-sm">
            {trend && (
              <span className={cn("font-medium", trend.isPositive ? "text-green-600" : "text-red-600")}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            )}
            {description && <span className="text-gray-500 dark:text-gray-400 ml-2">{description}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
