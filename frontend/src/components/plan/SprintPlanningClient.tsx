'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Project, ProjectMember, SprintPlan, PlanningSprintAllocation, UnscheduledTicketItem } from '@/types';
import { planApi, projectsApi } from '@/lib/api';
import { ProjectNav } from '@/components/layout/ProjectNav';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog';
import {
  CalendarClock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Lock,
  Unlock,
  ChevronDown,
  Layers,
  GitMerge,
  Info,
  Clock,
  Gauge,
  ShieldCheck,
  History,
  TrendingUp,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';

interface SprintPlanningClientProps {
  projectId: string;
  projectSlug: string;
  project: Project;
  initialMembers: ProjectMember[];
  initialPlan: SprintPlan | null;
  initialHistory: any[];
}

export function SprintPlanningClient({
  projectId,
  projectSlug,
  project: initialProject,
  initialMembers,
  initialPlan,
  initialHistory,
}: SprintPlanningClientProps) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { can } = usePermissions(projectId);

  const [project, setProject] = useState<Project | null>(initialProject);
  const [members, setMembers] = useState<ProjectMember[]>(initialMembers);
  const [plan, setPlan] = useState<SprintPlan | null>(initialPlan);
  const [planHistory, setPlanHistory] = useState<any[]>(initialHistory);
  const [loading, setLoading] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'unscheduled' | 'dependencies' | 'validation' | 'history'>('schedule');

  // Options modal state
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [capacityInput, setCapacityInput] = useState(28);
  const [strictCapacity, setStrictCapacity] = useState(false);
  const [allowCoSprint, setAllowCoSprint] = useState(true);

  // Move ticket modal state
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<{ id: string; title: string; currentSprint: string } | null>(null);
  const [targetSprintId, setTargetSprintId] = useState('');

  // Selected explanation modal
  const [explanationModalOpen, setExplanationModalOpen] = useState(false);
  const [selectedExplanation, setSelectedExplanation] = useState<{ title: string; text: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [pRes, planRes, histRes] = await Promise.all([
        projectsApi.getById(projectId),
        planApi.getLatestPlan(projectId).catch(() => ({ success: false, plan: null as any })),
        planApi.getPlanHistory(projectId).catch(() => ({ success: false, history: [] })),
      ]);

      if (pRes.success && pRes.project) {
        setProject(pRes.project);
        setMembers(pRes.project.members || []);
      }

      if (planRes.success && planRes.plan) {
        setPlan(planRes.plan);
      }

      if (histRes.success && histRes.history) {
        setPlanHistory(histRes.history);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to load sprint planning data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const isInitialMount = React.useRef(true);
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/login?redirect=/projects/${projectSlug}/plan`);
      return;
    }
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (initialPlan || initialProject) {
        return; // Hydrated from Server Component
      }
    }
    loadData();
  }, [projectId, projectSlug, user, authLoading, loadData, router, initialPlan, initialProject]);

  const handleGeneratePlan = async () => {
    try {
      setIsPlanning(true);
      toast.info('Running AI Sprint Planning Brain. Analyzing dependencies, capacities, and critical path...');
      const res = await planApi.generatePlan(projectId, {
        defaultSprintCapacity: capacityInput,
        strictCapacity,
        allowCoSprintDependencies: allowCoSprint,
      });

      if (res.success && res.plan) {
        setPlan(res.plan);
        toast.success(`Generated proposed Sprint Plan v${res.plan.version} successfully!`);
        setIsOptionsOpen(false);
        // Refresh history
        const hRes = await planApi.getPlanHistory(projectId).catch(() => null);
        if (hRes && hRes.success) setPlanHistory(hRes.history);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Sprint planning generation failed');
    } finally {
      setIsPlanning(false);
    }
  };

  const handleApprovePlan = async () => {
    if (!plan) return;
    try {
      setIsApproving(true);
      const res = await planApi.approvePlan(projectId, plan.id);
      if (res.success) {
        toast.success(`Plan v${res.version} APPROVED! Applied ${res.appliedTicketsCount} tickets to delivery Kanban board.`);
        setPlan({ ...plan, status: 'APPROVED', isApproved: true });
        // Refresh project data
        loadData();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Plan approval failed');
    } finally {
      setIsApproving(false);
    }
  };

  const handleToggleLock = async (ticketId: string, currentLocked: boolean, sprintId: string) => {
    if (!plan) return;
    try {
      const res = await planApi.updateAllocation(projectId, plan.id, {
        ticketId,
        targetSprintId: sprintId,
        isLocked: !currentLocked,
      });
      if (res.success && res.plan) {
        setPlan(res.plan);
        toast.success(!currentLocked ? 'Ticket locked to sprint.' : 'Ticket unlocked.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update ticket lock');
    }
  };

  const handleMoveTicket = async () => {
    if (!plan || !selectedTicket || !targetSprintId) return;
    try {
      const res = await planApi.updateAllocation(projectId, plan.id, {
        ticketId: selectedTicket.id,
        targetSprintId,
      });
      if (res.success && res.plan) {
        setPlan(res.plan);
        toast.success(`Moved ticket to ${targetSprintId}.`);
        setMoveModalOpen(false);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to move ticket');
    }
  };

  if (loading || authLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-[60vh] w-full rounded-2xl" />
      </div>
    );
  }

  if (!project) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-6 w-6 text-[#526174]" />}
        title="Project Not Found"
        description="The requested project workspace could not be located."
      />
    );
  }

  const sprintAllocations = plan?.sprintAllocations || [];
  const unscheduledTickets = plan?.unscheduledTickets || [];
  const validation = plan?.validationReport;
  const criticalPath = plan?.criticalPath;
  const isApproved = plan?.isApproved || plan?.status === 'APPROVED';

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        backLink={{ label: 'All Projects', href: '/' }}
        breadcrumbs={[
          { label: 'Projects', href: '/' },
          { label: project.name, href: `/projects/${projectSlug}` },
          { label: 'Sprint Planning Brain' },
        ]}
        icon={<CalendarClock className="h-6 w-6 text-[#003049]" />}
        title="AI Sprint Planning Brain"
        description="Dependency-aware ticket sequencing, capacity optimization, and sprint delivery schedule."
        actions={
          <ProjectNav
            projectId={projectId}
            projectSlug={projectSlug}
            memberCount={members.length}
            ticketCount={project.ticketCount}
          />
        }
      />

      {/* Main Action Bar & Status Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 ${
                isApproved
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 shadow-sm'
              }`}
            >
              {isApproved ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Approved Live Plan (v{plan?.version || 1})</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-amber-600 animate-pulse" />
                  <span>Proposed Plan (v{plan?.version || 1}) — Pending Review</span>
                </>
              )}
            </span>
            {plan?.createdAt && (
              <span className="text-xs text-[#526174] flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(plan.createdAt).toLocaleDateString()} {new Date(plan.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOptionsOpen(true)}
            className="flex items-center gap-1.5"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#526174]" />
            <span>Capacity & Rules</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleGeneratePlan}
            disabled={isPlanning}
            className="flex items-center gap-1.5 border-[#003049] text-[#003049] hover:bg-[#F1F4F7]"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#003049]" />
            <span>{isPlanning ? 'Planning...' : 'Re-Plan Sprints with AI'}</span>
          </Button>

          {!isApproved && (
            <Button
              size="sm"
              onClick={handleApprovePlan}
              disabled={isApproving || !plan}
              className="bg-[#003049] hover:bg-[#002236] text-white flex items-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>{isApproving ? 'Approving...' : 'Approve & Apply Plan'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#17212B]">{sprintAllocations.length}</div>
            <div className="text-xs text-[#526174]">Planned Sprints</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#17212B]">
              {validation?.totalScheduled || sprintAllocations.reduce((sum, s) => sum + s.tickets.length, 0)}
              <span className="text-xs font-normal text-[#526174] ml-1">
                / {validation?.totalTicketsAnalyzed || project.ticketCount || 82}
              </span>
            </div>
            <div className="text-xs text-[#526174]">Tickets Scheduled</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
            <Gauge className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#17212B]">{validation?.capacityUtilizationAverage || 92}%</div>
            <div className="text-xs text-[#526174]">Avg Capacity Util.</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <GitMerge className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#17212B]">{criticalPath?.ticketIds.length || 0}</div>
            <div className="text-xs text-[#526174]">Critical Path Tickets</div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1.5 border-b border-[#E2E8F0] pb-2 overflow-x-auto custom-scrollbar">
        {[
          { id: 'schedule', label: 'Sprint Schedule & Sequencing', icon: CalendarClock, count: sprintAllocations.length },
          { id: 'unscheduled', label: 'Unscheduled Backlog', icon: AlertTriangle, count: unscheduledTickets.length, alert: unscheduledTickets.length > 0 },
          { id: 'dependencies', label: 'Dependency Graph & Critical Path', icon: GitMerge, count: plan?.dependencies?.length || 0 },
          { id: 'validation', label: 'Validation & Integrity Report', icon: ShieldCheck },
          { id: 'history', label: 'Plan Version History', icon: History, count: planHistory.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'bg-[#003049] text-white shadow-sm'
                  : 'text-[#526174] hover:text-[#003049] hover:bg-[#F1F4F7]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : tab.alert
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-[#E2E8F0] text-[#526174]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Sprint Schedule & Sequencing View */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {sprintAllocations.map((sprint, sIdx) => {
            const isOverCapacity = sprint.allocatedPoints > sprint.capacityPoints;
            return (
              <div
                key={sprint.sprintId}
                className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden transition-all duration-150"
              >
                {/* Sprint Header */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-[#F8FAFC] to-white border-b border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded-lg bg-[#003049] text-white text-xs font-bold tracking-wide">
                        {sprint.sprintId}
                      </span>
                      <h3 className="text-base font-bold text-[#17212B]">{sprint.name}</h3>
                      <span className="text-xs text-[#526174]">
                        ({sprint.startDate} → {sprint.endDate})
                      </span>
                    </div>
                    <p className="text-xs text-[#526174] mt-1">
                      <span className="font-semibold text-[#17212B]">Goal:</span> {sprint.goal}
                    </p>
                  </div>

                  {/* Capacity Bar & Utilization */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs font-bold text-[#17212B]">
                        {sprint.allocatedPoints} / {sprint.capacityPoints} pts
                      </div>
                      <div className="text-[11px] text-[#526174]">{sprint.tickets.length} tickets</div>
                    </div>
                    <div className="w-28 bg-[#E2E8F0] rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOverCapacity ? 'bg-rose-500' : sprint.utilizationPercentage > 85 ? 'bg-emerald-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(sprint.utilizationPercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Role Breakdown Badges */}
                <div className="px-4 py-2.5 bg-[#FAFBFD] border-b border-[#E2E8F0] flex items-center gap-2 flex-wrap text-xs text-[#526174]">
                  <span className="font-medium text-[#17212B]">Role Allocation:</span>
                  {Object.entries(sprint.roleBreakdown || {}).map(([role, pts]) => (
                    <span
                      key={role}
                      className="px-2 py-0.5 rounded-md bg-white border border-[#E2E8F0] text-[11px] font-semibold text-[#17212B]"
                    >
                      {role}: {pts} pts
                    </span>
                  ))}
                  {sprint.warnings && sprint.warnings.length > 0 && (
                    <span className="ml-auto flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      <AlertTriangle className="h-3 w-3" />
                      {sprint.warnings[0]}
                    </span>
                  )}
                </div>

                {/* Sequenced Tickets Table */}
                <div className="divide-y divide-[#E2E8F0]">
                  {sprint.tickets.map((t) => (
                    <div
                      key={t.ticketId}
                      className="p-3.5 sm:px-5 hover:bg-[#F8FAFC] transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Execution Sequence Order Badge */}
                        <div className="h-6 w-6 rounded-md bg-[#E2E8F0] text-[#17212B] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          #{t.executionOrder}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {t.sourceCandidateId && (
                              <span className="font-mono font-bold text-[#003049]">{t.sourceCandidateId}</span>
                            )}
                            <span className="font-semibold text-[#17212B]">{t.title}</span>
                          </div>

                          <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-[#526174]">
                            <span className="px-2 py-0.5 rounded bg-[#F1F4F7] text-[#526174] font-medium">
                              {t.module || 'Core'}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                              {t.ownershipRole}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold">
                              {t.storyPoints} pts
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                t.priority === 'Critical' || t.priority === 'High'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {t.priority}
                            </span>
                            {t.prerequisitesInSprint.length > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px]">
                                Co-sprint Prereq: {t.prerequisitesInSprint.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ticket Controls & Explanation Button */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedExplanation({
                              title: `[${t.sourceCandidateId || t.ticketId}] ${t.title}`,
                              text: t.explanation,
                            });
                            setExplanationModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] hover:border-[#003049] text-[#526174] hover:text-[#003049] text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                          <Info className="h-3.5 w-3.5" />
                          <span>Why this order?</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleLock(t.ticketId, t.isLocked, sprint.sprintId)}
                          title={t.isLocked ? 'Locked to this sprint (click to unlock)' : 'Lock ticket to this sprint'}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            t.isLocked
                              ? 'bg-amber-50 border-amber-300 text-amber-800'
                              : 'border-[#E2E8F0] text-[#526174] hover:text-[#17212B]'
                          }`}
                        >
                          {t.isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTicket({
                              id: t.ticketId,
                              title: t.title,
                              currentSprint: sprint.sprintId,
                            });
                            setTargetSprintId(sprint.sprintId);
                            setMoveModalOpen(true);
                          }}
                          title="Move ticket to another sprint"
                          className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] hover:border-[#003049] text-[#526174] hover:text-[#003049] text-xs font-medium transition-colors"
                        >
                          Move...
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Unscheduled Backlog View */}
      {activeTab === 'unscheduled' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <div className="flex items-center gap-2 font-bold mb-1 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              <span>Unscheduled Tickets ({unscheduledTickets.length})</span>
            </div>
            <p>
              The Sprint Planning Brain never forces tickets into sprints if doing so violates hard dependencies or capacity limits. Below are items awaiting PM capacity adjustments, decision resolutions, or backlog descoping.
            </p>
          </div>

          {unscheduledTickets.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-[#E2E8F0] shadow-sm">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
              <h4 className="text-base font-bold text-[#17212B]">All Approved Tickets Scheduled!</h4>
              <p className="text-xs text-[#526174] max-w-md mx-auto mt-1">
                Every ticket fits within available sprint capacities and satisfies all topological prerequisites.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {unscheduledTickets.map((ut) => (
                <div
                  key={ut.ticketId}
                  className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                        {ut.reasonCode}
                      </span>
                      {ut.sourceCandidateId && (
                        <span className="font-mono font-bold text-[#003049]">{ut.sourceCandidateId}</span>
                      )}
                      <span className="font-bold text-[#17212B]">{ut.title}</span>
                    </div>
                    <p className="text-xs text-[#526174] mt-1">{ut.reasonDescription}</p>
                    <div className="mt-1 text-xs text-blue-700 font-medium">
                      Action Required: {ut.actionRequired}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-1 rounded bg-[#F1F4F7] text-[#17212B] font-bold">
                      {ut.storyPoints} pts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Dependency Graph & Critical Path View */}
      {activeTab === 'dependencies' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm">
            <h4 className="text-sm font-bold text-[#17212B] mb-2 flex items-center gap-2">
              <GitMerge className="h-4 w-4 text-[#003049]" />
              <span>Critical Path Analysis</span>
            </h4>
            <p className="text-xs text-[#526174] mb-4">
              The Critical Path represents the longest dependent sequence of implementation tasks. Any delay in this chain directly delays the project target release date.
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              {criticalPath?.ticketIds.map((tid, idx) => (
                <React.Fragment key={tid}>
                  <div className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold flex items-center gap-1.5">
                    <span className="text-[10px] text-purple-600 font-mono">#{idx + 1}</span>
                    <span>{tid}</span>
                  </div>
                  {idx < (criticalPath?.ticketIds.length || 0) - 1 && (
                    <ArrowRight className="h-3.5 w-3.5 text-[#94A3B8]" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0] font-bold text-xs text-[#17212B]">
              Active Dependency Edges ({plan?.dependencies?.length || 0})
            </div>
            <div className="divide-y divide-[#E2E8F0] max-h-[500px] overflow-y-auto">
              {(plan?.dependencies || []).map((dep, idx) => (
                <div key={idx} className="p-3.5 text-xs flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-[#003049]">{dep.sourceKey}</span>
                    <ArrowRight className="h-3 w-3 text-[#526174]" />
                    <span className="font-mono font-bold text-[#003049]">{dep.targetKey}</span>
                    <span className="text-[11px] text-[#526174]">({dep.reason || dep.type})</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      dep.isInferred ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {dep.isInferred ? 'Inferred' : 'Documented'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Validation & Integrity Report */}
      {activeTab === 'validation' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm">
            <h4 className="text-sm font-bold text-[#17212B] mb-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Planning Integrity & Hard Constraints Audit</span>
            </h4>
            <p className="text-xs text-[#526174] mb-4">
              Deterministic validation verifies that topological ordering, capacity bounds, and assignment integrity are mathematically sound.
            </p>

            <div className="space-y-2.5">
              {(validation?.ruleEvaluations || []).map((rule, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-[#E2E8F0] flex items-start gap-3 bg-[#FAFBFD]"
                >
                  {rule.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="text-xs font-bold text-[#17212B]">{rule.rule}</div>
                    <div className="text-[11px] text-[#526174] mt-0.5">{rule.details}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Plan Version History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0] font-bold text-xs text-[#17212B]">
              Plan Revision History ({planHistory.length})
            </div>
            <div className="divide-y divide-[#E2E8F0]">
              {planHistory.map((h) => (
                <div key={h.id} className="p-4 text-xs flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#17212B]">{h.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          h.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : h.status === 'SUPERSEDED'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {h.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#526174] mt-0.5">{h.summary}</p>
                    <div className="text-[11px] text-[#94A3B8] mt-1">
                      Created: {new Date(h.createdAt).toLocaleDateString()} at {new Date(h.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Options & Capacity Settings Modal */}
      <Dialog open={isOptionsOpen} onOpenChange={setIsOptionsOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#17212B] flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-[#003049]" />
              <span>Sprint Planning Brain Configuration</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#526174]">
              Tune team velocity limits and constraint policies before triggering the optimization run.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4 text-xs">
            <div>
              <label className="font-semibold text-[#17212B] block mb-1">
                Default Story-Point Capacity per Sprint
              </label>
              <input
                type="number"
                min={10}
                max={60}
                value={capacityInput}
                onChange={(e) => setCapacityInput(parseInt(e.target.value) || 28)}
                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#003049]"
              />
              <span className="text-[11px] text-[#94A3B8]">Standard agile 2-week iteration velocity.</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] bg-[#FAFBFD]">
              <div>
                <div className="font-semibold text-[#17212B]">Strict Capacity Enforcement</div>
                <div className="text-[11px] text-[#526174]">Do not allow minor overflow tolerance.</div>
              </div>
              <input
                type="checkbox"
                checked={strictCapacity}
                onChange={(e) => setStrictCapacity(e.target.checked)}
                className="h-4 w-4 rounded text-[#003049]"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] bg-[#FAFBFD]">
              <div>
                <div className="font-semibold text-[#17212B]">Allow Co-Sprint Dependencies</div>
                <div className="text-[11px] text-[#526174]">
                  Permit prerequisite and dependent in same sprint with strict sequence order.
                </div>
              </div>
              <input
                type="checkbox"
                checked={allowCoSprint}
                onChange={(e) => setAllowCoSprint(e.target.checked)}
                className="h-4 w-4 rounded text-[#003049]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsOptionsOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleGeneratePlan}
                className="bg-[#003049] hover:bg-[#002236] text-white flex items-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Run Planning Engine</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Move Ticket Modal */}
      <Dialog open={moveModalOpen} onOpenChange={setMoveModalOpen}>
        <DialogContent className="max-w-sm bg-white rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#17212B]">Move Ticket to Sprint</DialogTitle>
            <DialogDescription className="text-xs text-[#526174]">
              {selectedTicket?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-3 text-xs">
            <div>
              <label className="font-semibold text-[#17212B] block mb-1">Target Sprint</label>
              <select
                value={targetSprintId}
                onChange={(e) => setTargetSprintId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-medium cursor-pointer"
              >
                {sprintAllocations.map((s) => (
                  <option key={s.sprintId} value={s.sprintId}>
                    {s.sprintId}: {s.name} ({s.allocatedPoints}/{s.capacityPoints} pts)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setMoveModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleMoveTicket} className="bg-[#003049] text-white">
                Apply Move
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* "Why this order?" Explanation Modal */}
      <Dialog open={explanationModalOpen} onOpenChange={setExplanationModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#17212B] flex items-center gap-2">
              <Info className="h-4 w-4 text-[#003049]" />
              <span>Sequencing & Allocation Rationale</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#526174]">
              {selectedExplanation?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs leading-relaxed text-[#17212B]">
            {selectedExplanation?.text}
          </div>

          <div className="flex justify-end pt-3">
            <Button size="sm" onClick={() => setExplanationModalOpen(false)} className="bg-[#003049] text-white">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
