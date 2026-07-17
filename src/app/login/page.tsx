'use client';

import { signIn } from 'next-auth/react';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('timeout') === 'true') {
      setError('Session timed out, please login again.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError('Invalid credentials');
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Left Pane - Branding & Info (Hidden on small screens) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-indigo-600 dark:bg-indigo-900 p-12 lg:p-16 text-white relative overflow-hidden">
        {/* Abstract background blobs for premium feel */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-60 dark:opacity-40 animate-blob"></div>
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-60 dark:opacity-40 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-24 left-32 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-60 dark:opacity-40 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10 flex flex-col h-full">
          <div>
            <img src="/scaleezy-png.png" alt="ScaleEasy" className="w-56 h-auto object-contain" />
          </div>
          
          <div className="mt-auto mb-16">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-6 leading-tight">
              Super Admin <br/>Control Plane
            </h1>
            <p className="text-indigo-100 text-lg max-w-md mb-10 leading-relaxed">
              The centralized command center for managing the ScaleEasy API Gateway, client provisioning, and microservices architecture.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-4 text-indigo-50 group">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/30 flex items-center justify-center backdrop-blur-md shadow-inner group-hover:bg-indigo-500/50 transition-colors">
                  <svg className="w-5 h-5 text-indigo-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <div className="font-medium text-lg">API Gateway Management</div>
              </div>
              <div className="flex items-center space-x-4 text-indigo-50 group">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/30 flex items-center justify-center backdrop-blur-md shadow-inner group-hover:bg-indigo-500/50 transition-colors">
                  <svg className="w-5 h-5 text-indigo-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                </div>
                <div className="font-medium text-lg">Client & Module Provisioning</div>
              </div>
              <div className="flex items-center space-x-4 text-indigo-50 group">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/30 flex items-center justify-center backdrop-blur-md shadow-inner group-hover:bg-indigo-500/50 transition-colors">
                  <svg className="w-5 h-5 text-indigo-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                </div>
                <div className="font-medium text-lg">Real-time Usage Analytics</div>
              </div>
            </div>
          </div>
          
          <div className="text-indigo-300 text-sm font-medium">
            &copy; {new Date().getFullYear()} ScaleEasy Infrastructure. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Pane - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative">
        {/* Subtle background decoration for right pane */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-50/50 dark:to-gray-900/50 pointer-events-none"></div>
        
        <div className="w-full max-w-md relative z-10">
          <div className="bg-white dark:bg-gray-800 p-8 sm:p-10 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700">
            
            <div className="text-center mb-8">
              {/* Show logo on mobile only, since desktop has it on the left */}
              <img src="/scaleezy-png.png" alt="ScaleEasy" className="w-48 h-auto object-contain mx-auto sm:mx-0 lg:hidden mb-6" />
              
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                Welcome back
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Please sign in to your admin account
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Email Address</label>
                  <input
                    type="email"
                    required
                    className="block w-full rounded-lg border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 sm:text-sm bg-gray-50 dark:bg-gray-900/50 dark:border-gray-700 dark:text-white transition-all duration-200"
                    placeholder="superadmin@scaleezy.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="block w-full rounded-lg border-gray-300 px-4 py-3 pr-10 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 sm:text-sm bg-gray-50 dark:bg-gray-900/50 dark:border-gray-700 dark:text-white transition-all duration-200"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <Eye className="h-5 w-5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="text-red-600 dark:text-red-400 text-sm font-medium text-center">{error}</div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative flex w-full justify-center rounded-lg border border-transparent bg-indigo-600 py-3 px-4 text-sm font-bold text-white shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-70 transition-all duration-200 active:scale-[0.98]"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Authenticating...
                    </span>
                  ) : 'Sign in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-900" />}>
      <LoginForm />
    </Suspense>
  );
}
