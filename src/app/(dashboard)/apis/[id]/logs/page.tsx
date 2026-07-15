import { EmptyState } from '@/components/ui/EmptyState';
import { FileText } from 'lucide-react';

export default function LogsTab() {
  return (
    <EmptyState
      icon={FileText}
      title="Request Logs"
      description="Live traffic and request logs for this API will appear here."
    />
  );
}
