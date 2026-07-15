import { EmptyState } from '@/components/ui/EmptyState';
import { Settings } from 'lucide-react';

export default function SettingsTab() {
  return (
    <EmptyState
      icon={Settings}
      title="API Settings"
      description="Advanced configuration and routing rules."
    />
  );
}
