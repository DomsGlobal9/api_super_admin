import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { InactivityProvider } from '@/components/providers/InactivityProvider';
import { LayoutProvider } from '@/components/providers/LayoutProvider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LayoutProvider>
      <InactivityProvider>
        <div className="flex h-screen print:h-auto bg-gray-50 dark:bg-gray-900 overflow-hidden print:overflow-visible relative print:static">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible w-full">
            <Header />
            <main className="flex-1 overflow-y-auto print:overflow-visible p-4 sm:p-6 lg:p-8 w-full">
              {children}
            </main>
          </div>
        </div>
      </InactivityProvider>
    </LayoutProvider>
  );
}
