'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/cn';

import { isBoardRoute } from './routeUtils';

export { isBoardRoute };

const AUTH_ROUTES = ['/login', '/register'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isAuth = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const boardRoute = isBoardRoute(pathname);
  // Only the Kanban Board hides the left sidebar; all other authenticated pages retain it
  const showSidebar = Boolean(user) && !isAuth && !boardRoute;

  if (isAuth) {
    return (
      <div className="flex min-h-screen flex-col bg-canvas">
        <main className="flex flex-1 items-center justify-center px-4 py-10">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-tp">
      {/* 1. Global Top Navigation (spans 100% full browser width across all authenticated pages) */}
      <AppHeader
        showSidebarToggle={showSidebar}
        onToggleSidebar={() => setMobileSidebarOpen((v) => !v)}
        isSidebarOpen={mobileSidebarOpen}
      />

      {/* 2. Body Area: Left Sidebar (for regular pages) + Main Content */}
      <div className="flex flex-1 min-h-0 w-full relative">
        {showSidebar && (
          <>
            {/* Desktop persistent left sidebar below top header */}
            <div className="hidden lg:block w-60 shrink-0 border-r border-border bg-navigation">
              <div className="sticky top-[58px] h-[calc(100vh-58px)] overflow-y-auto custom-scrollbar">
                <Sidebar />
              </div>
            </div>

            {/* Tablet / Mobile off-canvas drawer */}
            {mobileSidebarOpen && (
              <div className="fixed inset-0 z-40 lg:hidden">
                <button
                  type="button"
                  aria-label="Close navigation"
                  className="fixed inset-0 bg-canvas/70 backdrop-blur-sm"
                  onClick={() => setMobileSidebarOpen(false)}
                />
                <div className="fixed inset-y-0 left-0 w-60 shadow-modal z-50 bg-navigation flex flex-col pt-[58px]">
                  <Sidebar onNavigate={() => setMobileSidebarOpen(false)} />
                </div>
              </div>
            )}
          </>
        )}

        {/* Main Content Area */}
        <main
          className={cn(
            'flex-1 min-w-0 flex flex-col',
            boardRoute
              ? 'h-[calc(100vh-58px)] max-h-[calc(100vh-58px)] overflow-hidden p-0'
              : 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full'
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
