'use client';

import React from 'react';
import { Project, ProjectAnalytics } from '@/types';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

interface AnalyticsViewProps {
  project: Project;
  analytics: ProjectAnalytics;
}

export function AnalyticsView({ analytics }: AnalyticsViewProps) {
  const statusCounts: Record<string, number> = {
    'To Do': analytics.todoTickets || 0,
    'In Progress': analytics.inProgressTickets || 0,
    'Done': analytics.completedTickets || 0,
  };

  const statusColors: Record<string, string> = {
    'To Do': 'bg-chart-1',
    'In Progress': 'bg-chart-3',
    'Done': 'bg-chart-2',
  };

  const priorityColors: Record<string, string> = {
    CRITICAL: 'bg-chart-5',
    HIGH: 'bg-chart-3',
    MEDIUM: 'bg-chart-1',
    LOW: 'bg-chart-6',
  };

  return (
    <div className="space-y-6">
      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tickets */}
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-ts text-xs font-semibold">
            <span>Total Tickets</span>
            <div className="p-1.5 rounded-lg bg-accent-subtle">
              <Layers className="h-4 w-4 text-accent" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-tp">
            {analytics.totalTickets}
          </div>
          <div className="text-[11px] text-ts">
            Across all workflow states
          </div>
        </Card>

        {/* In Progress */}
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-ts text-xs font-semibold">
            <span>In Progress</span>
            <div className="p-1.5 rounded-lg bg-accent-subtle">
              <Clock className="h-4 w-4 text-accent" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-tp">
            {analytics.inProgressTickets}
          </div>
          <div className="text-[11px] text-ts">
            Active developer tasks
          </div>
        </Card>

        {/* Completed Tickets */}
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-ts text-xs font-semibold">
            <span>Completed Tickets</span>
            <div className="p-1.5 rounded-lg bg-success-subtle">
              <CheckCircle2 className="h-4 w-4 text-success" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-tp">
            {analytics.completedTickets}
          </div>
          <div className="text-[11px] text-ts">
            Moved to Done column
          </div>
        </Card>

        {/* Completion Rate */}
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-ts text-xs font-semibold">
            <span>Completion Rate</span>
            <div className="p-1.5 rounded-lg bg-accent-subtle">
              <BarChart3 className="h-4 w-4 text-accent" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-tp">
            {analytics.completionRate}%
          </div>
          <div className="w-full h-1.5 bg-hover rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${analytics.completionRate}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Grid: Status Distribution & Priority Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Column Status Breakdown */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Tickets by Board Column</CardTitle>
              <p className="text-xs text-ts mt-0.5">Workflow distribution</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {Object.entries(statusCounts).map(([status, count]) => {
              const pct =
                analytics.totalTickets > 0
                  ? Math.round((count / analytics.totalTickets) * 100)
                  : 0;
              const barColor = statusColors[status] || 'bg-accent';

              return (
                <div key={status} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-tp">{status}</span>
                    <span className="text-ts font-mono">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-hover rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all duration-300`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Priority Breakdown */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Priority Breakdown</CardTitle>
              <p className="text-xs text-ts mt-0.5">Distribution across severity levels</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {Object.entries(analytics.priorityBreakdown || {}).map(([priority, val]) => {
              const count = Number(val) || 0;
              const pct =
                analytics.totalTickets > 0
                  ? Math.round((count / analytics.totalTickets) * 100)
                  : 0;
              const barColor = priorityColors[priority] || 'bg-accent';

              return (
                <div key={priority} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-tp">{priority}</span>
                    <span className="text-ts font-mono">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-hover rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all duration-300`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Ticket Type Distribution */}
      {analytics.typeBreakdown && Object.keys(analytics.typeBreakdown).length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Ticket Type Distribution</CardTitle>
              <p className="text-xs text-ts mt-0.5">Feature vs Bug vs Task breakdown</p>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(analytics.typeBreakdown).map(([type, val]) => {
                const count = Number(val) || 0;
                return (
                  <div
                    key={type}
                    className="p-4 rounded-xl bg-canvas border border-border space-y-1 text-center"
                  >
                    <div className="text-[11px] font-semibold text-ts uppercase tracking-wider">
                      {type}
                    </div>
                    <div className="text-2xl font-bold text-tp">{count}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
