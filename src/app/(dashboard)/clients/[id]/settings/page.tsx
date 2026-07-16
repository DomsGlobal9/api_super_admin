'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientsApi } from '@/lib/api-client/clients';
import { Ban, Trash2, AlertTriangle, Save, Edit2, X } from 'lucide-react';

export default function ClientSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    notes: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Danger zone states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);

  const loadClient = async () => {
    try {
      const res = await clientsApi.getOverview(id);
      setClient(res);
      setFormData({
        companyName: res.companyName || '',
        contactName: res.contactName || '',
        email: res.email || '',
        phone: res.phone || '',
        notes: res.notes || ''
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClient();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await clientsApi.update(id, formData);
      alert('Profile updated successfully');
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Revert form data
    setFormData({
      companyName: client.companyName || '',
      contactName: client.contactName || '',
      email: client.email || '',
      phone: client.phone || '',
      notes: client.notes || ''
    });
    setIsEditing(false);
  };

  const handleSuspend = async () => {
    try {
      setIsSuspending(true);
      const newStatus = client.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
      const updated = await clientsApi.update(id, { status: newStatus });
      setClient(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setIsSuspending(false);
      setIsSuspendModalOpen(false);
    }
  };

  const handleHardDelete = async () => {
    try {
      setIsDeleting(true);
      await clientsApi.delete(id, true);
      router.push('/clients');
    } catch (err: any) {
      alert(err.message || 'Failed to permanently delete client');
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-[400px] bg-gray-100 dark:bg-gray-800 rounded-xl" />
      </div>
    );
  }

  const isSuspended = client?.status === 'SUSPENDED';

  return (
    <div className="space-y-8 max-w-4xl">
      
      {/* SECTION 1: General Profile Details */}
      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">General Profile Details</h3>
            <p className="mt-1 text-sm text-gray-500">Update the core information and contact details for this client.</p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <Edit2 className="mr-2 h-4 w-4" />
              Edit Profile
            </button>
          )}
        </div>
        
        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Company Name</label>
              <input 
                type="text" 
                name="companyName" 
                value={formData.companyName} 
                onChange={handleChange}
                required
                disabled={!isEditing}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 disabled:bg-gray-50 disabled:text-gray-500 dark:disabled:bg-gray-900/50" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange}
                required
                disabled={!isEditing}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 disabled:bg-gray-50 disabled:text-gray-500 dark:disabled:bg-gray-900/50" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Contact Person</label>
              <input 
                type="text" 
                name="contactName" 
                value={formData.contactName} 
                onChange={handleChange}
                disabled={!isEditing}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 disabled:bg-gray-50 disabled:text-gray-500 dark:disabled:bg-gray-900/50" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
              <input 
                type="text" 
                name="phone" 
                value={formData.phone} 
                onChange={handleChange}
                disabled={!isEditing}
                maxLength={10}
                pattern="\d{10}"
                title="Phone number must be exactly 10 digits"
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 disabled:bg-gray-50 disabled:text-gray-500 dark:disabled:bg-gray-900/50" 
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Internal Admin Notes</label>
              <textarea 
                name="notes" 
                value={formData.notes} 
                onChange={handleChange}
                disabled={!isEditing}
                rows={4}
                className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 disabled:bg-gray-50 disabled:text-gray-500 dark:disabled:bg-gray-900/50" 
              />
            </div>
          </div>
          
          {isEditing && (
            <div className="flex justify-end pt-4 space-x-3 border-t border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-2">
              <button 
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </section>

      {/* SECTION 6: Danger Zone */}
      <section className="bg-red-50/50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/50 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-red-200 dark:border-red-900/50">
          <h3 className="text-lg font-medium text-red-800 dark:text-red-400">Danger Zone</h3>
          <p className="mt-1 text-sm text-red-600 dark:text-red-500/80">Destructive actions that will immediately affect this client's API access.</p>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                {isSuspended ? 'Activate Client' : 'Suspend Client'}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {isSuspended 
                  ? 'Restore their API access. They will be able to make requests again.'
                  : 'Instantly revoke their access. All API requests will be rejected with a 403 Forbidden.'}
              </p>
            </div>
            <button
              onClick={() => setIsSuspendModalOpen(true)}
              className={`inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 ${
                isSuspended 
                  ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 focus:ring-green-500'
                  : 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/40 focus:ring-orange-500'
              }`}
            >
              <Ban className="mr-2 h-4 w-4" />
              {isSuspended ? 'Activate Access' : 'Suspend Access'}
            </button>
          </div>

          <div className="h-px bg-red-200 dark:bg-red-900/50" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Delete Client</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Permanently remove this client, all their API keys, subscriptions, and access rules. This action cannot be undone.
              </p>
            </div>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center justify-center rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Client
            </button>
          </div>
        </div>
      </section>

      {/* Modals from layout moved here */}
      
      {/* Hard Delete Warning Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-800 relative animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-3 text-red-600 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Permanent Deletion</h3>
            </div>
            
            <div className="text-gray-600 dark:text-gray-400 mb-6 space-y-2 text-sm">
              <p>Are you absolutely sure you want to <strong>hard delete</strong> {client?.companyName}?</p>
              <p className="text-red-500 font-medium">This action will instantly wipe their account, all API keys, subscriptions, and access rules from the database forever.</p>
              <p>This cannot be undone.</p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleHardDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 flex items-center"
              >
                {isDeleting ? 'Deleting...' : 'Yes, erase forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend/Activate Warning Modal */}
      {isSuspendModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-800 relative animate-in fade-in zoom-in-95">
            <div className={`flex items-center space-x-3 mb-4 ${isSuspended ? 'text-green-600' : 'text-orange-600'}`}>
              <div className={`p-2 rounded-full ${isSuspended ? 'bg-green-100 dark:bg-green-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                <Ban className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isSuspended ? 'Activate Client' : 'Suspend Client'}
              </h3>
            </div>
            
            <div className="text-gray-600 dark:text-gray-400 mb-6 space-y-2 text-sm">
              <p>Are you sure you want to {isSuspended ? 'activate' : 'suspend'} {client?.companyName}?</p>
              {!isSuspended && (
                <p className="text-orange-500 font-medium">This will instantly revoke their access and all API requests will be rejected.</p>
              )}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsSuspendModalOpen(false)}
                disabled={isSuspending}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                disabled={isSuspending}
                className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 flex items-center ${
                  isSuspended 
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                    : 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
                }`}
              >
                {isSuspending ? 'Updating...' : `Yes, ${isSuspended ? 'Activate' : 'Suspend'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
