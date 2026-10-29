'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { setFilters, clearFilters } from '@/store/boardSlice';
import { TicketPriority, ProjectMember } from '@/types';
import { Search, X, Sparkles, Filter, ChevronDown, Check, User, AlertCircle, Calendar, Tag } from 'lucide-react';

interface BoardFiltersProps {
  members?: ProjectMember[];
  sprints?: string[];
  currentUserId?: string;
  searchInputRef?: React.RefObject<HTMLInputElement>;
}

export function BoardFilters({
  members = [],
  sprints = [],
  currentUserId,
  searchInputRef,
}: BoardFiltersProps) {
  const dispatch = useAppDispatch();
  const { filters } = useAppSelector((state) => state.board);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const filterPopoverRef = useRef<HTMLDivElement>(null);
  const localSearchRef = useRef<HTMLInputElement>(null);
  const inputRef = searchInputRef || localSearchRef;

  // Global keyboard shortcuts for ⌘F, M, and U
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }

      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInputFocused =
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeTag === 'select' ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      if (!isInputFocused && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key.toLowerCase() === 'm' && currentUserId) {
          e.preventDefault();
          dispatch(setFilters({ assignedToMe: !filters.assignedToMe }));
        } else if (e.key.toLowerCase() === 'u') {
          e.preventDefault();
          dispatch(setFilters({ urgentOnly: !filters.urgentOnly }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, filters.assignedToMe, filters.urgentOnly, currentUserId, inputRef]);

  // Close filter popover on outside click
  useEffect(() => {
    if (!isFilterPopoverOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(e.target as Node)) {
        setIsFilterPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFilterPopoverOpen]);

  const hasActiveFilters =
    filters.search !== '' ||
    filters.priority !== 'ALL' ||
    filters.type !== 'ALL' ||
    filters.assigneeId !== 'ALL' ||
    filters.sprint !== 'ALL' ||
    filters.isSemantic ||
    filters.assignedToMe ||
    filters.urgentOnly;

  const activeFacetCount = [
    filters.priority !== 'ALL',
    filters.type !== 'ALL',
    filters.assigneeId !== 'ALL',
    filters.sprint !== 'ALL',
    Boolean(filters.assignedToMe),
    Boolean(filters.urgentOnly),
  ].filter(Boolean).length;

  return (
    <div className="flex items-center justify-between gap-3 pt-2 pb-1 border-t border-slate-100 select-none">
      {/* Left: Compact Search & Simple Filter Popover */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Search Input */}
        <div className="relative flex items-center w-full max-w-xs">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={filters.search}
            onChange={(e) => dispatch(setFilters({ search: e.target.value }))}
            placeholder={
              filters.isSemantic
                ? 'Semantic AI search... (⌘F)'
                : 'Search tickets... (⌘F)'
            }
            className={`w-full h-8 pl-8 pr-10 rounded-lg text-xs bg-slate-50 text-slate-800 placeholder-slate-400 border transition-all focus:outline-none focus:bg-white ${
              filters.isSemantic
                ? 'border-indigo-400 ring-1 ring-indigo-400/20 bg-white'
                : 'border-slate-200 focus:border-slate-300'
            }`}
          />
          {filters.search ? (
            <button
              type="button"
              onClick={() => dispatch(setFilters({ search: '' }))}
              aria-label="Clear search"
              className="absolute right-2.5 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          ) : (
            <span className="absolute right-2 px-1 py-0.2 rounded bg-slate-200/70 text-slate-400 font-mono text-[9px] pointer-events-none">
              ⌘F
            </span>
          )}
        </div>

        {/* AI Semantic Search Toggle */}
        <button
          type="button"
          onClick={() => dispatch(setFilters({ isSemantic: !filters.isSemantic }))}
          title="Toggle semantic AI search"
          className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
            filters.isSemantic
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
              : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900'
          }`}
        >
          <Sparkles className={`h-3.5 w-3.5 ${filters.isSemantic ? 'text-indigo-200 animate-pulse' : 'text-indigo-600'}`} />
          <span className="hidden sm:inline">AI Search</span>
        </button>

        {/* Consolidated Filter Popover Trigger */}
        <div className="relative" ref={filterPopoverRef}>
          <button
            type="button"
            onClick={() => setIsFilterPopoverOpen(!isFilterPopoverOpen)}
            className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
              activeFacetCount > 0
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold'
                : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filter</span>
            {activeFacetCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFacetCount}
              </span>
            )}
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {/* Filter Dropdown Popover */}
          {isFilterPopoverOpen && (
            <div className="absolute left-0 top-9 w-72 rounded-xl bg-white border border-slate-200 shadow-lg p-3 z-50 text-xs text-slate-700 space-y-3 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span className="font-semibold text-slate-900">Filter Tickets</span>
                {activeFacetCount > 0 && (
                  <button
                    type="button"
                    onClick={() => dispatch(clearFilters())}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Reset all
                  </button>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Priority</label>
                <select
                  value={filters.priority}
                  onChange={(e) => dispatch(setFilters({ priority: e.target.value as 'ALL' | TicketPriority }))}
                  className="w-full h-7 px-2 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white"
                >
                  <option value="ALL">All priorities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Assignee</label>
                <select
                  value={filters.assigneeId}
                  onChange={(e) => dispatch(setFilters({ assigneeId: e.target.value }))}
                  className="w-full h-7 px-2 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white"
                >
                  <option value="ALL">All assignees</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.username || m.user.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => dispatch(setFilters({ type: e.target.value }))}
                  className="w-full h-7 px-2 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white"
                >
                  <option value="ALL">All types</option>
                  <option value="Feature">Feature</option>
                  <option value="Bug">Bug</option>
                  <option value="Task">Task</option>
                  <option value="Improvement">Improvement</option>
                </select>
              </div>

              {/* Sprint */}
              {sprints.length > 0 && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Sprint</label>
                  <select
                    value={filters.sprint}
                    onChange={(e) => dispatch(setFilters({ sprint: e.target.value }))}
                    className="w-full h-7 px-2 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white"
                  >
                    <option value="ALL">All sprints</option>
                    {sprints.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quick Toggles */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                {currentUserId && (
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={filters.assignedToMe}
                      onChange={(e) => dispatch(setFilters({ assignedToMe: e.target.checked }))}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-0"
                    />
                    <span>Assigned to me (M)</span>
                  </label>
                )}
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={filters.urgentOnly}
                    onChange={(e) => dispatch(setFilters({ urgentOnly: e.target.checked }))}
                    className="rounded border-slate-300 text-red-600 focus:ring-0"
                  />
                  <span>Urgent only (U)</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Clear Filters button (shown when any filter or search is active) */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => dispatch(clearFilters())}
            className="text-xs text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1"
            title="Reset filters"
          >
            <X className="h-3 w-3" />
            <span>Clear</span>
          </button>
        )}
      </div>
    </div>
  );
}
