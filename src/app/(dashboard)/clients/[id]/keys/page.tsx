import { EmptyState } from '@/components/ui/EmptyState';
import { Key } from 'lucide-react';

export default function KeysTab() {
  return (
    <EmptyState
      icon={Key}
      title="API Keys"
      description="API key generation and revocation controls will appear here."
    />
  );
}
