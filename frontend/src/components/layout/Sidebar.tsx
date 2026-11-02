'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FolderKanban,
  Bell,
  User,
  PlusCircle,
  Layers,
  BookOpen,
  Compass,
  Kanban,
  BarChart3,
  Users,
  CalendarClock,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();

  const projectMatch = pathname.match(/^\/projects\/([^/]+)/);
  const activeProjectId = projectMatch ? projectMatch[1] : null;
  const inProject = Boolean(activeProjectId && activeProjectId !== 'new');

  const homeItems = [
    { href: '/', label: 'Workspaces', icon: FolderKanban, match: (p: string) => p === '/' },
    { href: '/notifications', label: 'Notifications', icon: Bell, match: (p: string) => p.startsWith('/notifications') },
    { href: '/profile', label: 'Profile', icon: User, match: (p: string) => p.startsWith('/profile') },
    { href: '/projects/new', label: 'New Project', icon: PlusCircle, match: (p: string) => p === '/projects/new' },
  ];

  const projectItems = inProject
    ? [
        { href: `/projects/${activeProjectId}`, label: 'Overview', icon: Layers, match: (p: string) => p === `/projects/${activeProjectId}` },
        { href: `/projects/${activeProjectId}/knowledge`, label: 'Knowledge', icon: BookOpen, match: (p: string) => p.includes('/knowledge') },
        { href: `/projects/${activeProjectId}/roadmap`, label: 'Roadmap', icon: Compass, match: (p: string) => p.includes('/roadmap') },
        { href: `/projects/${activeProjectId}/plan`, label: 'Sprint Plan', icon: CalendarClock, match: (p: string) => p.includes('/plan') },
        { href: `/projects/${activeProjectId}/board`, label: 'Board', icon: Kanban, match: (p: string) => p.includes('/board') },
        { href: `/projects/${activeProjectId}/analytics`, label: 'Analytics', icon: BarChart3, match: (p: string) => p.includes('/analytics') },
        { href: `/projects/${activeProjectId}/members`, label: 'Team', icon: Users, match: (p: string) => p.includes('/members') },
      ]
    : [];

  return (
    <aside className="flex h-full w-full flex-col bg-navigation select-none">
      {/* Mobile drawer header with close action */}
      {onNavigate && (
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-divider lg:hidden">
          <span className="text-caption uppercase tracking-wider text-tm font-medium">Navigation</span>
          <button
            type="button"
            onClick={onNavigate}
            className="p-1 rounded-md text-ts hover:text-tp hover:bg-hover transition-colors"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2.5 py-4 space-y-4" aria-label="Primary">
        {/* Workspace Category */}
        <div className="space-y-0.5">
          <p className="px-2.5 pb-1 text-caption uppercase tracking-wider text-tm font-medium">Workspace</p>
          {homeItems.map((item) => {
            const Icon = item.icon;
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-2.5 rounded-button px-2.5 py-2 text-label transition-colors duration-150',
                  active
                    ? 'bg-accent-subtle text-accent font-medium'
                    : 'text-ts hover:bg-hover hover:text-tp'
                )}
              >
                <Icon className={cn('h-4 w-4 flex-shrink-0', active ? 'text-accent' : 'text-tm')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Project Category */}
        {projectItems.length > 0 && (
          <div className="space-y-0.5 pt-1">
            <p className="px-2.5 pb-1 text-caption uppercase tracking-wider text-tm font-medium">Project</p>
            {projectItems.map((item) => {
              const Icon = item.icon;
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-2.5 rounded-button px-2.5 py-2 text-label transition-colors duration-150',
                    active
                      ? 'bg-accent-subtle text-accent font-medium'
                      : 'text-ts hover:bg-hover hover:text-tp'
                  )}
                >
                  <Icon className={cn('h-4 w-4 flex-shrink-0', active ? 'text-accent' : 'text-tm')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>
    </aside>
  );
}
