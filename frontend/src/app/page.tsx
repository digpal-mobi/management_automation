'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Project, ProjectInvitation } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Sparkles,
  Kanban,
  PlusCircle,
  FolderKanban,
  ArrowRight,
  Users,
  Compass,
  FileText,
  BarChart3,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, fetchWithAuth, isLoading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<ProjectInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const loadProjects = async () => {
      try {
        setLoading(true);
        const [res, inviteRes] = await Promise.all([
          fetchWithAuth('/api/projects'),
          fetchWithAuth('/api/invitations/pending'),
        ]);
        const data = await res.json();
        if (res.ok && data.success) {
          setProjects(data.projects || []);
        }
        const inviteData = await inviteRes.json();
        if (inviteRes.ok && inviteData.success) {
          setPendingInvitations(inviteData.invitations || []);
        }
      } catch (err) {
        console.error('Failed to load projects:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [user, authLoading, fetchWithAuth, router]);

  if (authLoading || (loading && !projects.length)) {
    return (
      <div className="space-y-8 animate-in fade-in duration-200">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const totalTickets = projects.reduce((acc, p) => acc + (p.ticketCount || 0), 0);
  const totalMembers = projects.reduce((acc, p) => acc + (p.memberCount || 0), 0);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-elevated border border-border p-6 sm:p-8 md:p-10 shadow-card">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-subtle border border-accent/30 text-xs font-semibold text-accent">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>AI Project Management & Delivery Platform</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-tp tracking-tight leading-tight">
            Welcome back, {user?.username}
          </h1>
          <p className="text-xs sm:text-sm text-ts leading-relaxed">
            Ingest technical documentation, extract structured requirements and roadmap features,
            and autonomously generate developer-ready backlog tickets on your terms.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link href="/projects/new">
              <Button variant="primary" size="md" leftIcon={<PlusCircle className="h-4 w-4" />}>
                Create New Project
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Global Stat Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-elevated border border-border flex items-center justify-between shadow-card">
          <div>
            <div className="text-[11px] text-ts font-semibold uppercase tracking-wider">
              Your Workspaces
            </div>
            <div className="text-2xl font-bold text-tp mt-0.5">{projects.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-accent-subtle border border-accent/30 flex items-center justify-center text-accent">
            <FolderKanban className="h-5 w-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-elevated border border-border flex items-center justify-between shadow-card">
          <div>
            <div className="text-[11px] text-ts font-semibold uppercase tracking-wider">
              Total Tickets
            </div>
            <div className="text-2xl font-bold text-tp mt-0.5">{totalTickets}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-accent-subtle border border-accent/30 flex items-center justify-center text-accent">
            <Kanban className="h-5 w-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-elevated border border-border flex items-center justify-between shadow-card">
          <div>
            <div className="text-[11px] text-ts font-semibold uppercase tracking-wider">
              Collaborators
            </div>
            <div className="text-2xl font-bold text-tp mt-0.5">{totalMembers}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-accent-subtle border border-accent/30 flex items-center justify-center text-accent">
            <Users className="h-5 w-5" />
          </div>
        </div>
      </div>

      {pendingInvitations.length > 0 && (
        <section className="space-y-3" aria-label="Pending invitations">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-tp">Pending invitations</h2>
            <p className="text-xs text-ts">
              You will not see a project workspace until you accept its invitation.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="rounded-2xl border border-border bg-elevated p-4 shadow-card"
              >
                <p className="text-sm font-semibold text-tp">
                  {invitation.project?.name || 'Project invitation'}
                </p>
                <p className="mt-1 text-xs text-ts">
                  {invitation.inviter?.username || 'A teammate'} invited you as a {invitation.role}.
                </p>
                <Link href="/notifications" className="mt-3 inline-flex">
                  <Button variant="outline" size="sm">
                    Review invitation
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects List Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
          <div>
            <h2 className="text-lg font-bold text-tp tracking-tight">Your Workspaces</h2>
            <p className="text-xs text-ts">
              Workspaces you own or collaborate on with your engineering team
            </p>
          </div>
          <Link href="/projects/new">
            <Button variant="outline" size="sm" leftIcon={<PlusCircle className="h-3.5 w-3.5" />}>
              New Project
            </Button>
          </Link>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="h-6 w-6" />}
            title="No projects yet"
            description="Enter your project name, upload technical PRDs or specifications, and let AI analyze modules, constraints, and features."
            action={
              <Link href="/projects/new">
                <Button variant="primary" size="md" leftIcon={<PlusCircle className="h-4 w-4" />}>
                  Create Your First Project
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="group flex flex-col justify-between p-5 rounded-2xl bg-elevated hover:bg-elevated border border-border hover:border-border transition-all duration-200 shadow-card hover:shadow-card-hover"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/projects/${proj.slug || proj.id}`}
                      className="hover:underline"
                    >
                      <h3 className="text-base font-bold text-tp tracking-tight line-clamp-1">
                        {proj.name}
                      </h3>
                    </Link>
                    {proj.userRole && (
                      <Badge variant="role" role={proj.userRole} size="sm" />
                    )}
                  </div>

                  <p className="text-xs text-ts line-clamp-2 leading-relaxed min-h-[32px]">
                    {proj.description || 'No description provided.'}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-ts pt-1">
                    <span className="flex items-center gap-1.5">
                      <Kanban className="h-3.5 w-3.5 text-accent" />
                      {proj.ticketCount || 0} tickets
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-accent" />
                      {proj.memberCount || 1} members
                    </span>
                  </div>
                </div>

                {/* Direct Section Access & Board Link */}
                <div className="pt-4 mt-4 border-t border-border space-y-3">
                  <div className="grid grid-cols-4 gap-1 text-[11px] font-medium text-ts">
                    <Link
                      href={`/projects/${proj.slug || proj.id}/knowledge`}
                      className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-hover hover:bg-hover hover:text-accent transition-colors"
                      title="Knowledge Base"
                    >
                      <FileText className="h-3 w-3" />
                      <span className="hidden sm:inline">Docs</span>
                    </Link>
                    <Link
                      href={`/projects/${proj.slug || proj.id}/roadmap`}
                      className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-hover hover:bg-hover hover:text-accent transition-colors"
                      title="Roadmap"
                    >
                      <Compass className="h-3 w-3" />
                      <span className="hidden sm:inline">Roadmap</span>
                    </Link>
                    <Link
                      href={`/projects/${proj.slug || proj.id}/analytics`}
                      className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-hover hover:bg-hover hover:text-accent transition-colors"
                      title="Analytics"
                    >
                      <BarChart3 className="h-3 w-3" />
                      <span className="hidden sm:inline">Stats</span>
                    </Link>
                    <Link
                      href={`/projects/${proj.slug || proj.id}/members`}
                      className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-hover hover:bg-hover hover:text-accent transition-colors"
                      title="Team"
                    >
                      <Users className="h-3 w-3" />
                      <span className="hidden sm:inline">Team</span>
                    </Link>
                  </div>

                  <Link
                    href={`/projects/${proj.slug || proj.id}/board`}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-canvas text-xs font-semibold shadow-card transition-all"
                  >
                    <span>Open Kanban Board</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
