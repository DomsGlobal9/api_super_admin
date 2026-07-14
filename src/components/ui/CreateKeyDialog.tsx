import { useState } from 'react';
import { X, Key } from 'lucide-react';
import { apikeysClient } from '@/lib/api-client/apikeys';

interface CreateKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  onSuccess: () => void;
}

export function CreateKeyDialog({ isOpen, onClose, clientId, onSuccess }: CreateKeyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdKey, setCreatedKey] = useState<{ rawKey: string, name: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'PRODUCTION',
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await apikeysClient.create({
        clientId,
        name: formData.name,
        type: formData.type,
      });
      setCreatedKey({ rawKey: res.rawKey, name: res.name });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create key');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCreatedKey(null);
    setFormData({ name: '', type: 'PRODUCTION' });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 transition-opacity" onClick={handleClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-950 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Key className="w-5 h-5 mr-2 text-indigo-500" />
              Create API Key
            </h2>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-500">
              <X className="h-5 w-5" />
            </button>
          </div>

          {createdKey ? (
            <div className="p-6 space-y-4">
              <div className="bg-green-50 text-green-800 border border-green-200 rounded-md p-4 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50">
                <h3 className="font-semibold mb-2">Key Created Successfully!</h3>
                <p className="text-sm mb-4">Please copy this key now. For security reasons, you will <strong>never</strong> be able to see it again.</p>
                <div className="bg-white dark:bg-black p-3 rounded border border-gray-200 dark:border-gray-800 font-mono text-sm break-all">
                  {createdKey.rawKey}
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <button 
                  onClick={handleClose} 
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key Name</label>
                <input 
                  required 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange}
                  placeholder="e.g. Production Shopify Key"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Environment Type</label>
                <select 
                  name="type" 
                  value={formData.type} 
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="PRODUCTION">Production</option>
                  <option value="SANDBOX">Sandbox / Testing</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={handleClose} 
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate Key'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
