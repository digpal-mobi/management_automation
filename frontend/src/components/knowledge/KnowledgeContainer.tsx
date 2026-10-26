'use client';

import React, { useState, useCallback } from 'react';
import { Project, ProjectDocument, ProjectAnalysis } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { ProjectInfoEditor } from './ProjectInfoEditor';
import { DocumentLibrary } from './DocumentLibrary';
import { AnalysisOverview } from './AnalysisOverview';

interface KnowledgeContainerProps {
  projectId: string;
  projectSlug: string;
  project: Project;
  initialDocuments: ProjectDocument[];
  initialAnalysis: ProjectAnalysis | null;
}

export function KnowledgeContainer({
  projectId,
  projectSlug,
  project: initialProject,
  initialDocuments,
  initialAnalysis,
}: KnowledgeContainerProps) {
  const { user, fetchWithAuth } = useAuth();
  const [project, setProject] = useState<Project>(initialProject);
  const [documents, setDocuments] = useState<ProjectDocument[]>(initialDocuments);
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(initialAnalysis);

  const reloadData = useCallback(async () => {
    try {
      const [dRes, aRes] = await Promise.all([
        fetchWithAuth(`/api/projects/${projectId}/documents`),
        fetchWithAuth(`/api/projects/${projectId}/analysis`),
      ]);

      if (dRes.ok) {
        const dData = await dRes.json();
        if (dData.success && dData.documents) {
          setDocuments(dData.documents);
        }
      }

      if (aRes.ok) {
        const aData = await aRes.json();
        if (aData.success && aData.analysis) {
          setAnalysis(aData.analysis);
        }
      }
    } catch (err) {
      console.error('Failed to reload knowledge data:', err);
    }
  }, [projectId, fetchWithAuth]);

  const canEdit =
    project.userRole === 'owner' ||
    project.userRole === 'manager' ||
    Boolean(user && (project.ownerId === user.id || (project as any).createdBy?.id === user.id)) ||
    user?.role === 'admin' ||
    !project.userRole;

  return (
    <div className="space-y-8">
      {/* 1. Project Info & Metadata Editor */}
      <ProjectInfoEditor
        project={project}
        onProjectUpdate={(updated) => {
          setProject(updated);
          if (updated.slug && updated.slug !== projectSlug) {
            window.history.replaceState(null, '', `/projects/${updated.slug}/knowledge`);
          }
        }}
        canEdit={canEdit}
      />

      {/* 2. Documents Library (Upload & Ingestion) */}
      <DocumentLibrary
        projectId={projectId}
        documents={documents}
        onDocumentsChange={reloadData}
        canEdit={canEdit}
      />

      {/* 3. AI Analysis & Requirements Breakdown */}
      <AnalysisOverview
        projectId={projectId}
        analysis={analysis}
        onAnalysisComplete={reloadData}
        canEdit={canEdit}
        hasDocuments={documents.length > 0}
      />
    </div>
  );
}
