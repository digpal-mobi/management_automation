import React from 'react';
import {
  getCanonicalProjectOrRedirect,
  fetchServerMembers,
} from '@/lib/serverProject';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProjectNav } from '@/components/layout/ProjectNav';
import { FolderKanban } from 'lucide-react';

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: {
    projectSlug: string;
  };
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  // 1. Resolve canonical project & internal UUID
  const { project, internalId } = await getCanonicalProjectOrRedirect(params.projectSlug, '');

  // 2. Fetch shared project members for count badge (memoized via React cache())
  const members = await fetchServerMembers(internalId);

  const slug = project.slug || project.id;

  return (
    <div className="space-y-6">
      {/* Unified Persistent Project Workspace Header */}
      <PageHeader
        backLink={{ label: 'All Projects', href: '/' }}
        breadcrumbs={[
          { label: 'Projects', href: '/' },
          { label: project.name, href: `/projects/${slug}` },
        ]}
        icon={<FolderKanban className="h-6 w-6 text-[#003049]" />}
        title={project.name}
        description={project.description || 'Sprint & engineering delivery workspace.'}
        actions={
          <ProjectNav
            projectId={internalId}
            projectSlug={slug}
            memberCount={members.length}
            ticketCount={project.ticketCount}
          />
        }
      />

      <main>{children}</main>
    </div>
  );
}
