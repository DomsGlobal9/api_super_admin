'use client';

import { use, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { WorkspaceLayout, WorkspaceTab } from '@/components/layout/WorkspaceLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { WorkspaceSkeleton } from '@/components/ui/Skeletons';
import { clientsApi } from '@/lib/api-client/clients';
import { Key, Blocks, Ban } from 'lucide-react';
import { CreateKeyDialog } from '@/components/ui/CreateKeyDialog';
import { AssignModuleDialog } from '@/components/ui/AssignModuleDialog';

export default function ClientWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pathname = usePathname();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [isKeyOpen, setIsKeyOpen] = useState(false);
  const [isModuleOpen, setIsModuleOpen] = useState(false);

  const loadClient = async () => {
      try {
        const res = await clientsApi.getOverview(id);
        setClient(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    loadClient();
  }, [id]);

  if (loading) return <WorkspaceSkeleton />;
  if (!client) return <div>Client not found.</div>;

  const tabs: WorkspaceTab[] = [
    { name: 'Overview', href: `/clients/${id}`, isActive: pathname === `/clients/${id}` },
    { name: 'Subscriptions', href: `/clients/${id}/subscriptions`, isActive: pathname.includes('/subscriptions') },
    { name: 'Modules', href: `/clients/${id}/modules`, isActive: pathname.includes('/modules') },
    { name: 'APIs', href: `/clients/${id}/apis`, isActive: pathname.includes('/apis') },
    { name: 'Keys', href: `/clients/${id}/keys`, isActive: pathname.includes('/keys') },
    { name: 'Usage', href: `/clients/${id}/usage`, isActive: pathname.includes('/usage') },
    { name: 'Logs', href: `/clients/${id}/logs`, isActive: pathname.includes('/logs') },
    { name: 'Health', href: `/clients/${id}/health`, isActive: pathname.includes('/health') },
    { name: 'Audit', href: `/clients/${id}/audit`, isActive: pathname.includes('/audit') },
    { name: 'Settings', href: `/clients/${id}/settings`, isActive: pathname.includes('/settings') },
  ];

  const handleSuspend = async () => {
    try {
      const newStatus = client.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
      const updated = await clientsApi.update(id, { status: newStatus });
      setClient(updated);
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const isSuspended = client.status === 'SUSPENDED';

  const actions = (
    <>
      <button 
        onClick={() => setIsKeyOpen(true)}
        className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <Key className="mr-2 h-4 w-4" />
        Create Key
      </button>
      <button 
        onClick={() => setIsModuleOpen(true)}
        className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <Blocks className="mr-2 h-4 w-4" />
        Assign Module
      </button>
      <button 
        onClick={handleSuspend}
        className={`inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
          isSuspended 
            ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40'
            : 'border-gray-300 bg-white text-orange-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-orange-500 dark:hover:bg-gray-900'
        }`}
      >
        <Ban className="mr-2 h-4 w-4" />
        {isSuspended ? 'Activate' : 'Suspend'}
      </button>
    </>
  );

  return (
    <WorkspaceLayout
      breadcrumbs={[
        { name: 'Clients', href: '/clients' },
        { name: client.companyName, href: `/clients/${id}` }
      ]}
      title={client.companyName}
      statusBadge={<StatusBadge status={client.status} />}
      actions={actions}
      tabs={tabs}
    >
      {children}
      
      <CreateKeyDialog 
        isOpen={isKeyOpen}
        onClose={() => setIsKeyOpen(false)}
        clientId={id}
        onSuccess={loadClient}
      />
      
      <AssignModuleDialog 
        isOpen={isModuleOpen}
        onClose={() => setIsModuleOpen(false)}
        clientId={id}
        onSuccess={loadClient}
      />
    </WorkspaceLayout>
  );
}
