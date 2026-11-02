'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sparkles,
  Home,
  ChevronDown,
  Search,
  Bell,
  UserPlus,
  Settings,
  Layers,
  BookOpen,
  Compass,
  CalendarClock,
  Kanban,
  BarChart3,
  Users,
  Menu,
  X,
  FolderKanban,
  PlusCircle,
  Check,
  CheckCircle2,
  Clock,
  Circle,
  TrendingUp,
} from 'lucide-react';
import { Project, ProjectMember, Ticket } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { setProjects, setCurrentProject, setMembers } from '@/store/projectSlice';
import { ProfileDropdown } from '@/components/layout/ProfileDropdown';
import { NOTIFICATIONS_UPDATED_EVENT } from '@/lib/notifications';
import { cn } from '@/lib/cn';

export interface AppHeaderProps {
  showSidebarToggle?: boolean;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  className?: string;
}

function initials(name?: string | null, email?: string | null) {
  const source = (name || email || '?').trim();
  const parts = source.split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

const AVATAR_TONES = [
  { bg: 'bg-[#324564]', text: 'text-[#B9CFFB]' },
  { bg: 'bg-[#20493E]', text: 'text-[#8BE4C8]' },
  { bg: 'bg-[#4A3961]', text: 'text-[#D4BFF2]' },
  { bg: 'bg-[#524128]', text: 'text-[#F7D294]' },
];

export function AppHeader({
  showSidebarToggle = false,
  onToggleSidebar,
  isSidebarOpen = false,
  className,
}: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, fetchWithAuth } = useAuth();
  const dispatch = useAppDispatch();
  const { projects, currentProject, members } = useAppSelector((state) => state.project);

  // Dropdown & Modal states
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [ticketSearchResults, setTicketSearchResults] = useState<Ticket[]>([]);
  const [isSearchingTickets, setIsSearchingTickets] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const projectRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Extract active project slug or id from pathname
  const projectMatch = pathname.match(/^\/projects\/([^/]+)/);
  const activeSlugOrId = projectMatch ? projectMatch[1] : null;
  const inProject = Boolean(activeSlugOrId && activeSlugOrId !== 'new');

  // Resolve active project record
  const project = inProject
    ? (currentProject?.slug === activeSlugOrId || currentProject?.id === activeSlugOrId
        ? currentProject
        : projects.find((p) => p.slug === activeSlugOrId || p.id === activeSlugOrId)) ||
      currentProject
    : null;

  const slug = project?.slug || project?.id || activeSlugOrId || '';
  const projectName = project?.name || (activeSlugOrId ? activeSlugOrId.replace(/-/g, ' ') : 'Project');

  // Load projects list if not loaded yet
  useEffect(() => {
    if (!user) return;
    if (projects.length > 0) return;

    let isMounted = true;
    const loadProjects = async () => {
      try {
        const res = await fetchWithAuth('/api/projects');
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.projects)) {
          dispatch(setProjects(data.projects));
        }
      } catch {
        // Handled silently
      }
    };

    void loadProjects();
    return () => {
      isMounted = false;
    };
  }, [user, projects.length, fetchWithAuth, dispatch]);

  // Load project details & members if navigating to project not in state
  useEffect(() => {
    if (!user || !inProject || !activeSlugOrId) return;

    const hasCurrentProject =
      currentProject &&
      (currentProject.slug === activeSlugOrId || currentProject.id === activeSlugOrId);

    if (hasCurrentProject && members.length > 0) return;

    let isMounted = true;
    const loadProjectData = async () => {
      try {
        if (!hasCurrentProject) {
          const res = await fetchWithAuth(`/api/projects/${activeSlugOrId}`);
          if (res.ok) {
            const data = await res.json();
            if (isMounted && data.success && data.project) {
              dispatch(setCurrentProject(data.project));
            }
          }
        }

        const membersRes = await fetchWithAuth(`/api/projects/${activeSlugOrId}/members`);
        if (membersRes.ok) {
          const data = await membersRes.json();
          if (isMounted && data.success && Array.isArray(data.members)) {
            dispatch(setMembers(data.members));
          }
        }
      } catch {
        // Handled silently
      }
    };

    void loadProjectData();
    return () => {
      isMounted = false;
    };
  }, [user, inProject, activeSlugOrId, currentProject, members.length, fetchWithAuth, dispatch]);

  // Load unread notifications count
  const loadUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetchWithAuth('/api/notifications/unread-count');
      const data = await res.json();
      if (res.ok && data.success) {
        setUnreadCount(Number(data.count) || 0);
      }
    } catch {
      setUnreadCount(0);
    }
  }, [user, fetchWithAuth]);

  useEffect(() => {
    void loadUnreadCount();
    const onUpdate = () => void loadUnreadCount();
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, onUpdate);
    const interval = window.setInterval(() => void loadUnreadCount(), 60_000);
    return () => {
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, onUpdate);
      window.clearInterval(interval);
    };
  }, [loadUnreadCount]);

  // Close menus on outside click or escape
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (workspaceRef.current && !workspaceRef.current.contains(e.target as Node)) {
        setWorkspaceMenuOpen(false);
      }
      if (projectRef.current && !projectRef.current.contains(e.target as Node)) {
        setProjectMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setWorkspaceMenuOpen(false);
        setProjectMenuOpen(false);
        setSearchModalOpen(false);
      }
      // Global ⌘K / Ctrl+K shortcut
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Focus search input when modal opens
  useEffect(() => {
    if (searchModalOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
      setTicketSearchResults([]);
    }
  }, [searchModalOpen]);

  // Ticket search effect
  useEffect(() => {
    if (!searchModalOpen || !inProject || !activeSlugOrId) {
      setTicketSearchResults([]);
      return;
    }
    const q = searchQuery.trim();
    if (q.length < 2) {
      setTicketSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingTickets(true);
        const res = await fetchWithAuth(
          `/api/projects/${activeSlugOrId}/tickets/search?q=${encodeURIComponent(q)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.tickets)) {
            setTicketSearchResults(data.tickets.slice(0, 5));
          }
        }
      } catch {
        setTicketSearchResults([]);
      } finally {
        setIsSearchingTickets(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, searchModalOpen, inProject, activeSlugOrId, fetchWithAuth]);

  // Determine current page context
  const getPageContext = () => {
    if (!inProject) {
      if (pathname === '/') return { label: 'Workspaces', icon: FolderKanban, href: '/' };
      if (pathname.startsWith('/notifications')) return { label: 'Notifications', icon: Bell, href: '/notifications' };
      if (pathname.startsWith('/profile')) return { label: 'Profile', icon: Users, href: '/profile' };
      if (pathname === '/projects/new') return { label: 'New Project', icon: PlusCircle, href: '/projects/new' };
      return null;
    }

    if (pathname.includes('/board')) return { label: 'Board', icon: Kanban, href: `/projects/${slug}/board` };
    if (pathname.includes('/knowledge')) return { label: 'Knowledge', icon: BookOpen, href: `/projects/${slug}/knowledge` };
    if (pathname.includes('/roadmap')) return { label: 'Roadmap', icon: Compass, href: `/projects/${slug}/roadmap` };
    if (pathname.includes('/plan')) return { label: 'Sprint Plan', icon: CalendarClock, href: `/projects/${slug}/plan` };
    if (pathname.includes('/analytics')) return { label: 'Analytics', icon: BarChart3, href: `/projects/${slug}/analytics` };
    if (pathname.includes('/members')) return { label: 'Team', icon: Users, href: `/projects/${slug}/members` };
    return { label: 'Overview', icon: Layers, href: `/projects/${slug}` };
  };

  const pageContext = getPageContext();
  const visibleMembers = members.slice(0, 4);
  const memberOverflow = Math.max(0, members.length - visibleMembers.length);

  const projectDestinations = inProject
    ? [
        { label: 'Overview', href: `/projects/${slug}`, icon: Layers, match: pathname === `/projects/${slug}` },
        { label: 'Knowledge', href: `/projects/${slug}/knowledge`, icon: BookOpen, match: pathname.includes('/knowledge') },
        { label: 'Roadmap', href: `/projects/${slug}/roadmap`, icon: Compass, match: pathname.includes('/roadmap') },
        { label: 'Sprint Plan', href: `/projects/${slug}/plan`, icon: CalendarClock, match: pathname.includes('/plan') },
        { label: 'Kanban Board', href: `/projects/${slug}/board`, icon: Kanban, match: pathname.includes('/board') },
        { label: 'Analytics', href: `/projects/${slug}/analytics`, icon: BarChart3, match: pathname.includes('/analytics') },
        { label: 'Team', href: `/projects/${slug}/members`, icon: Users, match: pathname.includes('/members') },
      ]
    : [];

  return (
    <>
      <header
        className={cn(
          'h-[58px] bg-navigation border-b border-divider px-3 sm:px-4 flex items-center justify-between shrink-0 z-30 w-full sticky top-0 backdrop-blur-md',
          className
        )}
      >
        {/* Left Section: Logo, Home, Workspace, Project Selector & Page Context */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Sidebar Hamburger (only on pages with sidebar) */}
          {showSidebarToggle && (
            <button
              type="button"
              aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              onClick={onToggleSidebar}
              className="lg:hidden w-8 h-8 rounded-lg text-ts hover:text-tp hover:bg-surface flex items-center justify-center transition-colors -ml-1 mr-0.5"
            >
              {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          )}

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group mr-0.5 shrink-0 select-none">
            <div className="w-7 h-7 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent group-hover:bg-accent/25 transition-colors">
              <Sparkles className="h-[17px] w-[17px]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] font-semibold tracking-tight text-tp">TaskPulse</span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-accent/20 text-accent leading-none">
                AI
              </span>
            </div>
          </Link>

          {/* Workspace Home Link */}
          <Link
            href="/"
            className="w-7 h-7 rounded-md text-ts hover:text-tp hover:bg-elevated/70 hidden xs:flex items-center justify-center transition-colors shrink-0"
            title="Workspace Home"
          >
            <Home className="h-[18px] w-[18px]" />
          </Link>

          <span className="text-border text-sm hidden xs:inline select-none">/</span>

          {/* Workspace Switcher */}
          <div ref={workspaceRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setWorkspaceMenuOpen((prev) => !prev);
                setProjectMenuOpen(false);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-elevated/70 text-ts hover:text-tp transition-colors text-xs font-medium"
              title="Switch workspace"
            >
              <span className="truncate max-w-[100px] sm:max-w-[120px]">Workspace</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
            </button>

            {workspaceMenuOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-60 rounded-modal border border-border bg-elevated p-1.5 shadow-dropdown z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1.5 text-caption uppercase tracking-wider text-tm">Workspaces</div>
                <div className="flex items-center justify-between px-2.5 py-2 rounded-button bg-accent-subtle text-accent text-xs font-medium mb-1">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="h-3.5 w-3.5" />
                    <span>Default Workspace</span>
                  </div>
                  <Check className="h-3.5 w-3.5" />
                </div>

                <div className="border-t border-divider my-1" />

                <Link
                  href="/"
                  onClick={() => setWorkspaceMenuOpen(false)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-button text-xs text-ts hover:text-tp hover:bg-hover transition-colors"
                >
                  <Home className="h-3.5 w-3.5 text-tm" />
                  <span>Workspaces Dashboard</span>
                </Link>
                <Link
                  href="/projects/new"
                  onClick={() => setWorkspaceMenuOpen(false)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-button text-xs text-ts hover:text-tp hover:bg-hover transition-colors"
                >
                  <PlusCircle className="h-3.5 w-3.5 text-tm" />
                  <span>New Project</span>
                </Link>
              </div>
            )}
          </div>

          {/* Project Selector & Destinations Popover */}
          {inProject && (
            <>
              <span className="text-border text-xs select-none">/</span>
              <div ref={projectRef} className="relative min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setProjectMenuOpen((prev) => !prev);
                    setWorkspaceMenuOpen(false);
                  }}
                  className="flex items-center gap-1 px-1.5 py-1 rounded-md hover:bg-elevated/70 text-ts hover:text-tp transition-colors text-xs font-medium max-w-[130px] sm:max-w-[170px] truncate"
                  title={`Project: ${projectName} (Click to switch or navigate)`}
                >
                  <span className="truncate">{projectName}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                </button>

                {projectMenuOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-64 rounded-modal border border-border bg-elevated p-1.5 shadow-dropdown z-50 animate-in fade-in zoom-in-95 duration-100 max-h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar">
                    <div className="px-2.5 py-1.5 border-b border-divider">
                      <p className="text-caption uppercase tracking-wider text-tm">Active Project</p>
                      <p className="text-xs font-semibold text-tp truncate mt-0.5">{projectName}</p>
                      <p className="text-[10px] font-mono text-ts truncate">{slug}</p>
                    </div>

                    {/* Project Navigation Destinations (crucial for Board and quick jumps!) */}
                    <div className="py-1">
                      <p className="px-2.5 py-1 text-[10px] uppercase tracking-wider text-tm font-medium">
                        Project Views
                      </p>
                      {projectDestinations.map((dest) => {
                        const Icon = dest.icon;
                        return (
                          <Link
                            key={dest.href}
                            href={dest.href}
                            onClick={() => setProjectMenuOpen(false)}
                            className={cn(
                              'flex items-center gap-2.5 px-2.5 py-1.5 rounded-button text-xs transition-colors',
                              dest.match
                                ? 'bg-accent-subtle text-accent font-medium'
                                : 'text-ts hover:text-tp hover:bg-hover'
                            )}
                          >
                            <Icon className={cn('h-3.5 w-3.5 shrink-0', dest.match ? 'text-accent' : 'text-tm')} />
                            <span className="flex-1 truncate">{dest.label}</span>
                            {dest.match && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                          </Link>
                        );
                      })}
                    </div>

                    {/* Other Projects */}
                    {projects.length > 1 && (
                      <div className="border-t border-divider pt-1">
                        <p className="px-2.5 py-1 text-[10px] uppercase tracking-wider text-tm font-medium">
                          Switch Project
                        </p>
                        {projects
                          .filter((p) => p.slug !== slug && p.id !== slug)
                          .slice(0, 4)
                          .map((p) => (
                            <Link
                              key={p.id}
                              href={`/projects/${p.slug || p.id}/board`}
                              onClick={() => setProjectMenuOpen(false)}
                              className="flex items-center justify-between px-2.5 py-1.5 rounded-button text-xs text-ts hover:text-tp hover:bg-hover transition-colors"
                            >
                              <span className="truncate max-w-[180px]">{p.name}</span>
                            </Link>
                          ))}
                      </div>
                    )}

                    <div className="border-t border-divider pt-1">
                      <Link
                        href="/projects/new"
                        onClick={() => setProjectMenuOpen(false)}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-button text-xs text-accent hover:bg-accent-subtle transition-colors"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span>Create New Project</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Current Page Context (e.g. / Board) */}
          {pageContext && (
            <>
              <span className="text-border text-xs hidden sm:inline select-none">/</span>
              <div className="hidden sm:flex items-center gap-1.5 text-xs min-w-0">
                <span className="text-tp font-medium flex items-center gap-1 truncate">
                  <pageContext.icon className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span>{pageContext.label}</span>
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right Section: Search, Notifications, Avatars, Share, Settings, Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Global Search Bar */}
          <button
            type="button"
            onClick={() => setSearchModalOpen(true)}
            className="hidden md:flex items-center gap-2 h-8 px-2.5 rounded-lg bg-surface border border-border/80 text-ts hover:border-accent/40 w-44 lg:w-52 transition-all text-left"
            title="Global search (⌘K)"
          >
            <Search className="h-4 w-4 text-ts shrink-0" />
            <span className="text-xs truncate">Search anything...</span>
            <span className="ml-auto font-mono text-[10px] bg-navigation px-1 py-0.5 rounded border border-border/60 text-ts shrink-0">
              ⌘K
            </span>
          </button>

          {/* Mobile Search Icon Button */}
          <button
            type="button"
            onClick={() => setSearchModalOpen(true)}
            className="md:hidden w-8 h-8 rounded-lg text-ts hover:text-tp hover:bg-surface flex items-center justify-center transition-colors"
            title="Search (⌘K)"
            aria-label="Search"
          >
            <Search className="h-[18px] w-[18px]" />
          </button>

          {/* Notifications Bell */}
          <Link
            href="/notifications"
            className="w-8 h-8 rounded-lg text-ts hover:text-tp hover:bg-surface flex items-center justify-center relative transition-colors"
            title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[8px] h-2 rounded-full bg-accent animate-pulse" />
            )}
          </Link>

          {/* Project Members Avatars (when in project) */}
          {inProject && visibleMembers.length > 0 && (
            <div className="hidden sm:flex items-center -space-x-2 pl-0.5">
              {visibleMembers.map((m, idx) => {
                const tone = AVATAR_TONES[idx % AVATAR_TONES.length];
                const displayName = m.user.username || m.user.email || 'Member';
                return (
                  <div
                    key={m.userId}
                    className={cn(
                      'w-7 h-7 rounded-full border-2 border-navigation flex items-center justify-center text-[10px] font-semibold cursor-default hover:z-10 transition-transform hover:scale-105 select-none',
                      tone.bg,
                      tone.text
                    )}
                    title={displayName}
                  >
                    {initials(m.user.username, m.user.email)}
                  </div>
                );
              })}
              {memberOverflow > 0 && (
                <div
                  className="w-7 h-7 rounded-full bg-elevated border-2 border-navigation flex items-center justify-center text-[10px] font-medium text-ts select-none"
                  title={`${memberOverflow} more team members`}
                >
                  +{memberOverflow}
                </div>
              )}
            </div>
          )}

          {/* Share / Invite Button (when in project) */}
          {inProject && (
            <Link
              href={`/projects/${slug}/members`}
              className="h-8 px-2.5 rounded-lg bg-surface hover:bg-elevated border border-border/80 text-tp hover:border-accent/40 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Invite or view team members"
            >
              <UserPlus className="h-[15px] w-[15px] text-ts" />
              <span className="hidden sm:inline">Share</span>
            </Link>
          )}

          {/* Settings Link */}
          <Link
            href={inProject ? `/projects/${slug}` : '/profile'}
            className="w-8 h-8 rounded-lg text-ts hover:text-tp hover:bg-surface flex items-center justify-center transition-colors"
            title={inProject ? 'Project overview & settings' : 'Account settings'}
          >
            <Settings className="h-[18px] w-[18px]" />
          </Link>

          {/* User Profile Dropdown Menu */}
          {user && <ProfileDropdown />}
        </div>
      </header>

      {/* Global Quick Search & Command Dialog (⌘K) */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-canvas/80 backdrop-blur-sm animate-in fade-in duration-150">
          <button
            type="button"
            className="fixed inset-0 cursor-default"
            aria-label="Close search"
            onClick={() => setSearchModalOpen(false)}
          />

          <div className="relative w-full max-w-xl rounded-modal border border-border bg-elevated shadow-modal overflow-hidden z-10 flex flex-col animate-in zoom-in-95 duration-150">
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface">
              <Search className="h-5 w-5 text-accent shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tickets, destinations, or projects..."
                className="w-full bg-transparent text-sm text-tp placeholder-ts outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded text-ts hover:text-tp"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <span className="font-mono text-[10px] bg-navigation px-1.5 py-0.5 rounded border border-border text-ts shrink-0">
                ESC
              </span>
            </div>

            {/* Search Results & Quick Actions */}
            <div className="max-h-96 overflow-y-auto custom-scrollbar p-2 space-y-3">
              {/* Ticket Search Results (if querying in project) */}
              {inProject && searchQuery.trim().length >= 2 && (
                <div>
                  <div className="px-2 py-1 text-[11px] font-semibold text-tm uppercase tracking-wider flex items-center justify-between">
                    <span>Tickets in {projectName}</span>
                    {isSearchingTickets && <span className="text-[10px] lowercase text-accent">Searching...</span>}
                  </div>
                  {ticketSearchResults.length > 0 ? (
                    <div className="space-y-1">
                      {ticketSearchResults.map((t) => (
                        <Link
                          key={t.id}
                          href={`/projects/${slug}/board`}
                          onClick={() => setSearchModalOpen(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-button hover:bg-hover text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-accent/20 text-accent font-semibold shrink-0">
                              {t.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span className="text-tp font-medium truncate">{t.title}</span>
                          </div>
                          <span className="text-[10px] text-ts shrink-0 ml-2">{t.status}</span>
                        </Link>
                      ))}
                    </div>
                  ) : !isSearchingTickets ? (
                    <p className="px-3 py-2 text-xs text-ts">No tickets matching &quot;{searchQuery}&quot;</p>
                  ) : null}
                </div>
              )}

              {/* Project Navigation Destinations */}
              {inProject && (
                <div>
                  <div className="px-2 py-1 text-[11px] font-semibold text-tm uppercase tracking-wider">
                    {projectName} Destinations
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {projectDestinations
                      .filter((d) =>
                        searchQuery ? d.label.toLowerCase().includes(searchQuery.toLowerCase()) : true
                      )
                      .map((d) => {
                        const Icon = d.icon;
                        return (
                          <Link
                            key={d.href}
                            href={d.href}
                            onClick={() => setSearchModalOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-button text-xs text-ts hover:text-tp hover:bg-hover transition-colors"
                          >
                            <Icon className="h-3.5 w-3.5 text-accent shrink-0" />
                            <span className="truncate">{d.label}</span>
                          </Link>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Projects Switcher in Search */}
              <div>
                <div className="px-2 py-1 text-[11px] font-semibold text-tm uppercase tracking-wider">
                  Projects
                </div>
                <div className="space-y-1">
                  {projects
                    .filter((p) =>
                      searchQuery ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
                    )
                    .map((p) => (
                      <Link
                        key={p.id}
                        href={`/projects/${p.slug || p.id}/board`}
                        onClick={() => setSearchModalOpen(false)}
                        className="flex items-center justify-between px-3 py-2 rounded-button text-xs text-ts hover:text-tp hover:bg-hover transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FolderKanban className="h-3.5 w-3.5 text-ts shrink-0" />
                          <span className="truncate font-medium">{p.name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-ts">{p.slug || p.id}</span>
                      </Link>
                    ))}
                  <Link
                    href="/projects/new"
                    onClick={() => setSearchModalOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-button text-xs text-accent hover:bg-accent-subtle transition-colors"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Create new project</span>
                  </Link>
                </div>
              </div>

              {/* Workspace Navigation */}
              <div>
                <div className="px-2 py-1 text-[11px] font-semibold text-tm uppercase tracking-wider">
                  Workspace
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <Link
                    href="/"
                    onClick={() => setSearchModalOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-button text-xs text-ts hover:text-tp hover:bg-hover transition-colors"
                  >
                    <Home className="h-3.5 w-3.5 text-tm shrink-0" />
                    <span>All Workspaces</span>
                  </Link>
                  <Link
                    href="/notifications"
                    onClick={() => setSearchModalOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-button text-xs text-ts hover:text-tp hover:bg-hover transition-colors"
                  >
                    <Bell className="h-3.5 w-3.5 text-tm shrink-0" />
                    <span>Notifications</span>
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setSearchModalOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-button text-xs text-ts hover:text-tp hover:bg-hover transition-colors"
                  >
                    <Users className="h-3.5 w-3.5 text-tm shrink-0" />
                    <span>Account Profile</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
