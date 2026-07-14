'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Settings, Shield, Server, Bell, Blocks, Activity, Lock } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('General');

  const tabs = [
    { name: 'General', icon: Settings },
    { name: 'Authentication', icon: Shield },
    { name: 'Gateway', icon: Server },
    { name: 'Notifications', icon: Bell },
    { name: 'Integrations', icon: Blocks },
    { name: 'System', icon: Activity },
    { name: 'Security', icon: Lock },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Platform Settings" 
        description="Global configuration for the ScaleEasy Control Plane and Gateway."
      />

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Settings Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={cn(
                  activeTab === tab.name
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-900',
                  'group flex items-center px-3 py-2 text-sm font-medium rounded-md w-full transition-colors'
                )}
              >
                <tab.icon
                  className={cn(
                    activeTab === tab.name ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300',
                    'flex-shrink-0 -ml-1 mr-3 h-5 w-5 transition-colors'
                  )}
                  aria-hidden="true"
                />
                <span className="truncate">{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{activeTab} Configuration</h2>
            <p className="text-sm text-gray-500 mt-1">Manage {activeTab.toLowerCase()} settings for the platform.</p>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Placeholder Form Fields */}
            {activeTab === 'General' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Platform Name</label>
                    <input type="text" defaultValue="ScaleEasy" className="w-full text-sm border-gray-300 rounded-md dark:bg-gray-900 dark:border-gray-700 p-2 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Support Email</label>
                    <input type="email" defaultValue="support@scaleeasy.com" className="w-full text-sm border-gray-300 rounded-md dark:bg-gray-900 dark:border-gray-700 p-2 border" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
                  <select className="w-full sm:w-1/2 text-sm border-gray-300 rounded-md dark:bg-gray-900 dark:border-gray-700 p-2 border">
                    <option>UTC (Coordinated Universal Time)</option>
                    <option>EST (Eastern Standard Time)</option>
                    <option>PST (Pacific Standard Time)</option>
                  </select>
                </div>
              </>
            )}
            
            {activeTab !== 'General' && (
              <div className="flex items-center justify-center h-48 text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
                Configuration options for {activeTab} will appear here.
              </div>
            )}
          </div>
          
          <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-end">
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
