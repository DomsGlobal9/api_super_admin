import { EmptyState } from '@/components/ui/EmptyState';
import { HeartPulse } from 'lucide-react';

export default function HealthTab() {
  return (
    <EmptyState
      icon={HeartPulse}
      title="Health Checks"
      description="Automated monitoring and health check history."
    />
  );
}
