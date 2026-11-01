import React from 'react';
import { Metadata } from 'next';
import {
  getCanonicalProjectOrRedirect,
  fetchServerMembers,
  fetchServerBoard,
} from '@/lib/serverProject';
import { Board } from '@/components/kanban/Board';

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

  // 2. Fetch board data and members concurrently on the server (memoized via React cache())
  const [members, boardData] = await Promise.all([
    fetchServerMembers(internalId),
    fetchServerBoard(internalId),
  ]);

  return (
    <div className="animate-in fade-in duration-200">
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
