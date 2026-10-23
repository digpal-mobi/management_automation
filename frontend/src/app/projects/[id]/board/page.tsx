'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Project, ProjectMember } from '@/types';
import { Board } from '@/components/kanban/Board';
import { ProjectNav } from '@/components/layout/ProjectNav';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { AlertCircle, Kanban } from 'lucide-react';
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
      <div className="space-y-6 animate-in fade-in duration-200">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-10 w-96 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Skeleton className="h-[65vh] rounded-2xl" />
          <Skeleton className="h-[65vh] rounded-2xl" />
          <Skeleton className="h-[65vh] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-6 w-6 text-[#526174]" />}
        title="Failed to load Kanban board"
        description={error || 'Project not found or you lack permission to view this workspace.'}
        action={
          <Link href="/">
            <Button variant="outline" size="sm">
              Return to Workspaces
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Standard Page Header */}
      <PageHeader
        backLink={{ label: 'All Projects', href: '/' }}
        breadcrumbs={[
          { label: 'Projects', href: '/' },
          { label: project.name },
          { label: 'Kanban Board' },
        ]}
        icon={<Kanban className="h-6 w-6 text-[#003049]" />}
        title={project.name}
        description={project.description || 'Sprint & engineering backlog Kanban workflow.'}
        actions={
          <ProjectNav
            projectId={projectId}
            memberCount={members.length}
            ticketCount={project.ticketCount}
          />
        }
      />

      {/* Main Kanban Board */}
      <Board projectId={projectId} project={project} members={members} />
    </div>
  );
}
