'use client';

import React from 'react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { setFilters, clearFilters } from '@/store/boardSlice';
import { Priority } from '@/types';
import { Search, Filter, X, Tag } from 'lucide-react';

export function BoardFilters() {
  const dispatch = useAppDispatch();
  const { filters, board } = useAppSelector((state) => state.board);
  const { users } = useAppSelector((state) => state.project);

  // Collect all unique labels across all tickets in board
  const allLabels = React.useMemo(() => {
    if (!board) return [];
    const labelSet = new Set<string>();
    board.columns.forEach((col) => {
      col.tickets.forEach((t) => {
        if (Array.isArray(t.labels)) {
          t.labels.forEach((l) => labelSet.add(l));
        }
      });
    });
    return Array.from(labelSet);
  }, [board]);

  const hasActiveFilters =
    filters.search !== '' ||
    filters.priority !== 'ALL' ||
    filters.label !== 'ALL' ||
    filters.assigneeId !== 'ALL';

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 py-3 border-b border-slate-800/80 mb-6">
      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => dispatch(setFilters({ search: e.target.value }))}
          placeholder="Filter tickets by title, keyword, or tech..."
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
        />
        {filters.search && (
          <button
            onClick={() => dispatch(setFilters({ search: '' }))}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Select Filter Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Priority Filter */}
        <div className="relative">
          <select
            value={filters.priority}
            onChange={(e) =>
              dispatch(setFilters({ priority: e.target.value as 'ALL' | Priority }))
            }
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none pr-8"
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>
          <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
        </div>

        {/* Assignee Filter */}
        <div className="relative">
          <select
            value={filters.assigneeId}
            onChange={(e) => dispatch(setFilters({ assigneeId: e.target.value }))}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none pr-8"
          >
            <option value="ALL">All Assignees</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
        </div>

        {/* Label Tag Filter */}
        {allLabels.length > 0 && (
          <div className="relative">
            <select
              value={filters.label}
              onChange={(e) => dispatch(setFilters({ label: e.target.value }))}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none pr-8"
            >
              <option value="ALL">All Labels</option>
              {allLabels.map((lbl) => (
                <option key={lbl} value={lbl}>
                  #{lbl}
                </option>
              ))}
            </select>
            <Tag className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
          </div>
        )}

        {/* Clear Filter Button */}
        {hasActiveFilters && (
          <button
            onClick={() => dispatch(clearFilters())}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
