import { EmptyState } from '@/components/ui/EmptyState';
import { Activity } from 'lucide-react';

export default function UsageTab() {
  return (
    <EmptyState
      icon={Activity}
      title="API Usage Metrics"
      description="Detailed analytics and request volume will appear here soon."
    />
  );
}
