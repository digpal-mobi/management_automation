import React from 'react';
import { Metadata } from 'next';
import { BookOpen } from 'lucide-react';
import {
  getCanonicalProjectOrRedirect,
  fetchServerMembers,
  fetchServerDocuments,
  fetchServerAnalysis,
} from '@/lib/serverProject';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProjectNav } from '@/components/layout/ProjectNav';
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

  // 2. Concurrently fetch members, documents, and analysis on the server
  const [members, documents, analysis] = await Promise.all([
    fetchServerMembers(internalId),
    fetchServerDocuments(internalId),
    fetchServerAnalysis(internalId),
  ]);

  const slug = project.slug || project.id;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Standardized Server-Rendered Page Header */}
      <PageHeader
        backLink={{ label: 'All Projects', href: '/' }}
        breadcrumbs={[
          { label: 'Projects', href: '/' },
          { label: project.name, href: `/projects/${slug}` },
          { label: 'Knowledge & Docs' },
        ]}
        icon={<BookOpen className="h-6 w-6 text-[#003049]" />}
        title="Knowledge Base & Documentation"
        description="Central repository for technical PRDs, architecture specifications, metadata, and autonomous requirements extraction."
        actions={
          <ProjectNav
            projectId={internalId}
            projectSlug={slug}
            memberCount={members.length}
            ticketCount={project.ticketCount}
          />
        }
      />

      {/* Client-Side Interactive Knowledge Container hydrated with initial SSR data */}
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
