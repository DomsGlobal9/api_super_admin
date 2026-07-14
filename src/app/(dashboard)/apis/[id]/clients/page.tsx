import { EmptyState } from '@/components/ui/EmptyState';
import { Users } from 'lucide-react';

export default function ClientsTab() {
  return (
    <EmptyState
      icon={Users}
      title="Connected Clients"
      description="See which clients are actively routing traffic to this API."
    />
  );
}
