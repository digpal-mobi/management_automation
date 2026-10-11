'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { setUsers, setCurrentUser, setProjects } from '@/store/projectSlice';
import { api } from '@/lib/api';
import { socketClient } from '@/lib/socket';
import {
  Sparkles,
  Kanban,
  BarChart3,
  PlusCircle,
  FolderKanban,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { currentProject, projects, users, currentUser } = useAppSelector(
    (state) => state.project
  );

  useEffect(() => {
    // Connect to WebSocket
    socketClient.connect();

    // Fetch initial users and projects
    api.getUsers().then((res) => {
      if (res.success && res.users) {
        dispatch(setUsers(res.users));
      }
    });

    api.getProjects().then((res) => {
      if (res.success && res.projects) {
        dispatch(setProjects(res.projects));
      }
    });
  }, [dispatch]);

  const activeProjectId = currentProject?.id || projects[0]?.id;

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
                TaskPulse <span className="text-cyan-400 font-extrabold">AI</span>
              </span>
              <span className="text-[10px] font-medium text-slate-400 block -mt-1 tracking-wider uppercase">
                Autonomous PM
              </span>
            </div>
          </Link>

          {/* Project Navigation Links if inside project */}
          {activeProjectId && (
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
                href={`/projects/${activeProjectId}/analytics`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname.includes('/analytics')
                    ? 'bg-slate-800 text-indigo-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                Velocity & Metrics
              </Link>
            </div>
          )}
        </div>

        {/* Right: Actions, User Selector & WebSocket Status */}
        <div className="flex items-center gap-4">
          {/* WebSocket Status Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Real-time Sync</span>
          </div>

          {/* User Role Switcher */}
          {users.length > 0 && (
            <div className="relative group">
              <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800/80 transition-colors text-xs text-slate-300">
                <img
                  src={
                    currentUser?.avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
                  }
                  alt={currentUser?.name || 'User'}
                  className="w-5 h-5 rounded-full object-cover border border-indigo-500/40"
                />
                <span className="hidden sm:inline font-medium">{currentUser?.name}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 font-semibold uppercase">
                  {currentUser?.role?.replace('_', ' ')}
                </span>
                <ChevronDown className="h-3 w-3 text-slate-500" />
              </button>

              <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl bg-slate-900 border border-slate-800 shadow-xl py-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Switch Active Role
                </div>
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => dispatch(setCurrentUser(u))}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-left transition-colors ${
                      currentUser?.id === u.id
                        ? 'bg-indigo-600/10 text-indigo-400 font-medium'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <img
                      src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={u.name}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <div className="flex-1 truncate">
                      <div className="truncate font-medium">{u.name}</div>
                      <div className="text-[10px] text-slate-500">{u.role}</div>
                    </div>
                    {currentUser?.id === u.id && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* New Project Button */}
          <Link
            href="/projects/new"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">New Project & PRD</span>
            <span className="sm:hidden">New</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
