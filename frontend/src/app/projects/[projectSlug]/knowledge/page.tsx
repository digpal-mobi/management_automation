import React from 'react';
import { Metadata } from 'next';
import {
  getCanonicalProjectOrRedirect,
  fetchServerDocuments,
  fetchServerAnalysis,
} from '@/lib/serverProject';
import { KnowledgeContainer } from '@/components/knowledge/KnowledgeContainer';

interface ProjectKnowledgePageProps {
  params: {
    projectSlug: string;
  };
}

export async function generateMetadata({
  params,
}: ProjectKnowledgePageProps): Promise<Metadata> {
  return {
    title: 'Knowledge Base | TaskPulse AI',
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

export default async function ProjectKnowledgePage({ params }: ProjectKnowledgePageProps) {
  // 1. Resolve slug, handle legacy UUID / old renamed slug redirects
  const { project, internalId } = await getCanonicalProjectOrRedirect(
    params.projectSlug,
    'knowledge'
  );

  // 2. Concurrently fetch documents and analysis on the server (memoized via React cache())
  const [documents, analysis] = await Promise.all([
    fetchServerDocuments(internalId),
    fetchServerAnalysis(internalId),
  ]);

  const slug = project.slug || project.id;

  return (
    <div className="animate-in fade-in duration-200">
      <KnowledgeContainer
        projectId={internalId}
        projectSlug={slug}
        project={project}
        initialDocuments={documents}
        initialAnalysis={analysis}
      />
    </div>
  );
}
