'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Project, ProjectMember } from '@/types';
import { Board } from '@/components/kanban/Board';
import { Loader2, AlertCircle, Kanban, Users, ArrowLeft, FileText, Compass } from 'lucide-react';
import Link from 'next/link';

export default function ProjectBoardPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { user, fetchWithAuth, isLoading: authLoading } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/login?redirect=/projects/${projectId}/board`);
      return;
    }

    if (!projectId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        // 1. Fetch project
        const pRes = await fetchWithAuth(`/api/projects/${projectId}`);
        const pData = await pRes.json();
        if (!pRes.ok || !pData.success) {
          setError(pData.error || 'Failed to load project details');
          return;
        }
        setProject(pData.project);

        // 2. Fetch project members
        const mRes = await fetchWithAuth(`/api/projects/${projectId}/members`);
        const mData = await mRes.json();
        if (mRes.ok && mData.success) {
          setMembers(mData.members || []);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load board data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId, user, authLoading, fetchWithAuth, router]);

  if (loading || authLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-7 w-7 text-white animate-spin" />
        <p className="text-xs text-[#A3A3A3]">Loading Kanban board & tickets...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3 text-center">
        <AlertCircle className="h-7 w-7 text-white" />
        <h3 className="text-sm font-semibold text-white">Failed to load board</h3>
        <p className="text-xs text-[#A3A3A3] max-w-sm">{error}</p>
        <Link
          href="/"
          className="px-4 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white hover:bg-[#2A2A2A]"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Board Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2A2A2A]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#525252] mb-1.5">
            <Link href="/" className="hover:text-white flex items-center gap-1 transition-colors">
              <ArrowLeft className="h-3 w-3" />
              <span>Projects</span>
            </Link>
            <span>/</span>
            <span className="text-white font-medium truncate max-w-xs">{project.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Kanban className="h-6 w-6 text-white" />
            <span>{project.name}</span>
          </h1>
          {project.description && (
            <p className="text-xs text-[#A3A3A3] mt-1 max-w-xl line-clamp-1">
              {project.description}
            </p>
          )}
        </div>

        {/* Tab Links to All 4 Project Areas */}
        <div className="flex items-center gap-1.5 bg-[#0A0A0A] p-1 rounded-xl border border-[#2A2A2A]">
          <Link
            href={`/projects/${projectId}/knowledge`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#A3A3A3] hover:text-white hover:bg-[#141414] transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Knowledge</span>
          </Link>
          <Link
            href={`/projects/${projectId}/roadmap`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#A3A3A3] hover:text-white hover:bg-[#141414] transition-colors"
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Roadmap</span>
          </Link>
          <Link
            href={`/projects/${projectId}/board`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-black shadow-sm"
          >
            <Kanban className="h-3.5 w-3.5" />
            <span>Board</span>
          </Link>
          <Link
            href={`/projects/${projectId}/members`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#A3A3A3] hover:text-white hover:bg-[#141414] transition-colors"
          >
            <Users className="h-3.5 w-3.5" />
            <span>Team ({members.length})</span>
          </Link>
        </div>
      </div>

      {/* Main Kanban Board Area */}
      <Board
        projectId={projectId}
        project={project}
        members={members}
      />
    </div>
  );
}
