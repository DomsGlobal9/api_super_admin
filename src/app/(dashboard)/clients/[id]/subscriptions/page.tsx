import { EmptyState } from '@/components/ui/EmptyState';
import { CreditCard } from 'lucide-react';

export default function SubscriptionsTab() {
  return (
    <EmptyState
      icon={CreditCard}
      title="Subscriptions"
      description="Detailed subscription plans and billing cycles will appear here."
    />
  );
}
