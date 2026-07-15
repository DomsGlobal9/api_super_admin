'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Blocks, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { modulesClient } from '@/lib/api-client/modules';
import { CreateModuleDialog } from '@/components/ui/CreateModuleDialog';

// Using a simplified view for the Modules index since it's typically a very small list (TryOn, Inventory, etc.)
export default function ModulesPage() {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadModules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await modulesClient.list({ pageSize: 100 });
      const modsArray = Array.isArray(res) ? res : [];
      setModules(modsArray);
    } catch (err: any) {
      setError(err.message || 'Failed to load modules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Modules"
        description="High-level product modules that bundle APIs together for client subscriptions."
        actions={
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 bg-indigo-600 text-white hover:bg-indigo-700 h-10 px-4 py-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Module
          </button>
        }
      />

      {loading && <div className="space-y-4 animate-pulse"><div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-xl"></div></div>}
      {error && <div className="p-4 bg-red-50 text-red-500 rounded-md">Error: {error}</div>}
      {!loading && !error && modules.length === 0 && <div>No modules found.</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((mod) => (
          <Link href={`/modules/${mod.id}`} key={mod.id} className="block group">
            <div className="bg-white dark:bg-gray-950 p-6 rounded-xl border border-gray-200 dark:border-gray-800 transition-all hover:border-indigo-500 hover:shadow-md dark:hover:border-indigo-500/50">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 transition-colors">
                  <Blocks className="h-6 w-6" />
                </div>
                <StatusBadge status={mod.status} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{mod.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">{mod.description || 'No description provided.'}</p>
              </div>
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-sm">
                <span className="text-gray-500">Endpoints: {mod._count?.endpoints || 0}</span>
                <span className="text-indigo-600 font-medium group-hover:underline">Manage &rarr;</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      <CreateModuleDialog 
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => loadModules()}
      />
    </div>
  );
}
