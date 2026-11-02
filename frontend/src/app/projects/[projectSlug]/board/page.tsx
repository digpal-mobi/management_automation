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
  const { project, internalId } = await getCanonicalProjectOrRedirect(
    params.projectSlug,
    'board'
  );

  const [members, boardData] = await Promise.all([
    fetchServerMembers(internalId),
    fetchServerBoard(internalId),
  ]);

  return (
    <Board
      projectId={internalId}
      project={project}
      initialColumns={boardData.columns}
      initialTickets={boardData.tickets}
      members={members}
    />
  );
}
