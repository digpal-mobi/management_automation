'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Project, ProjectDocument, ProjectAnalysis } from '@/types';
import { ProjectInfoEditor } from '@/components/knowledge/ProjectInfoEditor';
import { DocumentLibrary } from '@/components/knowledge/DocumentLibrary';
import { AnalysisOverview } from '@/components/knowledge/AnalysisOverview';
import { ProjectNav } from '@/components/layout/ProjectNav';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { BookOpen, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function ProjectKnowledgePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { user, fetchWithAuth, isLoading: authLoading } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
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

      // 2. Fetch Documents
      const dRes = await fetchWithAuth(`/api/projects/${projectId}/documents`);
      const dData = await dRes.json();
      if (dRes.ok && dData.success) {
        setDocuments(dData.documents || []);
      }

      // 3. Fetch Analysis
      const aRes = await fetchWithAuth(`/api/projects/${projectId}/analysis`);
      const aData = await aRes.json();
      if (aRes.ok && aData.success) {
        setAnalysis(aData.analysis || null);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load knowledge base data');
    } finally {
      setLoading(false);
    }
  }, [projectId, fetchWithAuth]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/login?redirect=/projects/${projectId}/knowledge`);
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
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-6 w-6 text-[#C1121F]" />}
        title="Unable to load project knowledge"
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
    <div className="space-y-8">
      {/* Standardized Page Header */}
      <PageHeader
        backLink={{ label: 'All Projects', href: '/' }}
        breadcrumbs={[
          { label: 'Projects', href: '/' },
          { label: project.name },
          { label: 'Knowledge & Docs' },
        ]}
        icon={<BookOpen className="h-6 w-6 text-[#003049]" />}
        title="Knowledge Base & Documentation"
        description="Central repository for technical PRDs, architecture specifications, metadata, and autonomous requirements extraction."
        actions={
          <ProjectNav
            projectId={projectId}
            memberCount={project.memberCount}
            ticketCount={project.ticketCount}
          />
        }
      />

      <div className="space-y-8">
        {/* 1. Project Info & Metadata Editor */}
        <ProjectInfoEditor
          project={project}
          onProjectUpdate={(updated) => setProject(updated)}
          canEdit={canEdit}
        />

        {/* 2. Documents Library (Upload & Ingestion) */}
        <DocumentLibrary
          projectId={projectId}
          documents={documents}
          onDocumentsChange={loadData}
          canEdit={canEdit}
        />

        {/* 3. AI Analysis & Requirements Breakdown */}
        <AnalysisOverview
          projectId={projectId}
          analysis={analysis}
          onAnalysisComplete={loadData}
          canEdit={canEdit}
          hasDocuments={documents.length > 0}
        />
      </div>
    </div>
  );
}
