import React from 'react';
import { Metadata } from 'next';
import {
  getCanonicalProjectOrRedirect,
  fetchServerFeatures,
} from '@/lib/serverProject';
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

  // 2. Concurrently fetch features on the server (memoized via React cache())
  const features = await fetchServerFeatures(internalId);

  const slug = project.slug || project.id;

  return (
    <div className="animate-in fade-in duration-200">
      <RoadmapContainer
        projectId={internalId}
        projectSlug={slug}
        project={project}
        initialFeatures={features}
      />
    </div>
  );
}
