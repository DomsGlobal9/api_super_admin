import { EmptyState } from '@/components/ui/EmptyState';
import { Cpu } from 'lucide-react';

export default function APIsTab() {
  return (
    <EmptyState
      icon={Cpu}
      title="Assigned APIs"
      description="List of all APIs accessible to this client will appear here."
    />
  );
}
