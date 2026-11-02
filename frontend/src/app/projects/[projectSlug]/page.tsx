import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  getCanonicalProjectOrRedirect,
  fetchServerMembers,
  fetchServerBoard,
  fetchServerFeatures,
  fetchServerPlan,
  fetchServerAnalytics,
} from '@/lib/serverProject';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  FolderKanban,
  Kanban,
  Compass,
  CalendarClock,
  BookOpen,
  BarChart3,
  Users,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  Sparkles,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

interface ProjectOverviewPageProps {
  params: {
    projectSlug: string;
  };
}

export async function generateMetadata({
  params,
}: ProjectOverviewPageProps): Promise<Metadata> {
  return {
    title: 'Project Overview | TaskPulse AI',
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

export default async function ProjectOverviewPage({ params }: ProjectOverviewPageProps) {
  // 1. Resolve slug, handle UUID/legacy redirects, and get authenticated project record
  const { project, internalId } = await getCanonicalProjectOrRedirect(params.projectSlug, '');

  // 2. Fetch project subresources on the server concurrently
  const [members, boardData, features, planData, analytics] = await Promise.all([
    fetchServerMembers(internalId),
    fetchServerBoard(internalId),
    fetchServerFeatures(internalId),
    fetchServerPlan(internalId),
    fetchServerAnalytics(internalId),
  ]);

  const slug = project.slug || project.id;
  const totalTickets = boardData.tickets.length;
  const doneTickets = boardData.tickets.filter((t) => t.status === 'Done').length;
  const inProgressTickets = boardData.tickets.filter((t) => t.status === 'In Progress').length;
  const todoTickets = boardData.tickets.filter((t) => t.status === 'To Do').length;
  const completionRate =
    totalTickets > 0 ? Math.round((doneTickets / totalTickets) * 100) : 0;

  const urgentTickets = boardData.tickets
    .filter((t) => t.priority === 'Critical' || t.priority === 'High')
    .slice(0, 5);

  const activeSprint = planData.latestPlan?.sprintAllocations?.[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Server-Rendered Page Header */}
      <PageHeader
        backLink={{ label: 'All Projects', href: '/' }}
        breadcrumbs={[
          { label: 'Projects', href: '/' },
          { label: project.name },
          { label: 'Overview' },
        ]}
        icon={<FolderKanban className="h-6 w-6 text-accent" />}
        title={project.name}
        description={project.description || 'Intelligent AI-assisted engineering workspace.'}
        actions={
          <div className="flex items-center gap-3">
            <Link href={`/projects/${slug}/board`}>
              <Button size="sm" className="gap-2">
                <Kanban className="h-4 w-4" />
                Open Kanban
              </Button>
            </Link>
          </div>
        }
      />

      {/* Project Metadata & Key Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-elevated border border-border rounded-xl p-4 shadow-card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs font-semibold text-ts uppercase tracking-wider mb-2">
            <span>Overall Progress</span>
            <TrendingUp className="h-4 w-4 text-accent" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-accent">{completionRate}%</span>
            <span className="text-xs text-ts">({doneTickets}/{totalTickets} tickets)</span>
          </div>
          <div className="w-full bg-hover h-2 rounded-full overflow-hidden mt-2">
            <div
              className="bg-accent h-full rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        <div className="bg-elevated border border-border rounded-xl p-4 shadow-card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs font-semibold text-ts uppercase tracking-wider mb-2">
            <span>In Flight</span>
            <Clock className="h-4 w-4 text-accent" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-accent">{inProgressTickets}</span>
            <span className="text-xs text-ts">active tickets</span>
          </div>
          <p className="text-xs text-ts mt-2">{todoTickets} backlog items queued</p>
        </div>

        <div className="bg-elevated border border-border rounded-xl p-4 shadow-card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs font-semibold text-ts uppercase tracking-wider mb-2">
            <span>Roadmap Features</span>
            <Compass className="h-4 w-4 text-accent" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-accent">{features.length}</span>
            <span className="text-xs text-ts">extracted features</span>
          </div>
          <p className="text-xs text-ts mt-2">
            {features.filter((f) => f.status === 'ACCEPTED').length} accepted for build
          </p>
        </div>

        <div className="bg-elevated border border-border rounded-xl p-4 shadow-card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs font-semibold text-ts uppercase tracking-wider mb-2">
            <span>Engineering Team</span>
            <Users className="h-4 w-4 text-accent" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-accent">{members.length}</span>
            <span className="text-xs text-ts">collaborators</span>
          </div>
          <p className="text-xs text-ts mt-2">Active workspace members</p>
        </div>
      </div>

      {/* Main Grid: Project Summary + Sprint / Backlog Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details & High Priority Work */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Details Card */}
          <Card className="border border-border shadow-card">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-base font-bold text-accent flex items-center justify-between">
                <span>Project Specifications</span>
                <span className="text-xs font-mono font-normal text-ts bg-canvas px-2.5 py-1 rounded-md border border-border">
                  slug: {slug}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {project.description && (
                <div>
                  <h4 className="text-xs font-semibold text-ts uppercase tracking-wider mb-1">
                    Description & Objectives
                  </h4>
                  <p className="text-sm text-tp leading-relaxed">{project.description}</p>
                </div>
              )}

              {project.techStack && (
                <div>
                  <h4 className="text-xs font-semibold text-ts uppercase tracking-wider mb-2">
                    Technology Stack
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {project.techStack.split(',').map((tech, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-hover text-accent border border-border"
                      >
                        {tech.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {project.goals && (
                <div>
                  <h4 className="text-xs font-semibold text-ts uppercase tracking-wider mb-1">
                    Primary Goals
                  </h4>
                  <p className="text-sm text-ts leading-relaxed whitespace-pre-line">
                    {project.goals}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* High Priority Backlog */}
          <Card className="border border-border shadow-card">
            <CardHeader className="border-b border-border pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-accent flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-danger" />
                Priority Backlog Items
              </CardTitle>
              <Link
                href={`/projects/${slug}/board`}
                className="text-xs text-accent hover:text-accent font-medium flex items-center gap-1"
              >
                View all in Kanban <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="pt-4">
              {urgentTickets.length === 0 ? (
                <p className="text-sm text-ts py-4 text-center">
                  No urgent or critical tickets pending. Everything is on track!
                </p>
              ) : (
                <div className="divide-y divide-divider">
                  {urgentTickets.map((t) => (
                    <div key={t.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-medium text-ts">
                            #{t.id.slice(0, 8)}
                          </span>
                          <Badge
                            variant="priority"
                            priority={t.priority}
                            className="text-[10px] px-1.5 py-0 uppercase"
                          >
                            {t.priority}
                          </Badge>
                          <span className="text-xs text-ts">• {t.status}</span>
                        </div>
                        <h4 className="text-sm font-semibold text-tp truncate">{t.title}</h4>
                      </div>
                      <Link href={`/projects/${slug}/board`}>
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-accent">
                          View
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Sprint Status & Quick Workspace Navigation */}
        <div className="space-y-6">
          {/* Active Sprint Summary */}
          <Card className="border border-border shadow-card">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-base font-bold text-accent flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-accent" />
                Sprint Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {activeSprint ? (
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-ts uppercase">Current Sprint</span>
                    <h4 className="text-base font-bold text-accent mt-0.5">{activeSprint.name}</h4>
                  </div>
                  <div className="bg-canvas p-3 rounded-lg border border-border space-y-1.5 text-xs text-ts">
                    <div className="flex justify-between">
                      <span>Goal:</span>
                      <span className="font-semibold text-accent truncate max-w-[150px]">{activeSprint.goal || 'Sprint Goal'}</span>
                    </div>
                    {activeSprint.capacityPoints !== undefined && (
                      <div className="flex justify-between">
                        <span>Capacity:</span>
                        <span className="font-semibold text-accent">{activeSprint.capacityPoints} pts</span>
                      </div>
                    )}
                    {activeSprint.tickets && (
                      <div className="flex justify-between">
                        <span>Allocated Tickets:</span>
                        <span className="font-semibold text-accent">{activeSprint.tickets.length}</span>
                      </div>
                    )}
                  </div>
                  <Link href={`/projects/${slug}/plan`}>
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Open Sprint Planning
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-4 space-y-3">
                  <p className="text-sm text-ts">No active sprint configured.</p>
                  <Link href={`/projects/${slug}/plan`}>
                    <Button size="sm" variant="outline" className="w-full gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-accent" />
                      Generate AI Sprint Plan
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Access Navigation Card */}
          <Card className="border border-border shadow-card">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-sm font-bold text-accent uppercase tracking-wider">
                Workspace Sections
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 divide-y divide-divider">
              <Link
                href={`/projects/${slug}/knowledge`}
                className="py-2.5 flex items-center justify-between text-sm text-tp hover:text-accent group"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="h-4 w-4 text-accent" />
                  <span className="font-medium">Knowledge & Documents</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-ts group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href={`/projects/${slug}/roadmap`}
                className="py-2.5 flex items-center justify-between text-sm text-tp hover:text-accent group"
              >
                <div className="flex items-center gap-2.5">
                  <Compass className="h-4 w-4 text-accent" />
                  <span className="font-medium">Features Roadmap</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-ts group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href={`/projects/${slug}/board`}
                className="py-2.5 flex items-center justify-between text-sm text-tp hover:text-accent group"
              >
                <div className="flex items-center gap-2.5">
                  <Kanban className="h-4 w-4 text-accent" />
                  <span className="font-medium">Kanban Workflow</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-ts group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href={`/projects/${slug}/analytics`}
                className="py-2.5 flex items-center justify-between text-sm text-tp hover:text-accent group"
              >
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="h-4 w-4 text-accent" />
                  <span className="font-medium">Metrics & Analytics</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-ts group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href={`/projects/${slug}/members`}
                className="py-2.5 flex items-center justify-between text-sm text-tp hover:text-accent group"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="h-4 w-4 text-accent" />
                  <span className="font-medium">Team Management</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-ts group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
