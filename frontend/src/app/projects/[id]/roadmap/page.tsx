'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Project, ProjectFeature } from '@/types';
import { RoadmapView } from '@/components/roadmap/RoadmapView';
import {
  Map,
  BookOpen,
  Kanban,
  Users,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
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
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-6 w-6 text-white animate-spin" />
        <p className="text-xs text-neutral-400">Loading project roadmap...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3 text-center">
        <AlertCircle className="h-7 w-7 text-neutral-400" />
        <h3 className="text-sm font-semibold text-white">Unable to load roadmap</h3>
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
            <Map className="h-6 w-6 text-white" />
            <span>Product Roadmap & Capabilities</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
            Review, prioritize, and accept candidate features into modules. Select features to generate developer-ready implementation tickets incrementally.
          </p>
        </div>

        {/* Tab Links */}
        <div className="flex items-center gap-2">
          <Link
            href={`/projects/${projectId}/knowledge`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141414] border border-[#2A2A2A] hover:border-[#404040] text-neutral-300 hover:text-white text-xs font-medium transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5 text-neutral-400" />
            <span>Knowledge</span>
          </Link>
          <Link
            href={`/projects/${projectId}/roadmap`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-black text-xs font-semibold"
          >
            <Map className="h-3.5 w-3.5" />
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

      {/* Main Roadmap Component */}
      <RoadmapView
        projectId={projectId}
        features={features}
        onFeaturesChange={loadData}
        canEdit={canEdit}
      />
    </div>
  );
}
