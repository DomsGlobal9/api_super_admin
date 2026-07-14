import { EmptyState } from '@/components/ui/EmptyState';
import { GitBranch } from 'lucide-react';

export default function VersionsTab() {
  return (
    <EmptyState
      icon={GitBranch}
      title="API Versions"
      description="Manage semantic versioning, lifecycle statuses, and deprecations here."
    />
  );
}
