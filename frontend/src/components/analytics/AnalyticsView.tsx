'use client';

import React from 'react';
import Link from 'next/link';
import { Project, ProjectAnalytics } from '@/types';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Layers,
  Zap,
  Kanban,
  AlertTriangle,
} from 'lucide-react';

interface AnalyticsViewProps {
  project: Project;
  analytics: ProjectAnalytics;
}

export function AnalyticsView({ project, analytics }: AnalyticsViewProps) {
  const statusColors: Record<string, string> = {
    Backlog: 'bg-slate-500',
    'To Do': 'bg-blue-500',
    'In Progress': 'bg-amber-500',
    'In Review': 'bg-purple-500',
    Done: 'bg-emerald-500',
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
            {project.description}
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
            Autonomously generated & tracked
          </div>
        </div>

        {/* Total Story Points */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Velocity (Points)</span>
            <Zap className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400">
            {analytics.totalStoryPoints}
          </div>
          <div className="text-[11px] text-slate-500">
            Estimated sprint effort
          </div>
        </div>

        {/* Completed Points */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Completed Points</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">
            {analytics.completedStoryPoints}
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
            {analytics.completionPercentage}%
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${analytics.completionPercentage}%` }}
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
            <span className="text-xs text-slate-500">Active distribution</span>
          </div>

          <div className="space-y-3">
            {Object.entries(analytics.statusCounts).map(([status, count]) => {
              const pct =
                analytics.totalTickets > 0
                  ? Math.round((count / analytics.totalTickets) * 100)
                  : 0;
              const barColor = statusColors[status] || 'bg-slate-600';

              return (
                <div key={status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300">{status}</span>
                    <span className="font-mono text-slate-400">
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
            <span className="text-xs text-slate-500">Risk & urgency</span>
          </div>

          <div className="space-y-3">
            {[
              { label: 'HIGH', count: analytics.priorityCounts.HIGH || 0, color: 'bg-red-500', text: 'text-red-400' },
              { label: 'MEDIUM', count: analytics.priorityCounts.MEDIUM || 0, color: 'bg-amber-500', text: 'text-amber-400' },
              { label: 'LOW', count: analytics.priorityCounts.LOW || 0, color: 'bg-blue-500', text: 'text-blue-400' },
            ].map((p) => {
              const pct =
                analytics.totalTickets > 0
                  ? Math.round((p.count / analytics.totalTickets) * 100)
                  : 0;

              return (
                <div key={p.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-semibold ${p.text}`}>{p.label} Priority</span>
                    <span className="font-mono text-slate-400">
                      {p.count} tickets ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${p.color} rounded-full transition-all duration-300`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Label Distribution */}
      {Object.keys(analytics.labelCounts).length > 0 && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-200">
            Feature & Domain Tag Breakdown
          </h3>
          <div className="flex flex-wrap gap-2.5">
            {Object.entries(analytics.labelCounts).map(([label, count]) => (
              <div
                key={label}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
              >
                <span className="text-indigo-400 font-medium">#{label}</span>
                <span className="font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
