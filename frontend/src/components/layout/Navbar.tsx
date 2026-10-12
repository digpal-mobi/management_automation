'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Kanban,
  PlusCircle,
  LogOut,
  LogIn,
  UserPlus,
  Users,
  BookOpen,
  Map,
  Layers,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Extract project ID if current pathname is /projects/[id]/...
  const projectMatch = pathname.match(/^\/projects\/([^\/]+)/);
  const activeProjectId = projectMatch ? projectMatch[1] : null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#2A2A2A] bg-black/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left: Brand + Project Navigation */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black font-black text-sm shadow-sm transition-transform group-hover:scale-105">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                PULSE <span className="text-neutral-400 font-normal">AI</span>
              </span>
              <span className="text-[10px] font-mono text-neutral-500 block -mt-1 tracking-wider uppercase">
                Knowledge & Roadmap PM
              </span>
            </div>
          </Link>

          {/* Project Navigation Links if inside project */}
          {activeProjectId && activeProjectId !== 'new' && (
            <div className="hidden lg:flex items-center gap-1.5 border-l border-[#2A2A2A] pl-5">
              <Link
                href={`/projects/${activeProjectId}/knowledge`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname.includes('/knowledge')
                    ? 'bg-[#141414] text-white border border-[#2A2A2A]'
                    : 'text-neutral-400 hover:text-white hover:bg-[#0A0A0A]'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Knowledge & Docs</span>
              </Link>

              <Link
                href={`/projects/${activeProjectId}/roadmap`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname.includes('/roadmap')
                    ? 'bg-[#141414] text-white border border-[#2A2A2A]'
                    : 'text-neutral-400 hover:text-white hover:bg-[#0A0A0A]'
                }`}
              >
                <Map className="h-3.5 w-3.5" />
                <span>Roadmap</span>
              </Link>

              <Link
                href={`/projects/${activeProjectId}/board`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname.includes('/board')
                    ? 'bg-[#141414] text-white border border-[#2A2A2A]'
                    : 'text-neutral-400 hover:text-white hover:bg-[#0A0A0A]'
                }`}
              >
                <Kanban className="h-3.5 w-3.5" />
                <span>Board</span>
              </Link>

              <Link
                href={`/projects/${activeProjectId}/members`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname.includes('/members')
                    ? 'bg-[#141414] text-white border border-[#2A2A2A]'
                    : 'text-neutral-400 hover:text-white hover:bg-[#0A0A0A]'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Team</span>
              </Link>
            </div>
          )}
        </div>

        {/* Right: Actions & User Info */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* New Project Button */}
              <Link
                href="/projects/new"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Project</span>
                <span className="sm:hidden">New</span>
              </Link>

              {/* User Profile Pill */}
              <div className="flex items-center gap-2.5 pl-2 border-l border-[#2A2A2A]">
                <div className="w-7 h-7 rounded-full bg-[#141414] border border-[#2A2A2A] text-white text-xs font-bold flex items-center justify-center">
                  {(user.username || user.email)[0].toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <span className="text-xs font-medium text-white block leading-none">
                    {user.username}
                  </span>
                  <span className="text-[10px] text-neutral-500 block leading-none mt-1">
                    {user.email}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                title="Log out"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#141414] border border-transparent hover:border-[#2A2A2A] transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-[#141414] border border-[#2A2A2A]"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Log In</span>
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-black hover:bg-neutral-200"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Register</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
