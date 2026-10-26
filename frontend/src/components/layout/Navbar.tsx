'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Kanban,
  PlusCircle,
  LogIn,
  UserPlus,
  Users,
  BookOpen,
  Compass,
  Layers,
  BarChart3,
  Menu,
  X,
  FolderKanban,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { ProfileDropdown } from '@/components/layout/ProfileDropdown';

export function Navbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Extract project ID if current pathname is /projects/[id]/...
  const projectMatch = pathname.match(/^\/projects\/([^\/]+)/);
  const activeProjectId = projectMatch ? projectMatch[1] : null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E2E8F0] bg-white/95 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 max-w-7xl mx-auto">
        {/* Left: Brand + Desktop Project Navigation */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group select-none">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#003049] text-white font-black text-sm shadow-sm transition-transform group-hover:scale-105">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-[#003049] flex items-center gap-1.5">
                TASKPULSE <span className="text-[#669BBC] font-bold">AI</span>
              </span>
              <span className="text-[10px] font-mono text-[#526174] block -mt-1 tracking-wider uppercase">
                Knowledge & Roadmap PM
              </span>
            </div>
          </Link>

          {/* Desktop Project Navigation Links if inside project */}
          {activeProjectId && activeProjectId !== 'new' && (
            <div className="hidden lg:flex items-center gap-1.5 border-l border-[#E2E8F0] pl-5">
              <Link
                href={`/projects/${activeProjectId}/knowledge`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname.includes('/knowledge')
                    ? 'bg-[#003049] text-white shadow-sm'
                    : 'text-[#526174] hover:text-[#003049] hover:bg-[#F1F4F7]'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Knowledge</span>
              </Link>

              <Link
                href={`/projects/${activeProjectId}/roadmap`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname.includes('/roadmap')
                    ? 'bg-[#003049] text-white shadow-sm'
                    : 'text-[#526174] hover:text-[#003049] hover:bg-[#F1F4F7]'
                }`}
              >
                <Compass className="h-3.5 w-3.5" />
                <span>Roadmap</span>
              </Link>

              <Link
                href={`/projects/${activeProjectId}/board`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname.includes('/board')
                    ? 'bg-[#003049] text-white shadow-sm'
                    : 'text-[#526174] hover:text-[#003049] hover:bg-[#F1F4F7]'
                }`}
              >
                <Kanban className="h-3.5 w-3.5" />
                <span>Board</span>
              </Link>

              <Link
                href={`/projects/${activeProjectId}/analytics`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname.includes('/analytics')
                    ? 'bg-[#003049] text-white shadow-sm'
                    : 'text-[#526174] hover:text-[#003049] hover:bg-[#F1F4F7]'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Analytics</span>
              </Link>

              <Link
                href={`/projects/${activeProjectId}/members`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname.includes('/members')
                    ? 'bg-[#003049] text-white shadow-sm'
                    : 'text-[#526174] hover:text-[#003049] hover:bg-[#F1F4F7]'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Team</span>
              </Link>
            </div>
          )}
        </div>

        {/* Right: Actions & User Info (Desktop) */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* New Project Button */}
              <Link
                href="/projects/new"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#003049] hover:bg-[#002437] text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Project</span>
                <span className="sm:hidden">New</span>
              </Link>

              <ProfileDropdown onOpen={() => setMobileMenuOpen(false)} />

              {/* Mobile Menu Toggle Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle navigation menu"
                aria-expanded={mobileMenuOpen}
                className="sm:hidden p-2 rounded-xl text-[#17212B] hover:bg-[#F1F4F7] border border-[#E2E8F0] transition-colors"
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#17212B] hover:text-[#003049] hover:bg-[#F1F4F7] border border-[#E2E8F0] transition-colors"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Log In</span>
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#003049] text-white hover:bg-[#002437] transition-colors shadow-sm"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Register</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && user && (
        <div className="sm:hidden border-t border-[#E2E8F0] bg-white px-4 py-4 space-y-4 shadow-dropdown animate-in slide-in-from-top-2 duration-150">
          {/* User profile row */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2.5">
              <Avatar
                name={user.username}
                email={user.email}
                avatarUrl={user.avatarUrl}
                size="sm"
              />
              <div>
                <span className="text-xs font-bold text-[#17212B] block">
                  {user.username}
                </span>
                <span className="text-[10px] text-[#526174] block truncate max-w-[200px]">
                  {user.email}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-[#526174]">Account menu</span>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                pathname === '/'
                  ? 'bg-[#003049] text-white font-semibold'
                  : 'text-[#17212B] hover:bg-[#F1F4F7]'
              }`}
            >
              <FolderKanban className="h-4 w-4" />
              <span>Workspaces Dashboard</span>
            </Link>

            {activeProjectId && activeProjectId !== 'new' && (
              <div className="pt-2 space-y-1">
                <div className="text-[10px] uppercase font-bold text-[#526174] px-3 tracking-wider">
                  Active Project
                </div>
                <Link
                  href={`/projects/${activeProjectId}/knowledge`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                    pathname.includes('/knowledge')
                      ? 'bg-[#003049] text-white font-semibold'
                      : 'text-[#17212B] hover:bg-[#F1F4F7]'
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Knowledge & Specifications</span>
                </Link>
                <Link
                  href={`/projects/${activeProjectId}/roadmap`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                    pathname.includes('/roadmap')
                      ? 'bg-[#003049] text-white font-semibold'
                      : 'text-[#17212B] hover:bg-[#F1F4F7]'
                  }`}
                >
                  <Compass className="h-4 w-4" />
                  <span>Roadmap</span>
                </Link>
                <Link
                  href={`/projects/${activeProjectId}/board`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                    pathname.includes('/board')
                      ? 'bg-[#003049] text-white font-semibold'
                      : 'text-[#17212B] hover:bg-[#F1F4F7]'
                  }`}
                >
                  <Kanban className="h-4 w-4" />
                  <span>Kanban Board</span>
                </Link>
                <Link
                  href={`/projects/${activeProjectId}/analytics`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                    pathname.includes('/analytics')
                      ? 'bg-[#003049] text-white font-semibold'
                      : 'text-[#17212B] hover:bg-[#F1F4F7]'
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Analytics</span>
                </Link>
                <Link
                  href={`/projects/${activeProjectId}/members`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                    pathname.includes('/members')
                      ? 'bg-[#003049] text-white font-semibold'
                      : 'text-[#17212B] hover:bg-[#F1F4F7]'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span>Team Members</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
