import React from 'react';
import { Metadata } from 'next';
import {
  getCanonicalProjectOrRedirect,
  fetchServerAnalytics,
} from '@/lib/serverProject';
import { AnalyticsView } from '@/components/analytics/AnalyticsView';

interface ProjectAnalyticsPageProps {
  params: {
    projectSlug: string;
  };
}

export async function generateMetadata({
  params,
}: ProjectAnalyticsPageProps): Promise<Metadata> {
  return {
    title: 'Project Analytics | TaskPulse AI',
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

export default async function ProjectAnalyticsPage({ params }: ProjectAnalyticsPageProps) {
  // 1. Resolve slug, handle legacy UUID / old renamed slug redirects
  const { project, internalId } = await getCanonicalProjectOrRedirect(
    params.projectSlug,
    'analytics'
  );

  // 2. Fetch analytics on the server (memoized via React cache())
  const analytics = await fetchServerAnalytics(internalId);

  const fallbackAnalytics = analytics || {
    totalTickets: 0,
    completedTickets: 0,
    inProgressTickets: 0,
    todoTickets: 0,
    completionRate: 0,
    priorityBreakdown: { Low: 0, Medium: 0, High: 0, Critical: 0 },
    typeBreakdown: { Feature: 0, Bug: 0, Task: 0, Improvement: 0 },
  };

  return (
    <div className="animate-in fade-in duration-200">
      <AnalyticsView project={project} analytics={fallbackAnalytics} />
    </div>
  );
}
