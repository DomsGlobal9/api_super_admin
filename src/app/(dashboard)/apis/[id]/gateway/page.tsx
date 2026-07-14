import { EmptyState } from '@/components/ui/EmptyState';
import { Server } from 'lucide-react';

export default function GatewayTab() {
  return (
    <EmptyState
      icon={Server}
      title="Gateway Configuration"
      description="Set default rate limits, timeouts, and authentication for this API."
    />
  );
}
