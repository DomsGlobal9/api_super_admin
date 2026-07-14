import { EmptyState } from '@/components/ui/EmptyState';
import { Blocks } from 'lucide-react';

export default function ModulesTab() {
  return (
    <EmptyState
      icon={Blocks}
      title="Modules"
      description="Provisioned modules and limits will appear here."
    />
  );
}
