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
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 py-3 border-b border-[#2A2A2A] mb-6">
      {/* Search Input & Semantic Toggle */}
      <div className="flex items-center gap-2 flex-1 max-w-lg">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#525252]" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => dispatch(setFilters({ search: e.target.value }))}
            placeholder={
              filters.isSemantic
                ? 'Semantic AI search (e.g. database schema, auth logic)...'
                : 'Filter tickets by title or description...'
            }
            className={`w-full pl-9 pr-4 py-2 rounded-xl bg-[#0A0A0A] border text-xs text-white placeholder-[#525252] focus:outline-none focus:ring-1 focus:ring-white transition-colors ${
              filters.isSemantic ? 'border-white ring-1 ring-white/20' : 'border-[#2A2A2A]'
            }`}
          />
          {filters.search && (
            <button
              onClick={() => dispatch(setFilters({ search: '' }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#525252] hover:text-white"
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
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
            filters.isSemantic
              ? 'bg-white text-black border-white shadow-sm'
              : 'bg-[#0A0A0A] text-[#A3A3A3] border-[#2A2A2A] hover:text-white hover:border-[#404040]'
          }`}
        >
          <Sparkles className={`h-3.5 w-3.5 ${filters.isSemantic ? 'text-black' : 'text-[#525252]'}`} />
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
            className="px-3 py-2 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-white cursor-pointer appearance-none pr-8"
          >
            <option value="ALL">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
          <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#525252] pointer-events-none" />
        </div>

        {/* Type Filter */}
        <div className="relative">
          <select
            value={filters.type}
            onChange={(e) => dispatch(setFilters({ type: e.target.value }))}
            className="px-3 py-2 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-white cursor-pointer appearance-none pr-8"
          >
            <option value="ALL">All Types</option>
            <option value="Feature">Feature</option>
            <option value="Bug">Bug</option>
            <option value="Task">Task</option>
            <option value="Improvement">Improvement</option>
          </select>
          <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#525252] pointer-events-none" />
        </div>

        {/* Assignee Filter */}
        <div className="relative">
          <select
            value={filters.assigneeId}
            onChange={(e) => dispatch(setFilters({ assigneeId: e.target.value }))}
            className="px-3 py-2 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-white cursor-pointer appearance-none pr-8"
          >
            <option value="ALL">All Assignees</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.user.username || m.user.email}
              </option>
            ))}
          </select>
          <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#525252] pointer-events-none" />
        </div>

        {/* Clear Filter Button */}
        {hasActiveFilters && (
          <button
            onClick={() => dispatch(clearFilters())}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-white bg-[#141414] hover:bg-[#2A2A2A] border border-[#2A2A2A] transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
