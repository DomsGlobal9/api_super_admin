'use client';

import { useState, useEffect } from 'react';
import { settingsApi } from '@/lib/api-client/settings';
import { Settings, Shield, Bell, Zap, Activity, Server, Lock, CheckCircle, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // State for General Settings
  const [platformName, setPlatformName] = useState('ScaleEasy');
  const [supportEmail, setSupportEmail] = useState('support@scaleeasy.com');

  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      try {
        const data = await settingsApi.get();
        if (isMounted) {
          if (data.platformName) setPlatformName(data.platformName);
          if (data.supportEmail) setSupportEmail(data.supportEmail);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
        // Even if it fails (e.g. no settings yet), we stop loading
        if (isMounted) setLoading(false);
      }
    }
    loadSettings();
    return () => { isMounted = false; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await settingsApi.update({
        platformName,
        supportEmail,
      });
      setSuccessMsg('Settings saved successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'authentication', label: 'Authentication', icon: Shield },
    { id: 'gateway', label: 'Gateway', icon: Zap },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'integrations', label: 'Integrations', icon: Activity },
    { id: 'system', label: 'System', icon: Server },
    { id: 'security', label: 'Security', icon: Lock },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Platform Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">Global configuration for the ScaleEasy Control Plane and Gateway.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1">
          {activeTab === 'general' && (
            <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">General Configuration</h2>
                <p className="text-sm text-gray-500 mt-1">Manage general settings for the platform.</p>
              </div>

              {loading ? (
                <div className="p-12 text-center text-gray-500">Loading settings...</div>
              ) : (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Platform Name
                      </label>
                      <input
                        type="text"
                        value={platformName}
                        onChange={(e) => setPlatformName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Support Email
                      </label>
                      <input
                        type="email"
                        value={supportEmail}
                        onChange={(e) => setSupportEmail(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center justify-between">
                      <span>Timezone</span>
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded">Locked for Integrity</span>
                    </label>
                    <select
                      disabled
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-500 dark:text-gray-500 cursor-not-allowed shadow-sm"
                    >
                      <option value="UTC">UTC (Coordinated Universal Time)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      All data is strictly saved in UTC. The dashboard automatically translates all charts, logs, and dates to your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
                    </p>
                  </div>
                </div>
              )}

              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  {successMsg && <div className="text-green-600 dark:text-green-400 flex items-center text-sm"><CheckCircle className="w-4 h-4 mr-1"/> {successMsg}</div>}
                  {errorMsg && <div className="text-red-600 dark:text-red-400 flex items-center text-sm"><AlertCircle className="w-4 h-4 mr-1"/> {errorMsg}</div>}
                </div>
                <button
                  onClick={handleSave}
                  disabled={loading || saving}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {activeTab !== 'general' && (
            <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center shadow-sm h-full flex flex-col items-center justify-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-900 text-gray-400 mb-4">
                <Settings className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Advanced {tabs.find(t => t.id === activeTab)?.label} Settings
              </h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto">
                These advanced configurations are currently set to global defaults and will be unlocked in a future platform update.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
