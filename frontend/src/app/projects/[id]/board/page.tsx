'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Board as BoardType, Project } from '@/types';
import { Board } from '@/components/kanban/Board';
import { Loader2, AlertCircle, Kanban, BarChart3, Plus } from 'lucide-react';
import Link from 'next/link';

export default function ProjectBoardPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [boardData, setBoardData] = useState<{
    board: BoardType;
    project: Project;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    setLoading(true);
    api
      .getBoard(projectId)
      .then((res) => {
        if (res.success && res.board && res.project) {
          setBoardData({ board: res.board, project: res.project });
        } else {
          setError('Could not load board');
        }
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || 'Failed to load board');
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
        <p className="text-xs text-slate-400">Loading Kanban board & tickets...</p>
      </div>
    );
  }

  if (error || !boardData) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3 text-center">
        <AlertCircle className="h-8 w-8 text-rose-400" />
        <h3 className="text-sm font-semibold text-slate-200">Failed to load board</h3>
        <p className="text-xs text-slate-400 max-w-sm">{error}</p>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg bg-slate-800 text-xs text-slate-200 hover:bg-slate-700"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Board Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/" className="hover:text-slate-200">
              Projects
            </Link>
            <span>/</span>
            <span className="text-indigo-400 font-semibold">{boardData.project.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
            <Kanban className="h-6 w-6 text-indigo-400" />
            {boardData.board.name}
          </h1>
          {boardData.project.techStack && (
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Tech: {boardData.project.techStack}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}/analytics`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
          >
            <BarChart3 className="h-4 w-4 text-cyan-400" />
            Velocity & Metrics
          </Link>
        </div>
      </div>

      {/* Main Kanban Board Area */}
      <Board initialBoard={boardData.board} initialProject={boardData.project} />
    </div>
  );
}
