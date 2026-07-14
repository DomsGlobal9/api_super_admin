import { useState, useEffect } from 'react';
import { X, Blocks } from 'lucide-react';
import { modulesClient } from '@/lib/api-client/modules';
import { clientsApi } from '@/lib/api-client/clients'; // We will add assignModule to clientsApi

interface AssignModuleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  onSuccess: () => void;
}

export function AssignModuleDialog({ isOpen, onClose, clientId, onSuccess }: AssignModuleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modules, setModules] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState('');

  useEffect(() => {
    if (isOpen) {
      modulesClient.list({ pageSize: 50 }).then(data => {
        setModules(data.modules || data);
      }).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModule) return;
    
    setError('');
    setLoading(true);

    try {
      await clientsApi.assignModule(clientId, selectedModule);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to assign module');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-950 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Blocks className="w-5 h-5 mr-2 text-indigo-500" />
              Assign Module
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Module</label>
              <select 
                required
                value={selectedModule} 
                onChange={e => setSelectedModule(e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="" disabled>-- Choose a module --</option>
                {modules.map(mod => (
                  <option key={mod.id} value={mod.id}>{mod.name}</option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 mt-6">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading || !selectedModule}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Assigning...' : 'Assign Module'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
