'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Project, ProjectAnalytics } from '@/types';
import { AnalyticsView } from '@/components/analytics/AnalyticsView';
import { ProjectNav } from '@/components/layout/ProjectNav';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { BarChart3, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function ProjectAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { user, fetchWithAuth, isLoading: authLoading } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/login?redirect=/projects/${projectId}/analytics`);
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

        // 2. Fetch analytics
        const aRes = await fetchWithAuth(`/api/projects/${projectId}/analysis`);
        const tRes = await fetchWithAuth(`/api/projects/${projectId}/tickets`);
        const tData = await tRes.json();

        const tickets = tData.tickets || [];
        const total = tickets.length;
        const todo = tickets.filter((t: any) => t.status === 'To Do').length;
        const inProgress = tickets.filter((t: any) => t.status === 'In Progress').length;
        const completed = tickets.filter((t: any) => t.status === 'Done').length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

        const priorityCounts: Record<string, number> = {
          Low: tickets.filter((t: any) => t.priority === 'Low').length,
          Medium: tickets.filter((t: any) => t.priority === 'Medium').length,
          High: tickets.filter((t: any) => t.priority === 'High').length,
          Critical: tickets.filter((t: any) => t.priority === 'Critical').length,
        };

        const typeCounts: Record<string, number> = {
          Feature: tickets.filter((t: any) => t.type === 'Feature').length,
          Bug: tickets.filter((t: any) => t.type === 'Bug').length,
          Task: tickets.filter((t: any) => t.type === 'Task').length,
          Improvement: tickets.filter((t: any) => t.type === 'Improvement').length,
        };

        setAnalytics({
          totalTickets: total,
          todoTickets: todo,
          inProgressTickets: inProgress,
          completedTickets: completed,
          completionRate: rate,
          priorityBreakdown: priorityCounts,
          typeBreakdown: typeCounts,
        });
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load project metrics');
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !project || !analytics) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-6 w-6 text-[#526174]" />}
        title="Unable to load analytics"
        description={error || 'Project metrics are currently unavailable.'}
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
      {/* Standardized Page Header */}
      <PageHeader
        backLink={{ label: 'All Projects', href: '/' }}
        breadcrumbs={[
          { label: 'Projects', href: '/' },
          { label: project.name },
          { label: 'Velocity & Metrics' },
        ]}
        icon={<BarChart3 className="h-6 w-6 text-[#003049]" />}
        title="Project Velocity & Metrics"
        description={project.description || 'Sprint progress, distribution by priority and type, and completion metrics.'}
        actions={
          <ProjectNav
            projectId={projectId}
            memberCount={project.memberCount}
            ticketCount={analytics.totalTickets}
          />
        }
      />

      <AnalyticsView project={project} analytics={analytics} />
    </div>
  );
}
