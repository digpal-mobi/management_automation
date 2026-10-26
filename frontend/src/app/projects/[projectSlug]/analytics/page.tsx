import React from 'react';
import { Metadata } from 'next';
import { BarChart3 } from 'lucide-react';
import {
  getCanonicalProjectOrRedirect,
  fetchServerMembers,
  fetchServerAnalytics,
} from '@/lib/serverProject';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProjectNav } from '@/components/layout/ProjectNav';
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

  // 2. Fetch members and analytics concurrently on the server
  const [members, analytics] = await Promise.all([
    fetchServerMembers(internalId),
    fetchServerAnalytics(internalId),
  ]);

  const slug = project.slug || project.id;
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
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Standardized Server-Rendered Page Header */}
      <PageHeader
        backLink={{ label: 'All Projects', href: '/' }}
        breadcrumbs={[
          { label: 'Projects', href: '/' },
          { label: project.name, href: `/projects/${slug}` },
          { label: 'Velocity & Metrics' },
        ]}
        icon={<BarChart3 className="h-6 w-6 text-[#003049]" />}
        title="Project Velocity & Metrics"
        description={project.description || 'Sprint progress, distribution by priority and type, and completion metrics.'}
        actions={
          <ProjectNav
            projectId={internalId}
            projectSlug={slug}
            memberCount={members.length}
            ticketCount={fallbackAnalytics.totalTickets}
          />
        }
      />

      {/* Server-Rendered Analytics View */}
      <AnalyticsView project={project} analytics={fallbackAnalytics} />
    </div>
  );
}
