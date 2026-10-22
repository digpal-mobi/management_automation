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
    'To Do': 'bg-[#525252]',
    'In Progress': 'bg-[#A3A3A3]',
    'Done': 'bg-white',
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#0A0A0A] border border-[#2A2A2A]">
        <div>
          <span className="text-[10px] uppercase font-bold text-[#A3A3A3] tracking-wider">
            Project Velocity & Metrics
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">
            {project.name}
          </h1>
          <p className="text-xs text-[#A3A3A3] mt-1 max-w-xl">
            {project.description || 'No description provided.'}
          </p>
        </div>

        <Link
          href={`/projects/${project.id}/board`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-[#F5F5F5] text-black text-xs font-semibold shadow-sm transition-all self-start sm:self-center"
        >
          <Kanban className="h-4 w-4" />
          View Kanban Board
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tickets */}
        <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-[#2A2A2A] space-y-2">
          <div className="flex items-center justify-between text-[#A3A3A3] text-xs font-semibold">
            <span>Total Tickets</span>
            <Layers className="h-4 w-4 text-white" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {analytics.totalTickets}
          </div>
          <div className="text-[11px] text-[#525252]">
            Across all workflow states
          </div>
        </div>

        {/* In Progress */}
        <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-[#2A2A2A] space-y-2">
          <div className="flex items-center justify-between text-[#A3A3A3] text-xs font-semibold">
            <span>In Progress</span>
            <Clock className="h-4 w-4 text-white" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {analytics.inProgressTickets}
          </div>
          <div className="text-[11px] text-[#525252]">
            Active developer tasks
          </div>
        </div>

        {/* Completed Tickets */}
        <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-[#2A2A2A] space-y-2">
          <div className="flex items-center justify-between text-[#A3A3A3] text-xs font-semibold">
            <span>Completed Tickets</span>
            <CheckCircle2 className="h-4 w-4 text-white" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {analytics.completedTickets}
          </div>
          <div className="text-[11px] text-[#525252]">
            Moved to Done column
          </div>
        </div>

        {/* Completion Rate */}
        <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-[#2A2A2A] space-y-2">
          <div className="flex items-center justify-between text-[#A3A3A3] text-xs font-semibold">
            <span>Completion Rate</span>
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {analytics.completionRate}%
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-[#141414] rounded-full overflow-hidden border border-[#2A2A2A]">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${analytics.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid: Status Distribution & Priority Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Column Status Breakdown */}
        <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-[#2A2A2A] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              Tickets by Board Column
            </h3>
            <span className="text-xs text-[#525252]">Workflow distribution</span>
          </div>

          <div className="space-y-3">
            {Object.entries(statusCounts).map(([status, count]) => {
              const pct =
                analytics.totalTickets > 0
                  ? Math.round((count / analytics.totalTickets) * 100)
                  : 0;
              const barColor = statusColors[status] || 'bg-[#525252]';

              return (
                <div key={status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#A3A3A3]">{status}</span>
                    <span className="text-white font-mono">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#141414] rounded-full overflow-hidden border border-[#2A2A2A]">
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
        <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-[#2A2A2A] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              Tickets by Priority
            </h3>
            <span className="text-xs text-[#525252]">Urgency breakdown</span>
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
                    <span className="font-medium text-[#A3A3A3]">{prio}</span>
                    <span className="text-white font-mono">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#141414] rounded-full overflow-hidden border border-[#2A2A2A]">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-300"
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
