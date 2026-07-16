'use client';

import { use, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { WorkspaceLayout, WorkspaceTab } from '@/components/layout/WorkspaceLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { WorkspaceSkeleton } from '@/components/ui/Skeletons';
import { clientsApi } from '@/lib/api-client/clients';
import { Key, Cpu } from 'lucide-react';
import { CreateKeyDialog } from '@/components/ui/CreateKeyDialog';
import { AssignApiDialog } from '@/components/ui/AssignApiDialog';

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
  const [isApiOpen, setIsApiOpen] = useState(false);

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
    { name: 'APIs', href: `/clients/${id}/apis`, isActive: pathname.includes('/apis') },
    { name: 'Keys', href: `/clients/${id}/keys`, isActive: pathname.includes('/keys') },
    { name: 'Usage', href: `/clients/${id}/usage`, isActive: pathname.includes('/usage') },
    { name: 'Logs', href: `/clients/${id}/logs`, isActive: pathname.includes('/logs') },
    { name: 'Health', href: `/clients/${id}/health`, isActive: pathname.includes('/health') },
    { name: 'Audit', href: `/clients/${id}/audit`, isActive: pathname.includes('/audit') },
    { name: 'Settings', href: `/clients/${id}/settings`, isActive: pathname.includes('/settings') },
  ];



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
        onClick={() => setIsApiOpen(true)}
        className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <Cpu className="mr-2 h-4 w-4" />
        Assign API
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
      
      <AssignApiDialog 
        isOpen={isApiOpen}
        onClose={() => setIsApiOpen(false)}
        clientId={id}
        onSuccess={loadClient}
      />

    </WorkspaceLayout>
  );
}
