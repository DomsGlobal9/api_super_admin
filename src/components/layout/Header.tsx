'use client';

import { Bell, Search, UserCircle, X, Terminal, Building2 } from 'lucide-react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { clientsApi } from '@/lib/api-client/clients';
import { apisClient } from '@/lib/api-client/apis';

export function Header() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [apis, setApis] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        document.getElementById('search-field')?.focus();
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Fetch results based on query
  useEffect(() => {
    if (!query) {
      setClients([]);
      setApis([]);
      return;
    }
    
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [cRes, aRes] = await Promise.all([
          clientsApi.list({ search: query, pageSize: 5 }),
          apisClient.list({ search: query, pageSize: 5 })
        ]);
        setClients(Array.isArray(cRes) ? cRes : cRes.clients || []);
        setApis(Array.isArray(aRes) ? aRes : aRes.apis || []);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <header className="flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 relative z-50">
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div ref={wrapperRef} className="relative flex flex-1 items-center">
          <label htmlFor="search-field" className="sr-only">
            Search Command Palette
          </label>
          <Search
            className="pointer-events-none absolute left-0 h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
          <input
            id="search-field"
            className="block h-full w-full border-0 bg-transparent py-0 pl-8 pr-8 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-0 focus:outline-none outline-none sm:text-sm"
            placeholder="Search APIs and Clients... (Cmd+K)"
            type="text"
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (query) setIsOpen(true);
            }}
          />
          {query && (
            <button 
              onClick={() => {
                setQuery('');
                setIsOpen(false);
              }}
              className="absolute right-2 p-1 text-gray-400 hover:text-gray-600 rounded-md"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Autocomplete Dropdown */}
          {isOpen && query && (
            <div className="absolute top-14 left-0 w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden flex flex-col">
              {loading && <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>}
              
              {!loading && clients.length === 0 && apis.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-500">No results found for "{query}"</div>
              )}

              {!loading && clients.length > 0 && (
                <div className="py-2">
                  <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Clients</div>
                  <ul className="mt-1">
                    {clients.map(client => (
                      <li key={client.id}>
                        <button
                          onClick={() => {
                            setIsOpen(false);
                            setQuery('');
                            router.push(`/clients/${client.id}`);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 flex items-center gap-3 transition-colors"
                        >
                          <Building2 className="h-4 w-4 text-indigo-500" />
                          <span className="font-medium truncate">{client.companyName}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!loading && apis.length > 0 && (
                <div className="py-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">APIs (Microservices)</div>
                  <ul className="mt-1">
                    {apis.map(api => (
                      <li key={api.id}>
                        <button
                          onClick={() => {
                            setIsOpen(false);
                            setQuery('');
                            router.push(`/apis/${api.id}`);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 flex items-center gap-3 transition-colors"
                        >
                          <Terminal className="h-4 w-4 text-emerald-500" />
                          <span className="font-medium truncate">{api.displayName}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <Link href="/alerts" className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500 relative transition-colors">
            <span className="sr-only">View alerts</span>
            <Bell className="h-5 w-5" aria-hidden="true" />
            <span className="absolute top-2 right-2.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-950 animate-pulse" />
          </Link>

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200 dark:lg:bg-gray-800" aria-hidden="true" />

          {/* Profile dropdown */}
          <div className="relative">
            <button
              type="button"
              className="-m-1.5 flex items-center p-1.5 text-gray-400 hover:text-gray-500"
              onClick={() => signOut()}
            >
              <span className="sr-only">Sign out</span>
              <UserCircle className="h-6 w-6 text-gray-400" aria-hidden="true" />
              <span className="hidden lg:flex lg:items-center">
                <span className="ml-2 text-sm font-medium leading-6 text-gray-700 dark:text-gray-300" aria-hidden="true">
                  Sign out
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
