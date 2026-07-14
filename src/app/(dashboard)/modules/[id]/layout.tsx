'use client';

import { use } from 'react';
import { usePathname } from 'next/navigation';
import { WorkspaceLayout, WorkspaceTab } from '@/components/layout/WorkspaceLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Edit, Link as LinkIcon } from 'lucide-react';

export default function ModuleWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pathname = usePathname();
  
  // Mock module data
  const moduleName = id === 'mod_tryon' ? 'Virtual Try-On' : 'Inventory Sync';

  const tabs: WorkspaceTab[] = [
    { name: 'Overview', href: `/modules/${id}`, isActive: pathname === `/modules/${id}` },
    { name: 'APIs', href: `/modules/${id}/apis`, isActive: pathname.includes('/apis') },
    { name: 'Clients', href: `/modules/${id}/clients`, isActive: pathname.includes('/clients') },
    { name: 'Usage', href: `/modules/${id}/usage`, isActive: pathname.includes('/usage') },
    { name: 'Analytics', href: `/modules/${id}/analytics`, isActive: pathname.includes('/analytics') },
    { name: 'Settings', href: `/modules/${id}/settings`, isActive: pathname.includes('/settings') },
  ];

  const actions = (
    <>
      <button className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
        <LinkIcon className="mr-2 h-4 w-4" />
        Link API
      </button>
      <button className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
        <Edit className="mr-2 h-4 w-4" />
        Edit Module
      </button>
    </>
  );

  return (
    <WorkspaceLayout
      breadcrumbs={[
        { name: 'Modules', href: '/modules' },
        { name: moduleName, href: `/modules/${id}` }
      ]}
      title={moduleName}
      statusBadge={<StatusBadge status="ACTIVE" />}
      actions={actions}
      tabs={tabs}
    >
      {children}
    </WorkspaceLayout>
  );
}
