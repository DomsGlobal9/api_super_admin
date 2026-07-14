import { cn } from '@/lib/utils';
import { Activity, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';

export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';

interface HealthBadgeProps {
  status: HealthStatus | string;
  className?: string;
  showIcon?: boolean;
}

export function HealthBadge({ status, className, showIcon = true }: HealthBadgeProps) {
  const upperStatus = status.toUpperCase();

  const config = {
    HEALTHY: {
      style: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400 border-green-200 dark:border-green-500/30',
      icon: Activity,
    },
    DEGRADED: {
      style: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
      icon: AlertTriangle,
    },
    DOWN: {
      style: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400 border-red-200 dark:border-red-500/30',
      icon: XCircle,
    },
    UNKNOWN: {
      style: 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-400 border-gray-200 dark:border-gray-500/30',
      icon: HelpCircle,
    },
  };

  const current = config[upperStatus as keyof typeof config] || config.UNKNOWN;
  const Icon = current.icon;

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', current.style, className)}>
      {showIcon && <Icon className="mr-1.5 h-3 w-3" aria-hidden="true" />}
      {upperStatus}
    </span>
  );
}
