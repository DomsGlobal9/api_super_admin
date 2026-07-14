'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ShieldAlert } from 'lucide-react';

export default function AuditLogsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Global Audit Logs"
        description="Comprehensive audit trail of all actions performed by administrators and system processes."
      />

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 p-6 lg:p-10">
        <EmptyState
          icon={ShieldAlert}
          title="Audit System Active"
          description="Global audit log UI is currently under construction. All administrative actions (client creation, module updates, key revocations) are actively being logged to the database and will appear here in a future update."
        />
      </div>
    </div>
  );
}
