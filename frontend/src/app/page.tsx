'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Project } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Sparkles,
  Kanban,
  PlusCircle,
  FolderKanban,
  ArrowRight,
  Loader2,
  Users,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, fetchWithAuth, isLoading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const loadProjects = async () => {
      try {
        setLoading(true);
        const res = await fetchWithAuth('/api/projects');
        const data = await res.json();
        if (res.ok && data.success) {
          setProjects(data.projects || []);
        }
      } catch (err) {
        console.error('Failed to load projects:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [user, authLoading, fetchWithAuth, router]);

  if (authLoading || (loading && !projects.length)) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
        <p className="text-xs text-slate-400">Loading your workspaces...</p>
      </div>
    );
  }

  const totalTickets = projects.reduce((acc, p) => acc + (p.ticketCount || 0), 0);
  const totalMembers = projects.reduce((acc, p) => acc + (p.memberCount || 0), 0);

  return (
    <div className="space-y-10 py-4 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border border-slate-800 p-8 sm:p-10 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400">
            <Sparkles className="h-3.5 w-3.5" />
            AI Project Management System
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Welcome back, {user?.username}!
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Collaborate on engineering projects with autonomous AI ticket generation,
            pgvector semantic search, and role-based permissions.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlusCircle className="h-4 w-4" />
              Create New Project
            </Link>
          </div>
        </div>

        {/* Decorative Glow */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 pointer-events-none bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]" />
      </div>

      {/* Global Stat Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Your Projects</div>
            <div className="text-2xl font-bold text-slate-100 mt-0.5">{projects.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <FolderKanban className="h-5 w-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Tickets</div>
            <div className="text-2xl font-bold text-slate-100 mt-0.5">{totalTickets}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Kanban className="h-5 w-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Collaborators</div>
            <div className="text-2xl font-bold text-purple-400 mt-0.5">{totalMembers}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Users className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Projects List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Your Workspaces</h2>
            <p className="text-xs text-slate-400">
              Projects you own or have been invited to collaborate on
            </p>
          </div>
          <Link
            href="/projects/new"
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
          >
            <PlusCircle className="h-4 w-4" />
            New Project
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="p-16 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <FolderKanban className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">
              No projects yet. Create your first project.
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Get started by creating a workspace to manage developer tickets, invite team members, and track workflows.
            </p>
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              Create Your First Project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="group flex flex-col justify-between p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition-all duration-200 shadow-sm hover:shadow-xl"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {proj.name}
                    </h3>
                    {proj.userRole && (
                      <Badge variant="role" role={proj.userRole} size="sm" />
                    )}
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {proj.description || 'No description provided.'}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Kanban className="h-3.5 w-3.5 text-slate-500" />
                      {proj.ticketCount || 0} tickets
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-slate-500" />
                      {proj.memberCount || 1} members
                    </span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <Link
                    href={`/projects/${proj.id}/members`}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-medium"
                  >
                    <Users className="h-3.5 w-3.5" />
                    Team
                  </Link>

                  <Link
                    href={`/projects/${proj.id}/board`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 group-hover:translate-x-0.5 transition-all"
                  >
                    Open Board
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
