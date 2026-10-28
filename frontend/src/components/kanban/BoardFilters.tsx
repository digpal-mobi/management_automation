'use client';

import React from 'react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { setFilters, clearFilters } from '@/store/boardSlice';
import { TicketPriority, ProjectMember } from '@/types';
import { Search, X, Sparkles, ChevronDown } from 'lucide-react';

interface BoardFiltersProps {
  members?: ProjectMember[];
  sprints?: string[];
  onSemanticSearch?: (query: string) => void;
}

export function BoardFilters({ members = [], sprints = [] }: BoardFiltersProps) {
  const dispatch = useAppDispatch();
  const { filters } = useAppSelector((state) => state.board);

  const hasActiveFilters =
    filters.search !== '' ||
    filters.priority !== 'ALL' ||
    filters.type !== 'ALL' ||
    filters.assigneeId !== 'ALL' ||
    filters.sprint !== 'ALL' ||
    filters.isSemantic;

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 py-3 border-b border-[#E2E8F0] mb-6">
      {/* Search Input & Semantic Toggle */}
      <div className="flex items-center gap-2 flex-1 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#526174]" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => dispatch(setFilters({ search: e.target.value }))}
            placeholder={
              filters.isSemantic
                ? 'Semantic AI search (e.g. database schema, auth logic)...'
                : 'Filter tickets by title or description...'
            }
            className={`w-full pl-9 pr-9 py-2 rounded-xl bg-white border text-xs text-[#17212B] placeholder-[#94A3B8] transition-all duration-150
              focus:outline-none focus-visible:ring-1 focus-visible:ring-[#003049] focus:border-[#003049] ${
                filters.isSemantic
                  ? 'border-[#003049] ring-1 ring-[#003049]/30'
                  : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
              }`}
          />
          {filters.search && (
            <button
              onClick={() => dispatch(setFilters({ search: '' }))}
              aria-label="Clear search input"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#526174] hover:text-[#17212B] transition-colors"
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
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-150 whitespace-nowrap active:scale-[0.98] ${
            filters.isSemantic
              ? 'bg-[#003049] text-white border-[#003049] shadow-sm'
              : 'bg-white text-[#526174] border-[#E2E8F0] hover:text-[#003049] hover:border-[#CBD5E1]'
          }`}
        >
          <Sparkles className={`h-3.5 w-3.5 ${filters.isSemantic ? 'text-[#669BBC]' : 'text-[#526174]'}`} />
          <span>AI Search</span>
        </button>
      </div>

      {/* Select Filter Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Sprint Filter */}
        <div className="relative flex-1 sm:flex-initial min-w-[125px]">
          <select
            value={filters.sprint}
            onChange={(e) => dispatch(setFilters({ sprint: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:border-[#003049] text-xs font-semibold text-[#003049] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#003049] focus:border-[#003049] cursor-pointer appearance-none pr-8 transition-colors shadow-xs"
            title="Filter Kanban board by specific development sprint"
          >
            <option value="ALL">All Sprints</option>
            {sprints.map((s) => (
              <option key={s} value={s}>
                Sprint {s}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#003049] pointer-events-none" />
        </div>
        {/* Priority Filter */}
        <div className="relative flex-1 sm:flex-initial min-w-[120px]">
          <select
            value={filters.priority}
            onChange={(e) =>
              dispatch(setFilters({ priority: e.target.value as 'ALL' | TicketPriority }))
            }
            className="w-full px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] text-xs font-medium text-[#17212B] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#003049] focus:border-[#003049] cursor-pointer appearance-none pr-8 transition-colors"
          >
            <option value="ALL">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#526174] pointer-events-none" />
        </div>

        {/* Type Filter */}
        <div className="relative flex-1 sm:flex-initial min-w-[110px]">
          <select
            value={filters.type}
            onChange={(e) => dispatch(setFilters({ type: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] text-xs font-medium text-[#17212B] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#003049] focus:border-[#003049] cursor-pointer appearance-none pr-8 transition-colors"
          >
            <option value="ALL">All Types</option>
            <option value="Feature">Feature</option>
            <option value="Bug">Bug</option>
            <option value="Task">Task</option>
            <option value="Improvement">Improvement</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#526174] pointer-events-none" />
        </div>

        {/* Assignee Filter */}
        <div className="relative flex-1 sm:flex-initial min-w-[130px]">
          <select
            value={filters.assigneeId}
            onChange={(e) => dispatch(setFilters({ assigneeId: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] text-xs font-medium text-[#17212B] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#003049] focus:border-[#003049] cursor-pointer appearance-none pr-8 transition-colors"
          >
            <option value="ALL">All Assignees</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.user.username || m.user.email}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#526174] pointer-events-none" />
        </div>

        {/* Clear Filter Button */}
        {hasActiveFilters && (
          <button
            onClick={() => dispatch(clearFilters())}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-[#526174] hover:text-[#17212B] bg-[#F1F4F7] hover:bg-[#E2E8F0] border border-[#E2E8F0] transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>
    </div>
  );
}
