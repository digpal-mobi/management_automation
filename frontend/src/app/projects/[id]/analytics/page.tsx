'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Project, ProjectAnalytics } from '@/types';
import { AnalyticsView } from '@/components/analytics/AnalyticsView';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function ProjectAnalyticsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    setLoading(true);
    Promise.all([api.getProject(projectId), api.getAnalytics(projectId)])
      .then(([projRes, anaRes]) => {
        if (projRes.success && projRes.project) {
          setProject(projRes.project);
        }
        if (anaRes.success) {
          setAnalytics(anaRes);
        }
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || 'Failed to load project metrics');
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
        <p className="text-xs text-slate-400">Computing project velocity & metrics...</p>
      </div>
    );
  }

  if (error || !project || !analytics) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3 text-center">
        <AlertCircle className="h-8 w-8 text-rose-400" />
        <h3 className="text-sm font-semibold text-slate-200">Unable to load analytics</h3>
        <p className="text-xs text-slate-400 max-w-sm">{error}</p>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg bg-slate-800 text-xs text-slate-200 hover:bg-slate-700"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return <AnalyticsView project={project} analytics={analytics} />;
}
