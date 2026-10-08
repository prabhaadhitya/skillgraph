import { useState } from 'react';
import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar.jsx';
import { TopBar } from './TopBar.jsx';

/**
 * AppShell layout component.
 * Composes sticky Sidebar (or responsive drawer), sticky TopBar, and routed Outlet content.
 */
export function AppShell() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-paper flex font-sans text-ink">
      {/* Sidebar navigation */}
      <Sidebar isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <TopBar onOpenDrawer={() => setIsDrawerOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppShell;
