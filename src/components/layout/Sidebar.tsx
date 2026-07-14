'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Users, Cpu, Activity, FileText, Settings, ChevronDown, ChevronRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigationGroups = [
  {
    name: null,
    items: [
      { 
        name: 'Dashboard', 
        icon: LayoutDashboard, 
        subItems: [
          { name: 'Overview', href: '/dashboard' },
          { name: 'Analytics', href: '/analytics' },
          { name: 'Usage', href: '/usage' },
        ]
      },
      { 
        name: 'Customers', 
        icon: Users,
        subItems: [
          { name: 'Clients List', href: '/clients' },
          { name: 'API Keys', href: '/api-keys' },
        ]
      },
    ]
  },
  {
    name: 'Platform',
    items: [
      { 
        name: 'APIs & Services', 
        icon: Cpu,
        subItems: [
          { name: 'Microservices', href: '/apis' },
          { name: 'Modules', href: '/modules' },
          { name: 'Gateway Config', href: '/gateway' },
        ]
      },
      { 
        name: 'Monitoring', 
        icon: Activity,
        subItems: [
          { name: 'System Health', href: '/health' },
          { name: 'Alerts', href: '/alerts' },
        ]
      },
      { 
        name: 'Logs', 
        icon: FileText,
        subItems: [
          { name: 'API Request Logs', href: '/logs' },
          { name: 'Admin Audit Logs', href: '/audit' },
        ]
      },
    ]
  },
  {
    name: 'System',
    items: [
      { name: 'Settings', href: '/settings', icon: Settings },
    ]
  }
];

function NavItem({ item, pathname }: { item: any; pathname: string }) {
  const hasSubItems = item.subItems && item.subItems.length > 0;
  
  // Check if any sub-item is active
  const isAnySubItemActive = hasSubItems && item.subItems.some((sub: any) => pathname === sub.href || pathname.startsWith(`${sub.href}/`));
  const isDirectlyActive = !hasSubItems && (pathname === item.href || pathname.startsWith(`${item.href}/`));
  
  const [isOpen, setIsOpen] = useState(isAnySubItemActive);

  // Keep expanded if route changes to a child
  useEffect(() => {
    if (isAnySubItemActive) {
      setIsOpen(true);
    }
  }, [pathname, isAnySubItemActive]);

  if (!hasSubItems) {
    return (
      <Link
        href={item.href}
        className={cn(
          'group flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isDirectlyActive
            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-50'
        )}
      >
        <div className="flex items-center">
          <item.icon
            className={cn(
              'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
              isDirectlyActive
                ? 'text-indigo-700 dark:text-indigo-400'
                : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
            )}
            aria-hidden="true"
          />
          {item.name}
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'group flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isAnySubItemActive && !isOpen
            ? 'bg-indigo-50/50 text-indigo-700 dark:bg-indigo-500/5 dark:text-indigo-400'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-50'
        )}
      >
        <div className="flex items-center">
          <item.icon
            className={cn(
              'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
              isAnySubItemActive
                ? 'text-indigo-700 dark:text-indigo-400'
                : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
            )}
            aria-hidden="true"
          />
          {item.name}
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="pl-10 space-y-1 mt-1">
          {item.subItems.map((sub: any) => {
            const isSubActive = pathname === sub.href || pathname.startsWith(`${sub.href}/`);
            return (
              <Link
                key={sub.name}
                href={sub.href}
                className={cn(
                  'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isSubActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-50'
                )}
              >
                {sub.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 shadow-sm">
      <div className="flex h-16 items-center px-6 border-b border-gray-200 dark:border-gray-800">
        <span className="text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">ScaleEasy</span>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-6 px-3">
          {navigationGroups.map((group, index) => (
            <div key={index}>
              {group.name && (
               <div className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 mt-2">
                 {group.name}
               </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavItem key={item.name} item={item} pathname={pathname} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
