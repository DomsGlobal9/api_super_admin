import { cn } from '@/lib/utils';

export type StatusType = 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | 'DEPRECATED' | 'REVOKED' | 'EXPIRED';

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const upperStatus = status.toUpperCase();

  const styles = {
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400 border-green-200 dark:border-green-500/30',
    SUSPENDED: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-400 border-orange-200 dark:border-orange-500/30',
    DISABLED: 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-400 border-gray-200 dark:border-gray-500/30',
    DEPRECATED: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
    REVOKED: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400 border-red-200 dark:border-red-500/30',
    EXPIRED: 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-400 border-gray-200 dark:border-gray-500/30',
  };

  const style = styles[upperStatus as keyof typeof styles] || styles.DISABLED;

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', style, className)}>
      {upperStatus}
    </span>
  );
}
