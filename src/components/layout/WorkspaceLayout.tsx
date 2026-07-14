import { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WorkspaceTab {
  name: string;
  href: string;
  isActive: boolean;
}

interface WorkspaceLayoutProps {
  breadcrumbs: { name: string; href: string }[];
  title: string;
  statusBadge?: ReactNode;
  actions?: ReactNode;
  tabs: WorkspaceTab[];
  children: ReactNode;
  metrics?: ReactNode; // Optional metric cards row
}

export function WorkspaceLayout({
  breadcrumbs,
  title,
  statusBadge,
  actions,
  tabs,
  metrics,
  children,
}: WorkspaceLayoutProps) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <nav className="sm:hidden" aria-label="Back">
            <Link href={breadcrumbs.length > 0 ? breadcrumbs[0].href : '#'} className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              <ChevronRight className="mr-1 h-5 w-5 flex-shrink-0 rotate-180" aria-hidden="true" />
              Back
            </Link>
          </nav>
          <nav className="hidden sm:flex" aria-label="Breadcrumb">
            <ol role="list" className="flex items-center space-x-2">
              {breadcrumbs.map((item, index) => (
                <li key={item.name}>
                  <div className="flex items-center">
                    {index > 0 && <ChevronRight className="mr-2 h-5 w-5 flex-shrink-0 text-gray-400" aria-hidden="true" />}
                    <Link
                      href={item.href}
                      className={cn(
                        "text-sm font-medium",
                        index === breadcrumbs.length - 1
                          ? "text-gray-700 dark:text-gray-300"
                          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      )}
                    >
                      {item.name}
                    </Link>
                  </div>
                </li>
              ))}
            </ol>
          </nav>
          <div className="mt-2 flex items-center gap-x-3">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
              {title}
            </h1>
            {statusBadge}
          </div>
        </div>
        
        {/* Quick Actions */}
        {actions && <div className="flex sm:ml-4 sm:mt-0">{actions}</div>}
      </div>

      {/* Optional Metrics Row */}
      {metrics && (
        <div className="mt-4">
          {metrics}
        </div>
      )}

      {/* Tabs Layout */}
      <div className="mt-4">
        <div className="sm:hidden">
          <label htmlFor="tabs" className="sr-only">
            Select a tab
          </label>
          <select
            id="tabs"
            name="tabs"
            className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            defaultValue={tabs.find((tab) => tab.isActive)?.name}
            onChange={(e) => {
              const tab = tabs.find(t => t.name === e.target.value);
              if (tab) window.location.href = tab.href;
            }}
          >
            {tabs.map((tab) => (
              <option key={tab.name}>{tab.name}</option>
            ))}
          </select>
        </div>
        <div className="hidden sm:block">
          <div className="border-b border-gray-200 dark:border-gray-800">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={cn(
                    tab.isActive
                      ? 'border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-700',
                    'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors'
                  )}
                  aria-current={tab.isActive ? 'page' : undefined}
                >
                  {tab.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}
