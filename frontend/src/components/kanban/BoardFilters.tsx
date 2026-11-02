'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { setFilters, clearFilters } from '@/store/boardSlice';
import { TicketPriority, ProjectMember } from '@/types';
import {
  Search,
  X,
  Sparkles,
  Filter,
  ChevronDown,
  LayoutGrid,
  List,
  CalendarDays,
  GanttChart,
  BarChart3,
  ArrowUpDown,
  Rows3,
  Zap,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface BoardFiltersProps {
  members?: ProjectMember[];
  sprints?: string[];
  currentUserId?: string;
  searchInputRef?: React.RefObject<HTMLInputElement>;
  projectSlug?: string;
  onOpenPreferences?: () => void;
}

export function BoardFilters({
  members = [],
  sprints = [],
  currentUserId,
  searchInputRef,
  projectSlug,
  onOpenPreferences,
}: BoardFiltersProps) {
  const dispatch = useAppDispatch();
  const { filters } = useAppSelector((state) => state.board);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const filterPopoverRef = useRef<HTMLDivElement>(null);
  const localSearchRef = useRef<HTMLInputElement>(null);
  const inputRef = searchInputRef || localSearchRef;

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

  const viewBtn = (active: boolean) =>
    cn(
      'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-colors',
      active
        ? 'bg-accent-subtle text-accent font-medium shadow-sm'
        : 'text-ts hover:text-tp hover:bg-elevated/50'
    );

  return (
    <div className="flex items-center justify-between flex-wrap gap-2 pt-0.5 select-none">
      <div className="flex items-center p-0.5 rounded-lg bg-surface border border-border/70 text-xs">
        <span className={viewBtn(true)}>
          <LayoutGrid className="h-[15px] w-[15px]" />
          <span>Board</span>
          <span className="w-1.5 h-1.5 rounded-full bg-accent ml-0.5" />
        </span>
        {projectSlug && (
          <>
            <Link href={`/projects/${projectSlug}/plan`} className={viewBtn(false)}>
              <List className="h-[15px] w-[15px]" />
              <span>List</span>
            </Link>
            <Link href={`/projects/${projectSlug}/roadmap`} className={viewBtn(false)}>
              <CalendarDays className="h-[15px] w-[15px]" />
              <span>Calendar</span>
            </Link>
            <Link href={`/projects/${projectSlug}/roadmap`} className={viewBtn(false)}>
              <GanttChart className="h-[15px] w-[15px]" />
              <span>Timeline</span>
            </Link>
            <Link href={`/projects/${projectSlug}/analytics`} className={viewBtn(false)}>
              <BarChart3 className="h-[15px] w-[15px]" />
              <span>Dashboard</span>
            </Link>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 h-7 px-2 rounded-lg bg-surface border border-border/80 text-ts hover:border-accent/30 w-44">
          <Search className="h-[14px] w-[14px] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={filters.search}
            onChange={(e) => dispatch(setFilters({ search: e.target.value }))}
            placeholder="Filter tasks..."
            className="bg-transparent border-none p-0 text-xs text-tp placeholder:text-ts focus:ring-0 focus:outline-none w-full"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => dispatch(setFilters({ search: '' }))}
              aria-label="Clear search"
              className="text-tm hover:text-tp"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => dispatch(setFilters({ isSemantic: !filters.isSemantic }))}
          className={cn(
            'h-7 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors',
            filters.isSemantic
              ? 'bg-accent text-canvas border-accent'
              : 'bg-surface border-border/80 hover:bg-elevated text-ts hover:text-tp'
          )}
          title="Toggle semantic AI search"
        >
          <Sparkles className="h-[14px] w-[14px]" />
          <span className="hidden sm:inline">AI</span>
        </button>

        <div className="relative" ref={filterPopoverRef}>
          <button
            type="button"
            onClick={() => setIsFilterPopoverOpen(!isFilterPopoverOpen)}
            className={cn(
              'h-7 px-2.5 rounded-lg bg-surface border border-border/80 hover:bg-elevated text-tp text-xs font-medium flex items-center gap-1.5 transition-colors',
              activeFacetCount > 0 && 'border-accent/40'
            )}
          >
            <Filter className="h-[14px] w-[14px] text-ts" />
            <span>Filter</span>
            {activeFacetCount > 0 && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-semibold">
                {activeFacetCount}
              </span>
            )}
          </button>

          {isFilterPopoverOpen && (
            <div className="absolute right-0 top-9 w-72 rounded-xl bg-elevated border border-border shadow-dropdown p-3 z-50 text-xs text-ts space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-divider">
                <span className="font-semibold text-tp">Filter Tickets</span>
                {activeFacetCount > 0 && (
                  <button
                    type="button"
                    onClick={() => dispatch(clearFilters())}
                    className="text-[11px] text-accent hover:text-accent-hover font-medium"
                  >
                    Reset all
                  </button>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-tm mb-1">Priority</label>
                <select
                  value={filters.priority}
                  onChange={(e) =>
                    dispatch(setFilters({ priority: e.target.value as 'ALL' | TicketPriority }))
                  }
                  className="w-full h-7 px-2 rounded-md bg-surface border border-border text-xs text-tp focus:outline-none"
                >
                  <option value="ALL">All priorities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-tm mb-1">Assignee</label>
                <select
                  value={filters.assigneeId}
                  onChange={(e) => dispatch(setFilters({ assigneeId: e.target.value }))}
                  className="w-full h-7 px-2 rounded-md bg-surface border border-border text-xs text-tp focus:outline-none"
                >
                  <option value="ALL">All assignees</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.username || m.user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-tm mb-1">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => dispatch(setFilters({ type: e.target.value }))}
                  className="w-full h-7 px-2 rounded-md bg-surface border border-border text-xs text-tp focus:outline-none"
                >
                  <option value="ALL">All types</option>
                  <option value="Feature">Feature</option>
                  <option value="Bug">Bug</option>
                  <option value="Task">Task</option>
                  <option value="Improvement">Improvement</option>
                </select>
              </div>

              {sprints.length > 0 && (
                <div>
                  <label className="block text-[11px] font-medium text-tm mb-1">Sprint</label>
                  <select
                    value={filters.sprint}
                    onChange={(e) => dispatch(setFilters({ sprint: e.target.value }))}
                    className="w-full h-7 px-2 rounded-md bg-surface border border-border text-xs text-tp focus:outline-none"
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

              <div className="pt-2 border-t border-divider space-y-1.5">
                {currentUserId && (
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-ts">
                    <input
                      type="checkbox"
                      checked={filters.assignedToMe}
                      onChange={(e) => dispatch(setFilters({ assignedToMe: e.target.checked }))}
                      className="rounded border-border text-accent focus:ring-accent/30"
                    />
                    <span>Assigned to me (M)</span>
                  </label>
                )}
                <label className="flex items-center gap-2 cursor-pointer text-xs text-ts">
                  <input
                    type="checkbox"
                    checked={filters.urgentOnly}
                    onChange={(e) => dispatch(setFilters({ urgentOnly: e.target.checked }))}
                    className="rounded border-border text-danger focus:ring-danger/30"
                  />
                  <span>Urgent only (U)</span>
                </label>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          className="h-7 px-2.5 rounded-lg bg-surface border border-border/80 hover:bg-elevated text-ts hover:text-tp text-xs font-medium flex items-center gap-1 transition-colors"
          title="Sort"
        >
          <ArrowUpDown className="h-[14px] w-[14px]" />
          <span>Sort</span>
        </button>

        <button
          type="button"
          className="h-7 px-2.5 rounded-lg bg-surface border border-border/80 hover:bg-elevated text-ts hover:text-tp text-xs font-medium flex items-center gap-1 transition-colors"
          title="Group by status"
        >
          <Rows3 className="h-[14px] w-[14px]" />
          <span className="hidden lg:inline">Group: Status</span>
          <ChevronDown className="h-[13px] w-[13px]" />
        </button>

        {projectSlug && (
          <Link
            href={`/projects/${projectSlug}/plan`}
            className="h-7 px-2.5 rounded-lg bg-surface border border-border/80 hover:bg-elevated text-ts hover:text-tp text-xs font-medium flex items-center gap-1 transition-colors"
            title="Sprint Automations"
          >
            <Zap className="h-[14px] w-[14px] text-warning" />
            <span className="hidden xl:inline">Automations</span>
          </Link>
        )}

        <button
          type="button"
          onClick={onOpenPreferences}
          className="w-7 h-7 rounded-lg bg-surface border border-border/80 hover:bg-elevated text-ts hover:text-tp flex items-center justify-center transition-colors"
          title="Column & Workflow Settings"
        >
          <SlidersHorizontal className="h-[15px] w-[15px]" />
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => dispatch(clearFilters())}
            className="text-xs text-tm hover:text-tp transition-colors flex items-center gap-1"
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
