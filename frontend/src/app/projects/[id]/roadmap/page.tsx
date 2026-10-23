'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Project, ProjectFeature } from '@/types';
import { RoadmapView } from '@/components/roadmap/RoadmapView';
import { ProjectNav } from '@/components/layout/ProjectNav';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Compass, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function ProjectRoadmapPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { user, fetchWithAuth, isLoading: authLoading } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [features, setFeatures] = useState<ProjectFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // 1. Fetch Project
      const pRes = await fetchWithAuth(`/api/projects/${projectId}`);
      const pData = await pRes.json();
      if (!pRes.ok || !pData.success) {
        setError(pData.error || 'Failed to load project details');
        return;
      }
      setProject(pData.project);

      // 2. Fetch Features
      const fRes = await fetchWithAuth(`/api/projects/${projectId}/features`);
      const fData = await fRes.json();
      if (fRes.ok && fData.success) {
        setFeatures(fData.features || []);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load roadmap features');
    } finally {
      setLoading(false);
    }
  }, [projectId, fetchWithAuth]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/login?redirect=/projects/${projectId}/roadmap`);
      return;
    }
    loadData();
  }, [authLoading, user, projectId, router, loadData]);

  if (loading || authLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-10 w-96 rounded-xl" />
        <div className="space-y-6">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-6 w-6 text-[#C1121F]" />}
        title="Unable to load roadmap"
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

  const canEdit =
    project.userRole === 'owner' ||
    project.userRole === 'manager' ||
    Boolean(user && (project.ownerId === user.id || (project as any).createdBy?.id === user.id)) ||
    user?.role === 'admin' ||
    !project.userRole;

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        backLink={{ label: 'All Projects', href: '/' }}
        breadcrumbs={[
          { label: 'Projects', href: '/' },
          { label: project.name },
          { label: 'Roadmap & Modules' },
        ]}
        icon={<Compass className="h-6 w-6 text-[#003049]" />}
        title="Product Roadmap & Capabilities"
        description="Review, prioritize, and accept candidate features into modules. Select features to autonomously generate developer-ready backlog tickets."
        actions={
          <ProjectNav
            projectId={projectId}
            memberCount={project.memberCount}
            ticketCount={project.ticketCount}
          />
        }
      />

      {/* Main Roadmap Area */}
      <RoadmapView
        projectId={projectId}
        features={features}
        onFeaturesChange={loadData}
        canEdit={canEdit}
      />
    </div>
  );
}
