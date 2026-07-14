import { EmptyState } from '@/components/ui/EmptyState';
import { BookOpen } from 'lucide-react';

export default function DocsTab() {
  return (
    <EmptyState
      icon={BookOpen}
      title="API Documentation"
      description="OpenAPI specification and interactive Swagger docs."
    />
  );
}
