import React from 'react';
import { Metadata } from 'next';
import { Kanban } from 'lucide-react';
import {
  getCanonicalProjectOrRedirect,
  fetchServerMembers,
  fetchServerBoard,
} from '@/lib/serverProject';
import { Board } from '@/components/kanban/Board';
import { ProjectNav } from '@/components/layout/ProjectNav';
import { PageHeader } from '@/components/ui/PageHeader';

interface ProjectBoardPageProps {
  params: {
    projectSlug: string;
  };
}

export async function generateMetadata({
  params,
}: ProjectBoardPageProps): Promise<Metadata> {
  return {
    title: 'Kanban Board | TaskPulse AI',
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

export default async function ProjectBoardPage({ params }: ProjectBoardPageProps) {
  // 1. Resolve slug, redirect legacy UUID / old renamed slug to canonical URL
  const { project, internalId } = await getCanonicalProjectOrRedirect(
    params.projectSlug,
    'board'
  );

  // 2. Fetch board data and members concurrently on the server
  const [members, boardData] = await Promise.all([
    fetchServerMembers(internalId),
    fetchServerBoard(internalId),
  ]);

  const slug = project.slug || project.id;
  const ticketCount = boardData.tickets.length || project.ticketCount;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Standard Server-Rendered Page Header */}
      <PageHeader
        backLink={{ label: 'All Projects', href: '/' }}
        breadcrumbs={[
          { label: 'Projects', href: '/' },
          { label: project.name, href: `/projects/${slug}` },
          { label: 'Kanban Board' },
        ]}
        icon={<Kanban className="h-6 w-6 text-[#003049]" />}
        title={project.name}
        description={project.description || 'Sprint & engineering backlog Kanban workflow.'}
        actions={
          <ProjectNav
            projectId={internalId}
            projectSlug={slug}
            memberCount={members.length}
            ticketCount={ticketCount}
          />
        }
      />

      {/* Interactive Client Kanban Component hydrated with initial server data */}
      <Board
        projectId={internalId}
        project={project}
        initialColumns={boardData.columns}
        initialTickets={boardData.tickets}
        members={members}
      />
    </div>
  );
}
