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
  Compass,
  FileText,
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
        <Loader2 className="h-7 w-7 text-white animate-spin" />
        <p className="text-xs text-[#A3A3A3]">Loading your workspaces...</p>
      </div>
    );
  }

  const totalTickets = projects.reduce((acc, p) => acc + (p.ticketCount || 0), 0);
  const totalMembers = projects.reduce((acc, p) => acc + (p.memberCount || 0), 0);

  return (
    <div className="space-y-8 py-4 max-w-7xl mx-auto">
      {/* Welcome Banner - Strict Monochrome */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0A0A0A] border border-[#2A2A2A] p-8 sm:p-10 shadow-sm">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141414] border border-[#2A2A2A] text-xs font-semibold text-[#F5F5F5]">
            <Sparkles className="h-3.5 w-3.5 text-white" />
            AI Project Management & Delivery Platform
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Welcome back, {user?.username}
          </h1>
          <p className="text-sm sm:text-base text-[#A3A3A3] leading-relaxed">
            Ingest technical documentation, extract structured requirements and roadmap features,
            and autonomously generate developer-ready backlog tickets on your terms.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-[#F5F5F5] text-black font-semibold text-sm transition-all"
            >
              <PlusCircle className="h-4 w-4" />
              Create New Project
            </Link>
          </div>
        </div>
      </div>

      {/* Global Stat Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-[#2A2A2A] flex items-center justify-between">
          <div>
            <div className="text-xs text-[#525252] font-medium uppercase tracking-wider">Your Projects</div>
            <div className="text-2xl font-bold text-white mt-0.5">{projects.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#2A2A2A] flex items-center justify-center text-white">
            <FolderKanban className="h-5 w-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-[#2A2A2A] flex items-center justify-between">
          <div>
            <div className="text-xs text-[#525252] font-medium uppercase tracking-wider">Total Tickets</div>
            <div className="text-2xl font-bold text-white mt-0.5">{totalTickets}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#2A2A2A] flex items-center justify-center text-white">
            <Kanban className="h-5 w-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-[#2A2A2A] flex items-center justify-between">
          <div>
            <div className="text-xs text-[#525252] font-medium uppercase tracking-wider">Collaborators</div>
            <div className="text-2xl font-bold text-white mt-0.5">{totalMembers}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#2A2A2A] flex items-center justify-center text-white">
            <Users className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Projects List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Your Workspaces</h2>
            <p className="text-xs text-[#A3A3A3]">
              Workspaces you own or collaborate on with your engineering team
            </p>
          </div>
          <Link
            href="/projects/new"
            className="flex items-center gap-1.5 text-xs font-semibold text-white hover:text-[#A3A3A3] transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            New Project
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="p-16 text-center rounded-2xl bg-[#0A0A0A] border border-dashed border-[#2A2A2A] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#141414] border border-[#2A2A2A] text-white flex items-center justify-center mx-auto">
              <FolderKanban className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-white">
              No projects yet. Create your first project.
            </h3>
            <p className="text-xs text-[#A3A3A3] max-w-sm mx-auto">
              Enter your project name, upload technical PRDs or specifications, and let AI analyze modules, constraints, and features.
            </p>
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-black hover:bg-[#F5F5F5] text-xs font-semibold transition-colors"
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
                className="group flex flex-col justify-between p-5 rounded-2xl bg-[#0A0A0A] hover:bg-[#141414] border border-[#2A2A2A] hover:border-[#404040] transition-all duration-200 shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-white transition-colors line-clamp-1">
                      {proj.name}
                    </h3>
                    {proj.userRole && (
                      <Badge variant="role" role={proj.userRole} size="sm" />
                    )}
                  </div>

                  <p className="text-xs text-[#A3A3A3] line-clamp-2 leading-relaxed">
                    {proj.description || 'No description provided.'}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-[#525252] pt-1">
                    <span className="flex items-center gap-1">
                      <Kanban className="h-3.5 w-3.5 text-[#525252]" />
                      {proj.ticketCount || 0} tickets
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-[#525252]" />
                      {proj.memberCount || 1} members
                    </span>
                  </div>
                </div>

                {/* Direct Section Access & Board Link */}
                <div className="pt-4 mt-4 border-t border-[#2A2A2A] space-y-3">
                  <div className="grid grid-cols-3 gap-1 text-[11px] font-medium text-[#A3A3A3]">
                    <Link
                      href={`/projects/${proj.id}/knowledge`}
                      className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#141414] hover:bg-[#2A2A2A] hover:text-white transition-colors"
                    >
                      <FileText className="h-3 w-3" />
                      Knowledge
                    </Link>
                    <Link
                      href={`/projects/${proj.id}/roadmap`}
                      className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#141414] hover:bg-[#2A2A2A] hover:text-white transition-colors"
                    >
                      <Compass className="h-3 w-3" />
                      Roadmap
                    </Link>
                    <Link
                      href={`/projects/${proj.id}/members`}
                      className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#141414] hover:bg-[#2A2A2A] hover:text-white transition-colors"
                    >
                      <Users className="h-3 w-3" />
                      Team
                    </Link>
                  </div>

                  <Link
                    href={`/projects/${proj.id}/board`}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white hover:bg-[#F5F5F5] text-black text-xs font-semibold transition-all"
                  >
                    <span>Open Kanban Board</span>
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
