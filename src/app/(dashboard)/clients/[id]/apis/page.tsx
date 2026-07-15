'use client';

import { use, useEffect, useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Cpu, Server } from 'lucide-react';
import { clientsApi } from '@/lib/api-client/clients';
import { TableSkeleton } from '@/components/ui/Skeletons';

export default function APIsTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [assignedApis, setAssignedApis] = useState<any[]>([]);

  useEffect(() => {
    clientsApi.getOverview(id)
      .then(client => {
        setAssignedApis(client.clientAccess || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <TableSkeleton rows={3} />;

  if (assignedApis.length === 0) {
    return (
      <EmptyState
        icon={Cpu}
        title="No Assigned APIs"
        description="Click 'Assign API' at the top to grant this client access to your microservices."
      />
    );
  }

  return (
    <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">API Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target URL</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Date</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-950 divide-y divide-gray-200 dark:divide-gray-800">
            {assignedApis.map((access: any) => (
              <tr key={access.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Server className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {access.microservice.displayName || access.microservice.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {access.microservice.slug}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/api/gateway/{access.microservice.slug}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(access.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
