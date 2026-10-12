'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Project, ProjectDocument, ProjectAnalysis } from '@/types';
import { ProjectInfoEditor } from '@/components/knowledge/ProjectInfoEditor';
import { DocumentLibrary } from '@/components/knowledge/DocumentLibrary';
import { AnalysisOverview } from '@/components/knowledge/AnalysisOverview';
import {
  BookOpen,
  Map,
  Kanban,
  Users,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react';
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
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-6 w-6 text-white animate-spin" />
        <p className="text-xs text-neutral-400">Loading project knowledge base...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3 text-center">
        <AlertCircle className="h-7 w-7 text-neutral-400" />
        <h3 className="text-sm font-semibold text-white">Unable to load project knowledge</h3>
        <p className="text-xs text-neutral-400 max-w-sm">{error}</p>
        <Link
          href="/"
          className="px-4 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-neutral-200 hover:text-white"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const canEdit = project.userRole === 'owner' || project.userRole === 'manager';

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2A2A2A]">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1.5">
            <Link href="/" className="hover:text-white flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              <span>Projects</span>
            </Link>
            <span>/</span>
            <span className="text-neutral-200 font-medium truncate max-w-xs">{project.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <BookOpen className="h-6 w-6 text-white" />
            <span>Project Knowledge Base</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
            Central repository for project specifications, PRDs, architecture documents, and AI-extracted requirements.
          </p>
        </div>

        {/* Tab Links */}
        <div className="flex items-center gap-2">
          <Link
            href={`/projects/${projectId}/knowledge`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-black text-xs font-semibold"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Knowledge</span>
          </Link>
          <Link
            href={`/projects/${projectId}/roadmap`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141414] border border-[#2A2A2A] hover:border-[#404040] text-neutral-300 hover:text-white text-xs font-medium transition-colors"
          >
            <Map className="h-3.5 w-3.5 text-neutral-400" />
            <span>Roadmap</span>
          </Link>
          <Link
            href={`/projects/${projectId}/board`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141414] border border-[#2A2A2A] hover:border-[#404040] text-neutral-300 hover:text-white text-xs font-medium transition-colors"
          >
            <Kanban className="h-3.5 w-3.5 text-neutral-400" />
            <span>Board</span>
          </Link>
          <Link
            href={`/projects/${projectId}/members`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141414] border border-[#2A2A2A] hover:border-[#404040] text-neutral-300 hover:text-white text-xs font-medium transition-colors"
          >
            <Users className="h-3.5 w-3.5 text-neutral-400" />
            <span>Team</span>
          </Link>
        </div>
      </div>

      {/* 1. Project Information & Metadata Editor */}
      <ProjectInfoEditor
        project={project}
        onProjectUpdate={(updated) => setProject(updated)}
        canEdit={canEdit}
      />

      {/* 2. Document Library (PDF, DOCX, MD, TXT, XLSX, CSV) */}
      <DocumentLibrary
        projectId={projectId}
        documents={documents}
        onDocumentsChange={loadData}
        canEdit={canEdit}
      />

      {/* 3. AI Project Understanding & Requirements Extraction */}
      <AnalysisOverview
        projectId={projectId}
        analysis={analysis}
        onAnalysisComplete={loadData}
        canEdit={canEdit}
        hasDocuments={documents.length > 0}
      />
    </div>
  );
}
