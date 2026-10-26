import React from 'react';
import { Metadata } from 'next';
import { Compass } from 'lucide-react';
import {
  getCanonicalProjectOrRedirect,
  fetchServerMembers,
  fetchServerFeatures,
} from '@/lib/serverProject';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProjectNav } from '@/components/layout/ProjectNav';
import { RoadmapContainer } from '@/components/roadmap/RoadmapContainer';

interface ProjectRoadmapPageProps {
  params: {
    projectSlug: string;
  };
}

export async function generateMetadata({
  params,
}: ProjectRoadmapPageProps): Promise<Metadata> {
  return {
    title: 'Product Roadmap | TaskPulse AI',
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

export default async function ProjectRoadmapPage({ params }: ProjectRoadmapPageProps) {
  // 1. Resolve slug, handle legacy UUID / old renamed slug redirects
  const { project, internalId } = await getCanonicalProjectOrRedirect(
    params.projectSlug,
    'roadmap'
  );

  // 2. Concurrently fetch features & members on the server
  const [members, features] = await Promise.all([
    fetchServerMembers(internalId),
    fetchServerFeatures(internalId),
  ]);

  const slug = project.slug || project.id;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Server-Rendered Page Header */}
      <PageHeader
        backLink={{ label: 'All Projects', href: '/' }}
        breadcrumbs={[
          { label: 'Projects', href: '/' },
          { label: project.name, href: `/projects/${slug}` },
          { label: 'Roadmap & Modules' },
        ]}
        icon={<Compass className="h-6 w-6 text-[#003049]" />}
        title="Product Roadmap & Capabilities"
        description="Review, prioritize, and accept candidate features into modules. Select features to autonomously generate developer-ready backlog tickets."
        actions={
          <ProjectNav
            projectId={internalId}
            projectSlug={slug}
            memberCount={members.length}
            ticketCount={project.ticketCount}
          />
        }
      />

      {/* Client-Side Interactive Roadmap hydrated with SSR features */}
      <RoadmapContainer
        projectId={internalId}
        projectSlug={slug}
        project={project}
        initialFeatures={features}
      />
    </div>
  );
}
