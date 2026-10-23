'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Ticket, TicketStatus, Project, ProjectMember, BoardColumn } from '@/types';
import { Column } from './Column';
import { TicketCard } from './TicketCard';
import { BoardFilters } from './BoardFilters';
import { CreateTicketModal } from '../ticket/CreateTicketModal';
import { TicketDetailModal } from '../ticket/TicketDetailModal';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { setFilters } from '@/store/boardSlice';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog';
import {
  Plus,
  Kanban,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Columns3,
  AlertTriangle,
} from 'lucide-react';
import { boardApi } from '@/lib/api';

interface BoardProps {
  projectId: string;
  project: Project;
  initialTickets?: Ticket[];
  members?: ProjectMember[];
}

export function Board({
  projectId,
  project,
  initialTickets = [],
  members = [],
}: BoardProps) {
  const { fetchWithAuth } = useAuth();
  const { can } = usePermissions(projectId);
  const dispatch = useAppDispatch();
  const { filters } = useAppSelector((state) => state.board);

  // Board columns state
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [isLoading, setIsLoading] = useState(false);
  const [semanticResults, setSemanticResults] = useState<Ticket[] | null>(null);

  // Horizontal scroll container ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Drag state
  const [activeDragTicket, setActiveDragTicket] = useState<Ticket | null>(null);

  // Modals state
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [createInitialColumnId, setCreateInitialColumnId] = useState<string | undefined>(undefined);
  const [createInitialStatus, setCreateInitialStatus] = useState<TicketStatus>('To Do');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Column management modals
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');
  const [newColCategory, setNewColCategory] = useState<string>('To Do');
  const [isAddingCol, setIsAddingCol] = useState(false);

  const [isEditColumnOpen, setIsEditColumnOpen] = useState(false);
  const [editingCol, setEditingCol] = useState<BoardColumn | null>(null);
  const [editColName, setEditColName] = useState('');
  const [editColDesc, setEditColDesc] = useState('');
  const [editColCategory, setEditColCategory] = useState<string>('To Do');
  const [isUpdatingCol, setIsUpdatingCol] = useState(false);

  const [isDeleteColumnOpen, setIsDeleteColumnOpen] = useState(false);
  const [deletingCol, setDeletingCol] = useState<BoardColumn | null>(null);
  const [fallbackColumnId, setFallbackColumnId] = useState<string>('');
  const [isDeletingCol, setIsDeletingCol] = useState(false);

  // Check scroll capability
  const updateScrollButtons = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [columns, updateScrollButtons]);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -340, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 340, behavior: 'smooth' });
    }
  };

  // Fetch full board data including dynamic columns & tickets
  const fetchBoardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await boardApi.getBoard(projectId);
      if (res.success && res.board) {
        const sortedCols = [...(res.board.columns || [])].sort((a, b) => a.position - b.position);
        setColumns(sortedCols);
        setTickets(res.tickets || []);
      }
    } catch (err) {
      console.error('Failed to load board data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

  // Semantic search handler with debounce
  useEffect(() => {
    if (!filters.isSemantic || !filters.search.trim()) {
      setSemanticResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const query = encodeURIComponent(filters.search.trim());
        const res = await fetchWithAuth(
          `/api/projects/${projectId}/tickets/search?q=${query}`
        );
        const data = await res.json();
        if (res.ok && data.success) {
          setSemanticResults(data.tickets);
        }
      } catch (err) {
        console.error('Semantic search error:', err);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [filters.search, filters.isSemantic, projectId, fetchWithAuth]);

  // Sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    const sourceList = semanticResults !== null ? semanticResults : tickets;

    return sourceList.filter((ticket) => {
      // Search filter
      if (!filters.isSemantic && filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const matchTitle = ticket.title.toLowerCase().includes(q);
        const matchDesc = ticket.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }

      // Priority filter
      if (filters.priority !== 'ALL' && ticket.priority !== filters.priority) {
        return false;
      }

      // Type filter
      if (filters.type !== 'ALL' && ticket.type !== filters.type) {
        return false;
      }

      // Assignee filter
      if (filters.assigneeId !== 'ALL' && ticket.assigneeId !== filters.assigneeId) {
        return false;
      }

      return true;
    });
  }, [tickets, semanticResults, filters]);

  // Group tickets by columnId
  const columnTicketsMap = useMemo(() => {
    const map: Record<string, Ticket[]> = {};
    for (const col of columns) {
      map[col.id] = [];
    }

    // Default column if ticket has null columnId or points to non-existent column
    const defaultCol = columns[0];

    filteredTickets.forEach((ticket) => {
      if (ticket.columnId && map[ticket.columnId]) {
        map[ticket.columnId].push(ticket);
      } else if (defaultCol) {
        // Fallback by status category
        const matchingCol = columns.find((c) => c.category === ticket.status);
        if (matchingCol && map[matchingCol.id]) {
          map[matchingCol.id].push(ticket);
        } else {
          map[defaultCol.id].push(ticket);
        }
      }
    });

    return map;
  }, [columns, filteredTickets]);

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const ticket = tickets.find((t) => t.id === active.id);
    if (ticket) {
      setActiveDragTicket(ticket);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTicket = tickets.find((t) => t.id === activeId);
    if (!activeTicket) return;

    // Is dropped over a column directly or over another ticket?
    let targetCol = columns.find((c) => c.id === overId);
    if (!targetCol) {
      const overTicket = tickets.find((t) => t.id === overId);
      if (overTicket && overTicket.columnId) {
        targetCol = columns.find((c) => c.id === overTicket.columnId);
      }
    }

    if (targetCol && activeTicket.columnId !== targetCol.id) {
      const targetCategory = targetCol.category;
      setTickets((prev) =>
        prev.map((t) =>
          t.id === activeId
            ? { ...t, columnId: targetCol!.id, status: targetCategory }
            : t
        )
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragTicket(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const currentTicket = tickets.find((t) => t.id === activeId);
    if (!currentTicket) return;

    let targetCol = columns.find((c) => c.id === overId);
    if (!targetCol) {
      const overTicket = tickets.find((t) => t.id === overId);
      if (overTicket && overTicket.columnId) {
        targetCol = columns.find((c) => c.id === overTicket.columnId);
      }
    }

    if (!targetCol) return;

    // Persist status and columnId to backend
    try {
      const res = await fetchWithAuth(
        `/api/projects/${projectId}/tickets/${activeId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            columnId: targetCol.id,
            status: targetCol.category,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error('Failed to move ticket');
        fetchBoardData(); // Revert
      }
    } catch (err) {
      console.error('Error saving ticket move:', err);
      toast.error('Failed to save ticket movement');
      fetchBoardData();
    }
  };

  // Open Create Ticket Modal for a specific column
  const handleOpenCreateTicket = (column?: BoardColumn) => {
    if (column) {
      setCreateInitialColumnId(column.id);
      setCreateInitialStatus(column.category);
    } else {
      setCreateInitialColumnId(columns[0]?.id);
      setCreateInitialStatus(columns[0]?.category || 'To Do');
    }
    setIsCreateTicketOpen(true);
  };

  // Open Detail Modal
  const handleOpenDetail = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsDetailOpen(true);
  };

  // Ticket Created Callback
  const handleTicketCreated = (newTicket: Ticket) => {
    setTickets((prev) => [newTicket, ...prev]);
  };

  // Ticket Updated Callback
  const handleTicketUpdated = (updatedTicket: Ticket) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
    );
    setSelectedTicket(updatedTicket);
  };

  // Ticket Deleted Callback
  const handleTicketDeleted = (ticketId: string) => {
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    setIsDetailOpen(false);
    setSelectedTicket(null);
  };

  // Column Actions: Add Column
  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) {
      toast.error('Column name is required');
      return;
    }

    try {
      setIsAddingCol(true);
      const res = await boardApi.createColumn(projectId, {
        name: newColName.trim(),
        description: newColDesc.trim() || null,
        category: newColCategory,
      });

      if (res.success && res.column) {
        toast.success(`Column "${res.column.name}" added`);
        setNewColName('');
        setNewColDesc('');
        setNewColCategory('To Do');
        setIsAddColumnOpen(false);
        fetchBoardData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create column');
    } finally {
      setIsAddingCol(false);
    }
  };

  // Column Actions: Edit Column
  const handleOpenEditColumn = (col: BoardColumn) => {
    setEditingCol(col);
    setEditColName(col.name);
    setEditColDesc(col.description || '');
    setEditColCategory(col.category);
    setIsEditColumnOpen(true);
  };

  const handleUpdateColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCol || !editColName.trim()) return;

    try {
      setIsUpdatingCol(true);
      const res = await boardApi.updateColumn(projectId, editingCol.id, {
        name: editColName.trim(),
        description: editColDesc.trim() || null,
        category: editColCategory as TicketStatus,
      });

      if (res.success) {
        toast.success(`Column "${res.column.name}" updated`);
        setIsEditColumnOpen(false);
        setEditingCol(null);
        fetchBoardData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update column');
    } finally {
      setIsUpdatingCol(false);
    }
  };

  // Column Actions: Delete Column
  const handleOpenDeleteColumn = (col: BoardColumn) => {
    setDeletingCol(col);
    const otherCols = columns.filter((c) => c.id !== col.id);
    setFallbackColumnId(otherCols[0]?.id || '');
    setIsDeleteColumnOpen(true);
  };

  const handleDeleteColumn = async () => {
    if (!deletingCol) return;

    try {
      setIsDeletingCol(true);
      const res = await boardApi.deleteColumn(
        projectId,
        deletingCol.id,
        fallbackColumnId || undefined
      );

      if (res.success) {
        toast.success(res.message || 'Column deleted');
        setIsDeleteColumnOpen(false);
        setDeletingCol(null);
        fetchBoardData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete column');
    } finally {
      setIsDeletingCol(false);
    }
  };

  // Column Actions: Reordering
  const handleMoveColumn = async (col: BoardColumn, direction: 'left' | 'right') => {
    const currentIndex = columns.findIndex((c) => c.id === col.id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= columns.length) return;

    const reordered = [...columns];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(newIndex, 0, moved);

    // Optimistic
    setColumns(reordered);

    try {
      const columnIds = reordered.map((c) => c.id);
      await boardApi.reorderColumns(projectId, columnIds);
    } catch (err: any) {
      toast.error('Failed to save column reordering');
      fetchBoardData(); // Revert
    }
  };

  const canManageCols = can('board.manage_columns');

  return (
    <div className="w-full min-w-0">
      {/* Board Header Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#17212B] flex items-center gap-2.5">
            <Kanban className="h-5 w-5 text-[#003049]" />
            <span>Interactive Kanban Board</span>
          </h2>
          <p className="text-xs text-[#526174] mt-1">
            Drag tickets across columns, add custom stages, and streamline development velocity.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Scroll Buttons for Horizontal Navigation */}
          {columns.length > 3 && (
            <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
              <button
                onClick={handleScrollLeft}
                disabled={!canScrollLeft}
                className="p-1 rounded-lg text-[#526174] hover:text-[#003049] hover:bg-[#F1F4F7] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Scroll left"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleScrollRight}
                disabled={!canScrollRight}
                className="p-1 rounded-lg text-[#526174] hover:text-[#003049] hover:bg-[#F1F4F7] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Scroll right"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Add Column Button (Authorized for Project Managers) */}
          {canManageCols && (
            <Button
              onClick={() => setIsAddColumnOpen(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Columns3 className="h-4 w-4 text-[#003049]" />
              <span>+ Add Column</span>
            </Button>
          )}

          {/* Prominent Create Ticket Button */}
          <Button
            onClick={() => handleOpenCreateTicket()}
            variant="primary"
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Ticket</span>
          </Button>
        </div>
      </div>

      {/* Board Filters & Semantic Search Bar */}
      <BoardFilters members={members} />

      {/* Semantic Search Banner */}
      {filters.isSemantic && filters.search.trim() && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-[#EFF5F9] border border-[#669BBC]/30 flex items-center justify-between text-xs text-[#003049]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#003049] animate-spin" />
            <span>
              pgvector semantic match: <strong>&ldquo;{filters.search}&rdquo;</strong> (
              {filteredTickets.length} found)
            </span>
          </div>
          <button
            onClick={() => dispatch(setFilters({ search: '', isSemantic: false }))}
            className="text-[#526174] hover:text-[#003049] underline text-[11px] font-medium transition-colors"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Dynamic Kanban Board with Dedicated Horizontal Scroll Container */}
      <div className="relative w-full min-w-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {/* Horizontally scrollable single-row container */}
          <div
            ref={scrollContainerRef}
            className="w-full overflow-x-auto custom-scrollbar flex flex-row items-start gap-5 pb-8 pt-1 px-1 scroll-smooth"
            style={{
              minWidth: 0,
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {columns.map((col, index) => (
              <Column
                key={col.id}
                column={col}
                tickets={columnTicketsMap[col.id] || []}
                canManageColumns={canManageCols}
                isFirst={index === 0}
                isLast={index === columns.length - 1}
                onTicketClick={handleOpenDetail}
                onAddTicketClick={handleOpenCreateTicket}
                onEditColumn={handleOpenEditColumn}
                onDeleteColumn={handleOpenDeleteColumn}
                onMoveColumnLeft={(c) => handleMoveColumn(c, 'left')}
                onMoveColumnRight={(c) => handleMoveColumn(c, 'right')}
              />
            ))}

            {/* In-line Quick "+ Add Column" placeholder at the end of the scroll row */}
            {canManageCols && (
              <div
                onClick={() => setIsAddColumnOpen(true)}
                className="w-[280px] min-w-[280px] h-[180px] flex-shrink-0 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#CBD5E1] hover:border-[#003049] bg-white/40 hover:bg-white text-[#526174] hover:text-[#003049] cursor-pointer transition-all shadow-sm group p-4 text-center select-none"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F1F4F7] group-hover:bg-[#EFF5F9] flex items-center justify-center text-[#526174] group-hover:text-[#003049] mb-2.5 transition-colors">
                  <Plus className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-[#17212B] group-hover:text-[#003049]">
                  + Add New Column
                </span>
                <span className="text-[11px] text-[#526174] mt-0.5">
                  Expand board workflow stages
                </span>
              </div>
            )}
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeDragTicket ? (
              <div className="w-80 pointer-events-none opacity-90 shadow-2xl">
                <TicketCard ticket={activeDragTicket} isOverlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* DIALOG 1: ADD COLUMN */}
      <Dialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Columns3 className="h-5 w-5 text-[#003049]" />
              <span>Add Board Column</span>
            </DialogTitle>
            <DialogDescription>
              Create a new custom workflow stage for this project board.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddColumn} className="space-y-4 pt-2">
            <Input
              label="Column Name *"
              placeholder="e.g. Code Review, QA Testing, Blocked"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              required
              maxLength={50}
            />

            <Textarea
              label="Description (Optional)"
              rows={2}
              placeholder="Criteria for tickets in this stage..."
              value={newColDesc}
              onChange={(e) => setNewColDesc(e.target.value)}
            />

            <Select
              label="Workflow Category *"
              value={newColCategory}
              onChange={(e) => setNewColCategory(e.target.value)}
            >
              <option value="To Do">To Do (Initial work items)</option>
              <option value="In Progress">In Progress (Active work)</option>
              <option value="Done">Done (Completed & Verified)</option>
            </Select>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E2E8F0]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddColumnOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isAddingCol}>
                Add Column
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: EDIT COLUMN */}
      <Dialog open={isEditColumnOpen} onOpenChange={setIsEditColumnOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Columns3 className="h-5 w-5 text-[#003049]" />
              <span>Edit Column: {editingCol?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Rename this column or adjust its workflow category.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateColumn} className="space-y-4 pt-2">
            <Input
              label="Column Name *"
              value={editColName}
              onChange={(e) => setEditColName(e.target.value)}
              required
              maxLength={50}
            />

            <Textarea
              label="Description (Optional)"
              rows={2}
              value={editColDesc}
              onChange={(e) => setEditColDesc(e.target.value)}
            />

            <Select
              label="Workflow Category *"
              value={editColCategory}
              onChange={(e) => setEditColCategory(e.target.value)}
            >
              <option value="To Do">To Do (Initial work items)</option>
              <option value="In Progress">In Progress (Active work)</option>
              <option value="Done">Done (Completed & Verified)</option>
            </Select>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E2E8F0]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditColumnOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isUpdatingCol}>
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: DELETE COLUMN (WITH TICKET MIGRATION FALLBACK) */}
      <Dialog open={isDeleteColumnOpen} onOpenChange={setIsDeleteColumnOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#C1121F]">
              <AlertTriangle className="h-5 w-5" />
              <span>Delete Column: {deletingCol?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this column from the board?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {deletingCol && (columnTicketsMap[deletingCol.id]?.length || 0) > 0 ? (
              <div className="p-3.5 rounded-xl bg-[#FFF5F5] border border-[#FDE8E8] text-xs text-[#17212B] space-y-3">
                <p className="font-semibold text-[#C1121F]">
                  ⚠️ This column currently contains {columnTicketsMap[deletingCol.id]?.length}{' '}
                  ticket(s).
                </p>
                <p className="text-[#526174]">
                  To prevent data loss, please select a destination column to move these tickets to
                  before deleting this column:
                </p>

                <Select
                  label="Destination Column *"
                  value={fallbackColumnId}
                  onChange={(e) => setFallbackColumnId(e.target.value)}
                >
                  {columns
                    .filter((c) => c.id !== deletingCol.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        Move to: {c.name} ({c.category})
                      </option>
                    ))}
                </Select>
              </div>
            ) : (
              <p className="text-xs text-[#526174]">
                This column has no tickets and can be safely deleted.
              </p>
            )}

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E2E8F0]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteColumnOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                isLoading={isDeletingCol}
                onClick={handleDeleteColumn}
              >
                Delete Column
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={isCreateTicketOpen}
        onClose={() => setIsCreateTicketOpen(false)}
        projectId={projectId}
        members={members}
        initialColumnId={createInitialColumnId}
        initialStatus={createInitialStatus}
        columns={columns}
        onTicketCreated={handleTicketCreated}
      />

      {/* Ticket Detail / Edit / Comments Modal */}
      <TicketDetailModal
        ticket={selectedTicket}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTicket(null);
        }}
        projectId={projectId}
        members={members}
        onTicketUpdated={handleTicketUpdated}
        onTicketDeleted={handleTicketDeleted}
      />
    </div>
  );
}
