'use client';

import React from 'react';
import Link from 'next/link';
import { Project, ProjectAnalytics } from '@/types';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Layers,
  Kanban,
  CheckSquare,
} from 'lucide-react';

interface AnalyticsViewProps {
  project: Project;
  analytics: ProjectAnalytics;
}

export function AnalyticsView({ project, analytics }: AnalyticsViewProps) {
  const statusCounts: Record<string, number> = {
    'To Do': analytics.todoTickets || 0,
    'In Progress': analytics.inProgressTickets || 0,
    'Done': analytics.completedTickets || 0,
  };

  const statusColors: Record<string, string> = {
    'To Do': 'bg-blue-500',
    'In Progress': 'bg-amber-500',
    'Done': 'bg-emerald-500',
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-slate-800">
        <div>
          <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
            Project Velocity & Metrics
          </span>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight mt-0.5">
            {project.name}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            {project.description || 'No description provided.'}
          </p>
        </div>

        <Link
          href={`/projects/${project.id}/board`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all self-start sm:self-center"
        >
          <Kanban className="h-4 w-4" />
          View Kanban Board
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tickets */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Tickets</span>
            <Layers className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-100">
            {analytics.totalTickets}
          </div>
          <div className="text-[11px] text-slate-500">
            Across all workflow states
          </div>
        </div>

        {/* In Progress */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>In Progress</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400">
            {analytics.inProgressTickets}
          </div>
          <div className="text-[11px] text-slate-500">
            Active developer tasks
          </div>
        </div>

        {/* Completed Tickets */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Completed Tickets</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">
            {analytics.completedTickets}
          </div>
          <div className="text-[11px] text-slate-500">
            Moved to Done column
          </div>
        </div>

        {/* Completion Rate */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Completion Rate</span>
            <BarChart3 className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-cyan-400">
            {analytics.completionRate}%
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${analytics.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid: Status Distribution & Priority Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Column Status Breakdown */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">
              Tickets by Board Column
            </h3>
            <span className="text-xs text-slate-500">Workflow distribution</span>
          </div>

          <div className="space-y-3">
            {Object.entries(statusCounts).map(([status, count]) => {
              const pct =
                analytics.totalTickets > 0
                  ? Math.round((count / analytics.totalTickets) * 100)
                  : 0;
              const barColor = statusColors[status] || 'bg-slate-600';

              return (
                <div key={status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300">{status}</span>
                    <span className="text-slate-400 font-mono">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all duration-300`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">
              Tickets by Priority
            </h3>
            <span className="text-xs text-slate-500">Urgency breakdown</span>
          </div>

          <div className="space-y-3">
            {Object.entries(analytics.priorityBreakdown || {}).map(([prio, count]) => {
              const pct =
                analytics.totalTickets > 0
                  ? Math.round((count / analytics.totalTickets) * 100)
                  : 0;

              return (
                <div key={prio} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300">{prio}</span>
                    <span className="text-slate-400 font-mono">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
