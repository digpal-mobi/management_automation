'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Compass,
  Kanban,
  Users,
  BarChart3,
  CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ProjectNavProps {
  projectId: string;
  projectSlug?: string;
  memberCount?: number;
  ticketCount?: number;
  className?: string;
}

export function ProjectNav({
  projectId,
  projectSlug,
  memberCount,
  ticketCount,
  className = '',
}: ProjectNavProps) {
  const pathname = usePathname();
  const slugOrId = projectSlug || projectId;

  const navItems = [
    {
      href: `/projects/${slugOrId}/knowledge`,
      label: 'Knowledge',
      icon: BookOpen,
      isActive: pathname.includes('/knowledge'),
    },
    {
      href: `/projects/${slugOrId}/roadmap`,
      label: 'Roadmap',
      icon: Compass,
      isActive: pathname.includes('/roadmap'),
    },
    {
      href: `/projects/${slugOrId}/plan`,
      label: 'Sprint Plan',
      icon: CalendarClock,
      isActive: pathname.includes('/plan'),
    },
    {
      href: `/projects/${slugOrId}/board`,
      label: 'Board',
      icon: Kanban,
      badge: ticketCount !== undefined ? String(ticketCount) : undefined,
      isActive: pathname.includes('/board'),
    },
    {
      href: `/projects/${slugOrId}/analytics`,
      label: 'Analytics',
      icon: BarChart3,
      isActive: pathname.includes('/analytics'),
    },
    {
      href: `/projects/${slugOrId}/members`,
      label: 'Team',
      icon: Users,
      badge: memberCount !== undefined ? String(memberCount) : undefined,
      isActive: pathname.includes('/members'),
    },
  ];

  return (
    <nav
      aria-label="Project Navigation"
      className={cn('w-full overflow-x-auto custom-scrollbar pb-1', className)}
    >
      <div className="inline-flex items-center gap-1.5 p-1 rounded-card bg-elevated border border-border min-w-full sm:min-w-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-button text-label whitespace-nowrap transition-all duration-150 select-none',
                item.isActive
                  ? 'bg-accent-subtle text-accent font-medium'
                  : 'text-ts hover:text-tp hover:bg-hover'
              )}
            >
              <Icon className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{item.label}</span>
              {item.badge && (
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full font-mono',
                    item.isActive
                      ? 'bg-accent/20 text-accent font-bold'
                      : 'bg-surface text-ts border border-border'
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
