import React from 'react';
import { Metadata } from 'next';
import {
  getCanonicalProjectOrRedirect,
  fetchServerMembers,
} from '@/lib/serverProject';
import { MembersClient } from '@/components/members/MembersClient';

interface ProjectMembersPageProps {
  params: {
    projectSlug: string;
  };
}

export async function generateMetadata({
  params,
}: ProjectMembersPageProps): Promise<Metadata> {
  return {
    title: 'Team Management | TaskPulse AI',
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

export default async function ProjectMembersPage({ params }: ProjectMembersPageProps) {
  // 1. Resolve slug, handle legacy UUID / old renamed slug redirects
  const { project, internalId } = await getCanonicalProjectOrRedirect(
    params.projectSlug,
    'members'
  );

  // 2. Concurrently fetch members on the server
  const members = await fetchServerMembers(internalId);

  const slug = project.slug || project.id;

  return (
    <div className="animate-in fade-in duration-200">
      <MembersClient
        projectId={internalId}
        projectSlug={slug}
        project={project}
        initialMembers={members}
      />
    </div>
  );
}
