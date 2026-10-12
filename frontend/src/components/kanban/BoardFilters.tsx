'use client';

import React from 'react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { setFilters, clearFilters } from '@/store/boardSlice';
import { TicketPriority, ProjectMember } from '@/types';
import { Search, Filter, X, Sparkles } from 'lucide-react';

interface BoardFiltersProps {
  members?: ProjectMember[];
  onSemanticSearch?: (query: string) => void;
}

export function BoardFilters({ members = [] }: BoardFiltersProps) {
  const dispatch = useAppDispatch();
  const { filters } = useAppSelector((state) => state.board);

  const hasActiveFilters =
    filters.search !== '' ||
    filters.priority !== 'ALL' ||
    filters.type !== 'ALL' ||
    filters.assigneeId !== 'ALL' ||
    filters.isSemantic;

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 py-3 border-b border-slate-800/80 mb-6">
      {/* Search Input & Semantic Toggle */}
      <div className="flex items-center gap-2 flex-1 max-w-lg">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => dispatch(setFilters({ search: e.target.value }))}
            placeholder={
              filters.isSemantic
                ? 'Semantic AI search (e.g. database schema, auth logic)...'
                : 'Filter tickets by title or description...'
            }
            className={`w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors ${
              filters.isSemantic ? 'border-purple-500/50 ring-1 ring-purple-500/20' : 'border-slate-800'
            }`}
          />
          {filters.search && (
            <button
              onClick={() => dispatch(setFilters({ search: '' }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Semantic Search Mode Button */}
        <button
          type="button"
          onClick={() => dispatch(setFilters({ isSemantic: !filters.isSemantic }))}
          title="Toggle pgvector semantic search on ticket descriptions"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
            filters.isSemantic
              ? 'bg-purple-600/20 text-purple-300 border-purple-500/40 shadow-sm'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          <Sparkles className={`h-3.5 w-3.5 ${filters.isSemantic ? 'text-purple-400' : 'text-slate-500'}`} />
          <span>AI Search</span>
        </button>
      </div>

      {/* Select Filter Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Priority Filter */}
        <div className="relative">
          <select
            value={filters.priority}
            onChange={(e) =>
              dispatch(setFilters({ priority: e.target.value as 'ALL' | TicketPriority }))
            }
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none pr-8"
          >
            <option value="ALL">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
          <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
        </div>

        {/* Type Filter */}
        <div className="relative">
          <select
            value={filters.type}
            onChange={(e) => dispatch(setFilters({ type: e.target.value }))}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none pr-8"
          >
            <option value="ALL">All Types</option>
            <option value="Feature">Feature</option>
            <option value="Bug">Bug</option>
            <option value="Task">Task</option>
            <option value="Improvement">Improvement</option>
          </select>
          <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
        </div>

        {/* Assignee Filter */}
        <div className="relative">
          <select
            value={filters.assigneeId}
            onChange={(e) => dispatch(setFilters({ assigneeId: e.target.value }))}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none pr-8"
          >
            <option value="ALL">All Assignees</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.user.username || m.user.email}
              </option>
            ))}
          </select>
          <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
        </div>

        {/* Clear Filter Button */}
        {hasActiveFilters && (
          <button
            onClick={() => dispatch(clearFilters())}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
