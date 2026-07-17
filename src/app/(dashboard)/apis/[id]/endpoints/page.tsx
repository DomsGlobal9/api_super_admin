'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { EndpointDrawer } from '@/components/ui/EndpointDrawer';
import { AddEndpointDialog } from '@/components/ui/AddEndpointDialog';
import { Plus, Settings2, Server } from 'lucide-react';
import { apisClient } from '@/lib/api-client/apis';
import { TableSkeleton } from '@/components/ui/Skeletons';

export default function ApiEndpointsPage() {
  const params = useParams();
  const apiId = params.id as string;
  
  const [versions, setVersions] = useState<any[]>([]);
  const [api, setApi] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedEndpoint, setSelectedEndpoint] = useState<any | null>(null);
  
  // State for Add Endpoint Dialog
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeVersionForAdd, setActiveVersionForAdd] = useState<{ id: string, version: string } | null>(null);

  const loadEndpoints = async () => {
    try {
      setLoading(true);
      const [versionsData, overviewData] = await Promise.all([
        apisClient.getEndpoints(apiId),
        apisClient.getOverview(apiId)
      ]);
      setVersions(versionsData || []);
      setApi(overviewData?.api || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load endpoints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (apiId) {
      loadEndpoints();
    }
  }, [apiId]);

  const openAddDialog = (versionId: string, versionName: string) => {
    setActiveVersionForAdd({ id: versionId, version: versionName });
    setIsAddOpen(true);
  };

  if (loading) return <TableSkeleton rows={8} />;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-8">
      {versions.map((v) => (
        <div key={v.id} className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
          {/* Version Header */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4 bg-gray-50 dark:bg-gray-900 rounded-t-xl">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{v.version}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${v.status === 'ACTIVE' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/20 dark:text-green-400' : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400'}`}>
                {v.status}
              </span>
            </div>
          </div>

          {/* Endpoints List */}
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {v.endpoints && v.endpoints.length > 0 ? (
              v.endpoints.map((ep: any) => (
                <div 
                  key={ep.id} 
                  className="flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedEndpoint(ep)}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono w-16 text-center ${
                        ep.method === 'GET' ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
                        ep.method === 'POST' ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                        ep.method === 'DELETE' ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                        "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                      }`}>
                        {ep.method}
                      </span>
                      <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">{ep.path}</span>
                      <span className="text-sm text-gray-500">{ep.name}</span>
                    </div>
                    {api?.slug && (
                      <div className="flex items-center text-xs text-gray-400 dark:text-gray-500 ml-[80px]">
                        <span className="font-mono">https://api.scaleeasy.com/gateway/{api.slug}{ep.path}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-8 text-sm text-gray-500 dark:text-gray-400">
                    <div className="hidden lg:block w-24 text-right">
                      {ep.requests || 0} reqs
                    </div>
                    <div className="w-24 text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${ep.status === 'ACTIVE' || ep.status === 'HEALTHY' ? 'text-green-600 bg-green-50' : 'text-amber-600 bg-amber-50'}`}>
                        {ep.status || 'ACTIVE'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-sm text-gray-500">
                No endpoints configured for this version yet.
              </div>
            )}
          </div>
          
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-b-xl border-t border-gray-200 dark:border-gray-800">
            <button 
              onClick={() => openAddDialog(v.id, v.version)}
              className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-400 dark:hover:text-gray-300 flex items-center justify-center transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Endpoint to {v.version}
            </button>
          </div>
        </div>
      ))}

      {versions.length === 0 && (
        <div className="text-center p-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 mb-4">No API Versions found. Create a version first to add endpoints.</p>
        </div>
      )}

      <EndpointDrawer 
        isOpen={!!selectedEndpoint} 
        onClose={() => setSelectedEndpoint(null)} 
        endpoint={selectedEndpoint} 
      />

      <AddEndpointDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        apiVersionId={activeVersionForAdd?.id || ''}
        versionName={activeVersionForAdd?.version || ''}
        apiClientCreate={(data) => apisClient.createEndpoint(apiId, data)}
        onSuccess={() => {
          loadEndpoints(); // refresh data
        }}
      />
    </div>
  );
}
