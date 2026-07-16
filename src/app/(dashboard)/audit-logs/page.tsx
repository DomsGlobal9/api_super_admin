'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { ShieldCheck, User, Key, Globe, Blocks, Eye, Database, Server } from 'lucide-react';
import { useEffect, useState } from 'react';
import { auditClient } from '@/lib/api-client/audit';
import { formatDistanceToNow } from 'date-fns';

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLogs() {
      try {
        const res = await auditClient.list({ pageSize: 100, search: searchTerm });
        setLogs(res.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, [searchTerm]);

  const getIconForAction = (action: string) => {
    if (action.includes('KEY')) return Key;
    if (action.includes('CLIENT')) return User;
    if (action.includes('MODULE')) return Blocks;
    if (action.includes('API') || action.includes('MICROSERVICE')) return Globe;
    return ShieldCheck;
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Audit Logs" 
        description="Governance and compliance tracking for all administrative actions."
      />

      <div className="bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-wrap gap-4 items-center">
        <input 
          type="text" 
          placeholder="Search by actor, action, or resource..." 
          className="text-sm border-gray-300 rounded-md dark:bg-gray-900 dark:border-gray-700 py-1.5 px-3 flex-1 min-w-[250px]"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select className="text-sm border-gray-300 rounded-md dark:bg-gray-900 dark:border-gray-700 py-1.5 pl-3 pr-8">
          <option>All Actors</option>
          <option>jane.doe@company.com</option>
        </select>
        <select className="text-sm border-gray-300 rounded-md dark:bg-gray-900 dark:border-gray-700 py-1.5 pl-3 pr-8">
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
        </select>
      </div>

      {loading && <div className="space-y-4 animate-pulse"><div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-xl"></div></div>}
      {error && <div className="p-4 bg-red-50 text-red-500 rounded-md">Error: {error}</div>}
      {!loading && !error && logs.length === 0 && <div>No audit logs found.</div>}

      <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">Action</th>
                <th className="px-6 py-3 font-medium text-gray-500">Actor</th>
                <th className="px-6 py-3 font-medium text-gray-500">Resource Affected</th>
                <th className="px-6 py-3 font-medium text-gray-500">IP Address</th>
                <th className="px-6 py-3 font-medium text-gray-500">Time</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {logs.map((log) => {
                const ActionIcon = getIconForAction(log.action);
                return (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400">
                      <ActionIcon className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{log.action.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{log.actor}</td>
                  <td className="px-6 py-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">{log.resource}</td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">{log.ip}</td>
                  <td className="px-6 py-4 text-gray-500 text-xs">{formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-gray-400 hover:text-indigo-600 transition-colors p-1">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
