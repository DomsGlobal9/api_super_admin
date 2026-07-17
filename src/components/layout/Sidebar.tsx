'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Users, Cpu, Activity, FileText, Settings, ChevronDown, ChevronRight, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLayoutContext } from '@/components/providers/LayoutProvider';

const navigationGroups = [
  {
    name: null,
    items: [
      { 
        name: 'Dashboard', 
        icon: LayoutDashboard, 
        href: '/dashboard'
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
          { name: 'APIs', href: '/apis' },
          { name: 'Gateway Config', href: '/gateway' },
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

function NavItem({ 
  item, 
  pathname, 
  expandedItem, 
  setExpandedItem 
}: { 
  item: any; 
  pathname: string; 
  expandedItem: string | null;
  setExpandedItem: (name: string | null) => void;
}) {
  const hasSubItems = item.subItems && item.subItems.length > 0;
  
  // Check if any sub-item is active
  const isAnySubItemActive = hasSubItems && item.subItems.some((sub: any) => pathname === sub.href || pathname.startsWith(`${sub.href}/`));
  const isDirectlyActive = !hasSubItems && (pathname === item.href || pathname.startsWith(`${item.href}/`));
  
  const isOpen = expandedItem === item.name;

  const handleToggle = () => {
    if (isOpen) {
      setExpandedItem(null);
    } else {
      setExpandedItem(item.name);
    }
  };

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
        onClick={handleToggle}
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
          <ChevronRight 
            className={cn(
              "h-4 w-4 transition-transform duration-300 ease-in-out",
              isOpen ? "rotate-90 text-indigo-500 dark:text-indigo-400" : "text-gray-400"
            )} 
          />
      </button>

      <div 
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="relative pl-4 ml-5 space-y-1 border-l-2 border-gray-100 dark:border-gray-800 py-1">
            {item.subItems.map((sub: any) => {
              const isSubActive = pathname === sub.href || pathname.startsWith(`${sub.href}/`);
              return (
                <div key={sub.name} className="relative group/sub">
                  {/* Glowing Indicator Dot for Active State */}
                  {isSubActive && (
                    <div className="absolute -left-[21px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shadow-[0_0_8px_rgba(79,70,229,0.8)] dark:shadow-[0_0_8px_rgba(129,140,248,0.8)] ring-4 ring-white dark:ring-gray-950 z-10" />
                  )}
                  {/* Hover indicator dot */}
                  {!isSubActive && (
                    <div className="absolute -left-[19px] top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700 opacity-0 group-hover/sub:opacity-100 transition-opacity duration-200 z-10" />
                  )}
                  
                  <Link
                    href={sub.href}
                    className={cn(
                      'block rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
                      isSubActive
                        ? 'text-indigo-700 bg-indigo-50/80 dark:text-indigo-300 dark:bg-indigo-500/10 translate-x-1'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-900/50 hover:translate-x-1'
                    )}
                  >
                    {sub.name}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const { isMobileSidebarOpen, closeSidebar } = useLayoutContext();

  // Initialize expanded item based on current pathname
  useEffect(() => {
    for (const group of navigationGroups) {
      for (const item of group.items) {
        if ('subItems' in item && item.subItems) {
          const isActive = item.subItems.some((sub: any) => pathname === sub.href || pathname.startsWith(`${sub.href}/`));
          if (isActive) {
            setExpandedItem(item.name);
            return;
          }
        }
      }
    }
  }, [pathname]);

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 shadow-sm transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800">
          <img src="/scaleezy-png.png" alt="ScaleEasy" className="w-48 h-auto object-contain" />
          <button 
            className="lg:hidden p-2 -mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={closeSidebar}
          >
            <X className="h-5 w-5" />
          </button>
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
                  <NavItem 
                    key={item.name} 
                    item={item} 
                    pathname={pathname} 
                    expandedItem={expandedItem}
                    setExpandedItem={setExpandedItem}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
      </div>
    </>
  );
}
