import { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { apisClient } from '@/lib/api-client/apis';

const MB = 1024 * 1024;

interface EditApiDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  apiId: string;
  initialData: any;
}

export function EditApiDialog({ isOpen, onClose, onSuccess, apiId, initialData }: EditApiDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  const [formData, setFormData] = useState({
    displayName: '',
    slug: '',
    description: '',
    targetUrl: '',
    internalSecret: '',
    timeoutSec: '',
    maxPayloadMb: '',
  });

  useEffect(() => {
    if (initialData) {
      // The gateway only reads the PRODUCTION environment.
      const env = initialData.environments?.find((e: { environment?: string }) => e.environment === 'PRODUCTION') || initialData.environments?.[0];
      setFormData({
        displayName: initialData.displayName || '',
        slug: initialData.slug || '',
        description: initialData.description || '',
        targetUrl: env?.targetUrl || '',
        internalSecret: env?.internalSecret || '',
        timeoutSec: env?.timeoutMs ? String(env.timeoutMs / 1000) : '',
        maxPayloadMb: env?.maxPayloadSize ? String(Math.round((env.maxPayloadSize / MB) * 100) / 100) : '',
      });
    }
  }, [initialData]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { timeoutSec, maxPayloadMb, ...rest } = formData;
    const seconds = Number(timeoutSec);
    const megabytes = Number(maxPayloadMb);
    if (!timeoutSec.trim() || !Number.isFinite(seconds) || seconds < 1 || seconds > 300) {
      setError('Timeout must be a number of seconds from 1 to 300.');
      return;
    }
    if (!maxPayloadMb.trim() || !Number.isFinite(megabytes) || megabytes < 0.01 || megabytes > 100) {
      setError('Request size limit must be a number of MB from 0.01 to 100.');
      return;
    }

    setLoading(true);
    try {
      await apisClient.updateApi(apiId, {
        ...rest,
        timeoutMs: Math.round(seconds * 1000),
        maxPayloadSize: Math.round(megabytes * MB),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-950 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Edit API Configuration
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
              <input 
                required 
                type="text" 
                name="displayName" 
                value={formData.displayName} 
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Slug (URL Friendly)</label>
              <input 
                required 
                type="text" 
                name="slug" 
                value={formData.slug} 
                onChange={handleSlugChange}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Server URL (Base URL)</label>
              <input 
                required 
                type="url" 
                name="targetUrl" 
                value={formData.targetUrl} 
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Backend Master Key (Optional)</label>
              <div className="relative">
                <input 
                  type={showSecret ? "text" : "password"} 
                  name="internalSecret" 
                  value={formData.internalSecret} 
                  onChange={handleChange}
                  placeholder="Leave blank to keep unchanged..."
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="maxPayloadMb" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Request Size Limit (MB)</label>
                <input
                  required
                  id="maxPayloadMb"
                  type="text"
                  inputMode="decimal"
                  name="maxPayloadMb"
                  value={formData.maxPayloadMb}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">Bigger requests are refused. Up to 100.</p>
              </div>
              <div>
                <label htmlFor="timeoutSec" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timeout (seconds)</label>
                <input
                  required
                  id="timeoutSec"
                  type="text"
                  inputMode="numeric"
                  name="timeoutSec"
                  value={formData.timeoutSec}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">How long to wait for the service to start answering. Up to 300.</p>
              </div>
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
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
