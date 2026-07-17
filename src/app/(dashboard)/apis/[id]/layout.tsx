'use client';

import { use, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { WorkspaceLayout, WorkspaceTab } from '@/components/layout/WorkspaceLayout';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { WorkspaceSkeleton } from '@/components/ui/Skeletons';
import { apisClient } from '@/lib/api-client/apis';
import { Plus, Play } from 'lucide-react';
import { AddEndpointDialog } from '@/components/ui/AddEndpointDialog';
import { useRouter } from 'next/navigation';

export default function ApiWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pathname = usePathname();
  const router = useRouter();
  const [api, setApi] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAddEndpointOpen, setIsAddEndpointOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await apisClient.getOverview(id);
        setApi({
          name: res.api?.displayName || 'Unknown API',
          version: res.api?.activeVersions > 0 ? `v${res.api.activeVersions}` : 'v1.0.0',
          versionId: res.versions?.[0]?.id || '',
          health: 'HEALTHY',
          requestsToday: res.api?.requestsToday || 0,
          latency: '0ms',
          clients: res.clients?.length || 0,
          gatewayStatus: 'HEALTHY'
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();

    const intervalId = setInterval(() => {
      load();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [id]);

  if (loading) return <WorkspaceSkeleton />;
  if (!api) return <div>API not found.</div>;

  const tabs: WorkspaceTab[] = [
    { name: 'Overview', href: `/apis/${id}`, isActive: pathname === `/apis/${id}` },
    { name: 'Endpoints', href: `/apis/${id}/endpoints`, isActive: pathname.includes('/endpoints') },
    { name: 'Usage', href: `/apis/${id}/usage`, isActive: pathname.includes('/usage') },
    { name: 'Clients', href: `/apis/${id}/clients`, isActive: pathname.includes('/clients') },
    { name: 'Keys', href: `/apis/${id}/keys`, isActive: pathname.includes('/keys') },
    { name: 'Logs', href: `/apis/${id}/logs`, isActive: pathname.includes('/logs') },
    { name: 'Health', href: `/apis/${id}/health`, isActive: pathname.includes('/health') },
    { name: 'Docs', href: `/apis/${id}/docs`, isActive: pathname.includes('/docs') },
    { name: 'Settings', href: `/apis/${id}/settings`, isActive: pathname.includes('/settings') },
  ];

  const actions = (
    <>
      <button onClick={() => setIsAddEndpointOpen(true)} className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
        <Plus className="mr-2 h-4 w-4" />
        Add Endpoint
      </button>
      <button onClick={() => alert("Deploying Gateway config to Edge...")} className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
        <Play className="mr-2 h-4 w-4" />
        Deploy
      </button>
    </>
  );

  const topMetrics = (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>
        <HealthBadge status={api.health} />
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-700 dark:text-gray-300">Gateway:</span>
        <HealthBadge status={api.gatewayStatus} />
      </div>
      <div>
        <span className="font-medium text-gray-700 dark:text-gray-300">Version:</span> {api.version}
      </div>
      <div>
        <span className="font-medium text-gray-700 dark:text-gray-300">Requests Today:</span> {api.requestsToday}
      </div>
      <div>
        <span className="font-medium text-gray-700 dark:text-gray-300">Avg Latency:</span> {api.latency}
      </div>
      <div>
        <span className="font-medium text-gray-700 dark:text-gray-300">Active Clients:</span> {api.clients}
      </div>
    </div>
  );

  return (
    <WorkspaceLayout
      breadcrumbs={[
        { name: 'APIs', href: '/apis' },
        { name: api.name, href: `/apis/${id}` }
      ]}
      title={api.name}
      actions={actions}
      tabs={tabs}
      metrics={topMetrics}
    >
      {children}
      <AddEndpointDialog 
        isOpen={isAddEndpointOpen}
        onClose={() => setIsAddEndpointOpen(false)}
        apiVersionId={api.versionId}
        versionName={api.version}
        apiClientCreate={(data) => apisClient.createEndpoint(id, data)}
        onSuccess={() => {
          // You could trigger a re-fetch here if needed
        }}
      />
    </WorkspaceLayout>
  );
}
