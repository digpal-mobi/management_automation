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
import { ProjectNav } from '@/components/layout/ProjectNav';
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
        icon={<FolderKanban className="h-6 w-6 text-[#003049]" />}
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

      {/* Project Tab Navigation */}
      <ProjectNav
        projectId={internalId}
        projectSlug={slug}
        memberCount={members.length}
        ticketCount={totalTickets}
      />

      {/* Project Metadata & Key Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs font-semibold text-[#526174] uppercase tracking-wider mb-2">
            <span>Overall Progress</span>
            <TrendingUp className="h-4 w-4 text-[#669BBC]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#003049]">{completionRate}%</span>
            <span className="text-xs text-[#526174]">({doneTickets}/{totalTickets} tickets)</span>
          </div>
          <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden mt-2">
            <div
              className="bg-[#003049] h-full rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs font-semibold text-[#526174] uppercase tracking-wider mb-2">
            <span>In Flight</span>
            <Clock className="h-4 w-4 text-[#669BBC]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#003049]">{inProgressTickets}</span>
            <span className="text-xs text-[#526174]">active tickets</span>
          </div>
          <p className="text-xs text-[#526174] mt-2">{todoTickets} backlog items queued</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs font-semibold text-[#526174] uppercase tracking-wider mb-2">
            <span>Roadmap Features</span>
            <Compass className="h-4 w-4 text-[#669BBC]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#003049]">{features.length}</span>
            <span className="text-xs text-[#526174]">extracted features</span>
          </div>
          <p className="text-xs text-[#526174] mt-2">
            {features.filter((f) => f.status === 'ACCEPTED').length} accepted for build
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs font-semibold text-[#526174] uppercase tracking-wider mb-2">
            <span>Engineering Team</span>
            <Users className="h-4 w-4 text-[#669BBC]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#003049]">{members.length}</span>
            <span className="text-xs text-[#526174]">collaborators</span>
          </div>
          <p className="text-xs text-[#526174] mt-2">Active workspace members</p>
        </div>
      </div>

      {/* Main Grid: Project Summary + Sprint / Backlog Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details & High Priority Work */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Details Card */}
          <Card className="border border-[#E2E8F0] shadow-sm">
            <CardHeader className="border-b border-[#E2E8F0] pb-4">
              <CardTitle className="text-base font-bold text-[#003049] flex items-center justify-between">
                <span>Project Specifications</span>
                <span className="text-xs font-mono font-normal text-[#526174] bg-[#F7F8FA] px-2.5 py-1 rounded-md border border-[#E2E8F0]">
                  slug: {slug}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {project.description && (
                <div>
                  <h4 className="text-xs font-semibold text-[#526174] uppercase tracking-wider mb-1">
                    Description & Objectives
                  </h4>
                  <p className="text-sm text-[#17212B] leading-relaxed">{project.description}</p>
                </div>
              )}

              {project.techStack && (
                <div>
                  <h4 className="text-xs font-semibold text-[#526174] uppercase tracking-wider mb-2">
                    Technology Stack
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {project.techStack.split(',').map((tech, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F1F4F7] text-[#003049] border border-[#E2E8F0]"
                      >
                        {tech.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {project.goals && (
                <div>
                  <h4 className="text-xs font-semibold text-[#526174] uppercase tracking-wider mb-1">
                    Primary Goals
                  </h4>
                  <p className="text-sm text-[#526174] leading-relaxed whitespace-pre-line">
                    {project.goals}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* High Priority Backlog */}
          <Card className="border border-[#E2E8F0] shadow-sm">
            <CardHeader className="border-b border-[#E2E8F0] pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-[#003049] flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[#C1121F]" />
                Priority Backlog Items
              </CardTitle>
              <Link
                href={`/projects/${slug}/board`}
                className="text-xs text-[#669BBC] hover:text-[#003049] font-medium flex items-center gap-1"
              >
                View all in Kanban <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="pt-4">
              {urgentTickets.length === 0 ? (
                <p className="text-sm text-[#526174] py-4 text-center">
                  No urgent or critical tickets pending. Everything is on track!
                </p>
              ) : (
                <div className="divide-y divide-[#E2E8F0]">
                  {urgentTickets.map((t) => (
                    <div key={t.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-medium text-[#526174]">
                            #{t.id.slice(0, 8)}
                          </span>
                          <Badge
                            variant="priority"
                            priority={t.priority}
                            className="text-[10px] px-1.5 py-0 uppercase"
                          >
                            {t.priority}
                          </Badge>
                          <span className="text-xs text-[#526174]">• {t.status}</span>
                        </div>
                        <h4 className="text-sm font-semibold text-[#17212B] truncate">{t.title}</h4>
                      </div>
                      <Link href={`/projects/${slug}/board`}>
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-[#669BBC]">
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
          <Card className="border border-[#E2E8F0] shadow-sm">
            <CardHeader className="border-b border-[#E2E8F0] pb-4">
              <CardTitle className="text-base font-bold text-[#003049] flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-[#003049]" />
                Sprint Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {activeSprint ? (
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-[#526174] uppercase">Current Sprint</span>
                    <h4 className="text-base font-bold text-[#003049] mt-0.5">{activeSprint.name}</h4>
                  </div>
                  <div className="bg-[#F7F8FA] p-3 rounded-lg border border-[#E2E8F0] space-y-1.5 text-xs text-[#526174]">
                    <div className="flex justify-between">
                      <span>Goal:</span>
                      <span className="font-semibold text-[#003049] truncate max-w-[150px]">{activeSprint.goal || 'Sprint Goal'}</span>
                    </div>
                    {activeSprint.capacityPoints !== undefined && (
                      <div className="flex justify-between">
                        <span>Capacity:</span>
                        <span className="font-semibold text-[#003049]">{activeSprint.capacityPoints} pts</span>
                      </div>
                    )}
                    {activeSprint.tickets && (
                      <div className="flex justify-between">
                        <span>Allocated Tickets:</span>
                        <span className="font-semibold text-[#003049]">{activeSprint.tickets.length}</span>
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
                  <p className="text-sm text-[#526174]">No active sprint configured.</p>
                  <Link href={`/projects/${slug}/plan`}>
                    <Button size="sm" variant="outline" className="w-full gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-[#669BBC]" />
                      Generate AI Sprint Plan
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Access Navigation Card */}
          <Card className="border border-[#E2E8F0] shadow-sm">
            <CardHeader className="border-b border-[#E2E8F0] pb-3">
              <CardTitle className="text-sm font-bold text-[#003049] uppercase tracking-wider">
                Workspace Sections
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 divide-y divide-[#E2E8F0]">
              <Link
                href={`/projects/${slug}/knowledge`}
                className="py-2.5 flex items-center justify-between text-sm text-[#17212B] hover:text-[#003049] group"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="h-4 w-4 text-[#669BBC]" />
                  <span className="font-medium">Knowledge & Documents</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-[#526174] group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href={`/projects/${slug}/roadmap`}
                className="py-2.5 flex items-center justify-between text-sm text-[#17212B] hover:text-[#003049] group"
              >
                <div className="flex items-center gap-2.5">
                  <Compass className="h-4 w-4 text-[#669BBC]" />
                  <span className="font-medium">Features Roadmap</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-[#526174] group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href={`/projects/${slug}/board`}
                className="py-2.5 flex items-center justify-between text-sm text-[#17212B] hover:text-[#003049] group"
              >
                <div className="flex items-center gap-2.5">
                  <Kanban className="h-4 w-4 text-[#669BBC]" />
                  <span className="font-medium">Kanban Workflow</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-[#526174] group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href={`/projects/${slug}/analytics`}
                className="py-2.5 flex items-center justify-between text-sm text-[#17212B] hover:text-[#003049] group"
              >
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="h-4 w-4 text-[#669BBC]" />
                  <span className="font-medium">Metrics & Analytics</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-[#526174] group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href={`/projects/${slug}/members`}
                className="py-2.5 flex items-center justify-between text-sm text-[#17212B] hover:text-[#003049] group"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="h-4 w-4 text-[#669BBC]" />
                  <span className="font-medium">Team Management</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-[#526174] group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
