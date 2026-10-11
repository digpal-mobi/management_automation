'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Project } from '@/types';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { setProjects } from '@/store/projectSlice';
import {
  Sparkles,
  Kanban,
  BarChart3,
  PlusCircle,
  FolderKanban,
  Layers,
  ArrowRight,
  Zap,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export default function HomePage() {
  const dispatch = useAppDispatch();
  const { projects } = useAppSelector((state) => state.project);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getProjects()
      .then((res) => {
        if (res.success && res.projects) {
          dispatch(setProjects(res.projects));
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [dispatch]);

  const totalTicketsAll = projects.reduce((acc, p) => acc + (p.totalTickets || 0), 0);
  const totalPointsAll = projects.reduce((acc, p) => acc + (p.totalPoints || 0), 0);

  return (
    <div className="space-y-10 py-4">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border border-slate-800 p-8 sm:p-10 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400">
            <Sparkles className="h-3.5 w-3.5" />
            Autonomous AI Project Management System
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Turn PRDs into Developer-Ready Kanban Tickets in Seconds.
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Provide project goals, architecture specs, or PRD text. The AI agent analyzes feature complexity, generates granular tickets with interactive acceptance criteria checklists, and acts as a RAG-grounded developer pair programmer.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlusCircle className="h-4 w-4" />
              Create Project & Ingest PRD
            </Link>

            {projects.length > 0 && (
              <Link
                href={`/projects/${projects[0].id}/board`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-all"
              >
                <Kanban className="h-4 w-4 text-indigo-400" />
                Open Demo Board
              </Link>
            )}
          </div>
        </div>

        {/* Decorative Grid and Glow */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 pointer-events-none bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]" />
      </div>

      {/* Global Stat Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Active Projects</div>
            <div className="text-2xl font-bold text-slate-100 mt-0.5">{projects.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <FolderKanban className="h-5 w-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Total AI Generated Tickets</div>
            <div className="text-2xl font-bold text-slate-100 mt-0.5">{totalTicketsAll}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Layers className="h-5 w-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Tracked Velocity</div>
            <div className="text-2xl font-bold text-amber-400 mt-0.5">{totalPointsAll} pts</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Zap className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Projects List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Engineering Workspaces</h2>
            <p className="text-xs text-slate-400">Select a project to access its Kanban board and RAG assistant</p>
          </div>
          <Link
            href="/projects/new"
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
          >
            <PlusCircle className="h-4 w-4" />
            New Workspace
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <FolderKanban className="h-10 w-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No projects yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create your first project by pasting a PRD or uploading a requirements document.
            </p>
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium"
            >
              Get Started
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((proj) => {
              const compRate = proj.completionRate || 0;

              return (
                <div
                  key={proj.id}
                  className="group flex flex-col justify-between p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition-all duration-200 shadow-sm hover:shadow-xl"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-1">
                        {proj.name}
                      </h3>
                      <span className="flex-shrink-0 text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                        {proj.totalPoints || 0} pts
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {proj.description}
                    </p>

                    {proj.techStack && (
                      <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800/80 truncate">
                        {proj.techStack}
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>
                          {proj.doneTickets || 0}/{proj.totalTickets || 0} tickets done
                        </span>
                        <span className="font-semibold text-slate-300">{compRate}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${compRate}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <Link
                      href={`/projects/${proj.id}/analytics`}
                      className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-medium"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      Metrics
                    </Link>

                    <Link
                      href={`/projects/${proj.id}/board`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 group-hover:translate-x-0.5 transition-all"
                    >
                      Open Board
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
