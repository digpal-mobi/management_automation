'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Sparkles,
  Kanban,
  BarChart3,
  PlusCircle,
  LogOut,
  LogIn,
  UserPlus,
  Users,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Extract project ID if current pathname is /projects/[id]/...
  const projectMatch = pathname.match(/^\/projects\/([^\/]+)/);
  const activeProjectId = projectMatch ? projectMatch[1] : null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left: Brand + Project Switcher */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                TaskPulse <span className="text-cyan-400 font-extrabold">PM</span>
              </span>
              <span className="text-[10px] font-medium text-slate-400 block -mt-1 tracking-wider uppercase">
                Project & Ticket Management
              </span>
            </div>
          </Link>

          {/* Project Navigation Links if inside project */}
          {activeProjectId && activeProjectId !== 'new' && (
            <div className="hidden md:flex items-center gap-1 border-l border-slate-800 pl-6">
              <Link
                href={`/projects/${activeProjectId}/board`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname.includes('/board')
                    ? 'bg-slate-800 text-indigo-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Kanban className="h-4 w-4" />
                Kanban Board
              </Link>

              <Link
                href={`/projects/${activeProjectId}/members`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname.includes('/members')
                    ? 'bg-slate-800 text-indigo-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Users className="h-4 w-4" />
                Team Members
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
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">New Project</span>
                <span className="sm:hidden">New</span>
              </Link>

              {/* User Profile Pill */}
              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
                <img
                  src={
                    user.avatarUrl ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                      user.username
                    )}`
                  }
                  alt={user.username}
                  className="w-7 h-7 rounded-full object-cover border border-slate-700 bg-slate-800"
                />
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-200 leading-tight">
                    {user.username}
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight">
                    {user.email}
                  </div>
                </div>

                {/* Sign Out Button */}
                <button
                  onClick={() => logout()}
                  title="Sign Out"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors ml-1"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign In
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
