import { X, ShieldAlert, KeyRound, RotateCcw, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import { apikeysClient } from '@/lib/api-client/apikeys';
import { useState, useEffect } from 'react';

interface ApiKeyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: any | null; 
  onUpdate?: () => void;
}

export function ApiKeyDrawer({ isOpen, onClose, apiKey, onUpdate }: ApiKeyDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rotatedKey, setRotatedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('Details & Permissions');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (isOpen && apiKey?.id && (activeTab === 'Audit History' || activeTab === 'Rotation History')) {
      setLoadingLogs(true);
      apikeysClient.getAuditLogs(apiKey.id)
        .then(data => setAuditLogs(data))
        .catch(err => console.error("Failed to load audit logs", err))
        .finally(() => setLoadingLogs(false));
    }
  }, [isOpen, apiKey?.id, activeTab]);

  if (!isOpen || !apiKey) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={cn(
        "fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white dark:bg-gray-950 shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-gray-200 dark:border-gray-800 flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center gap-3">
            <KeyRound className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {apiKey.name}
            </h2>
            <StatusBadge status={apiKey.status} />
          </div>
          <button
            onClick={() => {
              setError('');
              setRotatedKey(null);
              onClose();
            }}
            className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <span className="sr-only">Close panel</span>
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="border-b border-gray-200 dark:border-gray-800 px-6">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
              {['Details & Permissions', 'Usage', 'Audit History', 'Rotation History'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    activeTab === tab
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
                    'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium'
                  )}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6 space-y-8">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-md text-sm border border-red-200 flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            {rotatedKey && (
              <div className="bg-green-50 text-green-800 border border-green-200 rounded-md p-4 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50">
                <h3 className="font-semibold mb-2 flex items-center">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Key Rotated Successfully
                </h3>
                <p className="text-sm mb-4">Please copy this new key now. The old key has been permanently deactivated.</p>
                <div className="bg-white dark:bg-black p-3 rounded border border-gray-200 dark:border-gray-800 font-mono text-sm break-all">
                  {rotatedKey}
                </div>
              </div>
            )}
            
            {/* Details & Permissions Tab */}
            {activeTab === 'Details & Permissions' && (
              <>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Key Metadata</h3>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Owner Client</dt>
                      <dd className="mt-1 text-sm font-medium text-indigo-600 dark:text-indigo-400">{apiKey.clientName || 'Unknown'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Prefix</dt>
                      <dd className="mt-1 text-sm font-mono text-gray-900 dark:text-gray-100">sk_live_****</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created At</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{new Date(apiKey.createdAt || Date.now()).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Expires At</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{apiKey.expiresAt ? new Date(apiKey.expiresAt).toLocaleString() : 'Never'}</dd>
                    </div>
                  </dl>
                </div>
                
                <hr className="border-gray-200 dark:border-gray-800" />
                
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Module Access Scopes</h3>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-800">
                    {(!apiKey.allowedModules || apiKey.allowedModules.length === 0) ? (
                      <p className="text-sm text-gray-500">Full Access (All Modules)</p>
                    ) : (
                      <ul className="space-y-2">
                        {apiKey.allowedModules.map((m: any) => (
                          <li key={m.moduleId || m} className="flex items-center text-sm font-mono">
                            <span className="w-4 h-4 bg-green-500 rounded-full mr-3 opacity-20 relative"><span className="absolute inset-1 bg-green-500 rounded-full"></span></span>
                            {m.module?.name || m}:* (Full Access)
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Usage Tab */}
            {activeTab === 'Usage' && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">API Usage Statistics</h3>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-800">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Requests</dt>
                    <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{apiKey.requestCount || 0}</dd>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-800">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Used</dt>
                    <dd className="mt-1 text-lg font-medium text-gray-900 dark:text-gray-100">
                      {apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).toLocaleString() : 'Never'}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {/* Audit History Tab */}
            {activeTab === 'Audit History' && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Audit Logs</h3>
                {loadingLogs ? (
                  <div className="text-center py-8 text-gray-500 text-sm">Loading logs...</div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-800">
                    No audit logs available for this key.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
                            {log.action === 'API_KEY_REVOKED' ? <ShieldAlert className="w-4 h-4" /> : 
                             log.action === 'API_KEY_ROTATED' ? <RotateCcw className="w-4 h-4" /> : 
                             <KeyRound className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {log.action.replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              By: {log.adminUser?.name || log.adminUser?.email || 'Unknown User'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Rotation History Tab */}
            {activeTab === 'Rotation History' && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Rotation History</h3>
                {loadingLogs ? (
                  <div className="text-center py-8 text-gray-500 text-sm">Loading logs...</div>
                ) : auditLogs.filter(l => l.action === 'API_KEY_ROTATED').length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-800">
                    This key has never been rotated.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {auditLogs.filter(l => l.action === 'API_KEY_ROTATED').map((log) => (
                      <div key={log.id} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                            <RotateCcw className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              KEY ROTATED
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              By: {log.adminUser?.name || log.adminUser?.email || 'Unknown User'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-900 flex justify-between gap-3">
          <button 
            disabled={loading || apiKey.status === 'REVOKED'}
            onClick={async () => {
              if (!confirm('Are you sure you want to revoke this key? This action is immediate and irreversible.')) return;
              try {
                setLoading(true);
                setError('');
                await apikeysClient.revoke(apiKey.id);
                if (onUpdate) onUpdate();
                onClose();
              } catch (err: any) {
                setError(err.message || 'Failed to revoke key');
              } finally {
                setLoading(false);
              }
            }}
            className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-transparent rounded-md shadow-sm hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center disabled:opacity-50"
          >
            <ShieldAlert className="w-4 h-4 mr-2" />
            {apiKey.status === 'REVOKED' ? 'Revoked' : 'Revoke Key'}
          </button>
          
          <button 
            disabled={loading || apiKey.status === 'REVOKED'}
            onClick={async () => {
              if (!confirm('Are you sure you want to rotate this key? The current key will instantly stop working.')) return;
              try {
                setLoading(true);
                setError('');
                const res = await apikeysClient.rotate(apiKey.id);
                setRotatedKey(res.rawKey);
                if (onUpdate) onUpdate();
              } catch (err: any) {
                setError(err.message || 'Failed to rotate key');
              } finally {
                setLoading(false);
              }
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {loading ? 'Rotating...' : 'Rotate Key'}
          </button>
        </div>
      </div>
    </>
  );
}
