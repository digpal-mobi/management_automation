import React from 'react';
import { Metadata } from 'next';
import {
  getCanonicalProjectOrRedirect,
  fetchServerMembers,
  fetchServerPlan,
} from '@/lib/serverProject';
import { SprintPlanningClient } from '@/components/plan/SprintPlanningClient';

interface ProjectPlanPageProps {
  params: {
    projectSlug: string;
  };
}

export async function generateMetadata({
  params,
}: ProjectPlanPageProps): Promise<Metadata> {
  return {
    title: 'Sprint Planning | TaskPulse AI',
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

export default async function ProjectPlanPage({ params }: ProjectPlanPageProps) {
  // 1. Resolve slug, handle legacy UUID / old renamed slug redirects
  const { project, internalId } = await getCanonicalProjectOrRedirect(
    params.projectSlug,
    'plan'
  );

  // 2. Fetch members and latest sprint plan & history concurrently on the server
  const [members, planData] = await Promise.all([
    fetchServerMembers(internalId),
    fetchServerPlan(internalId),
  ]);

  const slug = project.slug || project.id;

  return (
    <div className="animate-in fade-in duration-200">
      <SprintPlanningClient
        projectId={internalId}
        projectSlug={slug}
        project={project}
        initialMembers={members}
        initialPlan={planData.latestPlan}
        initialHistory={planData.planHistory}
      />
    </div>
  );
}
