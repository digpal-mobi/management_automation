'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Ticket, TicketStatus, Project, ProjectMember } from '@/types';
import { Column } from './Column';
import { TicketCard } from './TicketCard';
import { BoardFilters } from './BoardFilters';
import { CreateTicketModal } from '../ticket/CreateTicketModal';
import { TicketDetailModal } from '../ticket/TicketDetailModal';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { setFilters } from '@/store/boardSlice';
import { Button } from '@/components/ui/Button';
import { Plus, Kanban, Sparkles } from 'lucide-react';

interface BoardProps {
  projectId: string;
  project: Project;
  initialTickets?: Ticket[];
  members?: ProjectMember[];
}

const COLUMNS: TicketStatus[] = ['To Do', 'In Progress', 'Done'];

export function Board({
  projectId,
  project,
  initialTickets = [],
  members = [],
}: BoardProps) {
  const { fetchWithAuth } = useAuth();
  const dispatch = useAppDispatch();
  const { filters } = useAppSelector((state) => state.board);

  // Tickets state
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [isLoading, setIsLoading] = useState(false);
  const [semanticResults, setSemanticResults] = useState<Ticket[] | null>(null);

  // Drag state
  const [activeDragTicket, setActiveDragTicket] = useState<Ticket | null>(null);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createInitialStatus, setCreateInitialStatus] = useState<TicketStatus>('To Do');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch tickets for project
  const fetchTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchWithAuth(`/api/projects/${projectId}/tickets`);
      const data = await res.json();
      if (res.ok && data.success) {
        setTickets(data.tickets);
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, fetchWithAuth]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

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
      // If not using semantic search, apply text filter
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

  // Group tickets by column status
  const columnTicketsMap = useMemo(() => {
    const map: Record<TicketStatus, Ticket[]> = {
      'To Do': [],
      'In Progress': [],
      'Done': [],
    };

    filteredTickets.forEach((ticket) => {
      if (map[ticket.status]) {
        map[ticket.status].push(ticket);
      } else {
        map['To Do'].push(ticket);
      }
    });

    return map;
  }, [filteredTickets]);

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

    // Is dropped over a column directly?
    let targetStatus: TicketStatus | null = null;
    if (COLUMNS.includes(overId as TicketStatus)) {
      targetStatus = overId as TicketStatus;
    } else {
      // Over another ticket
      const overTicket = tickets.find((t) => t.id === overId);
      if (overTicket) {
        targetStatus = overTicket.status;
      }
    }

    if (targetStatus && activeTicket.status !== targetStatus) {
      setTickets((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, status: targetStatus! } : t))
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

    let targetStatus: TicketStatus = currentTicket.status;
    if (COLUMNS.includes(overId as TicketStatus)) {
      targetStatus = overId as TicketStatus;
    } else {
      const overTicket = tickets.find((t) => t.id === overId);
      if (overTicket) {
        targetStatus = overTicket.status;
      }
    }

    // Persist status change to API
    try {
      const res = await fetchWithAuth(
        `/api/projects/${projectId}/tickets/${activeId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: targetStatus }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error('Failed to move ticket');
        fetchTickets(); // Revert
      }
    } catch (err) {
      console.error('Error saving ticket move:', err);
      toast.error('Failed to save ticket movement');
      fetchTickets();
    }
  };

  // Open Create Modal
  const handleOpenCreate = (status: TicketStatus = 'To Do') => {
    setCreateInitialStatus(status);
    setIsCreateOpen(true);
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

  return (
    <div className="w-full">
      {/* Board Header Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#17212B] flex items-center gap-2.5">
            <Kanban className="h-5 w-5 text-[#003049]" />
            <span>Sprint & Task Board</span>
          </h2>
          <p className="text-xs text-[#526174] mt-1">
            Manage workflow and drag tickets across columns.
          </p>
        </div>

        {/* Prominent Create Ticket Button */}
        <Button
          onClick={() => handleOpenCreate('To Do')}
          variant="primary"
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Ticket</span>
        </Button>
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

      {/* Empty State when no tickets exist anywhere in project */}
      {tickets.length === 0 && !isLoading && (
        <div className="py-20 px-4 text-center rounded-2xl border border-dashed border-[#CBD5E1] bg-white shadow-card">
          <div className="w-12 h-12 rounded-2xl bg-[#EFF5F9] border border-[#669BBC]/30 text-[#003049] flex items-center justify-center mx-auto mb-4">
            <Kanban className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-[#17212B] mb-1">
            No tickets yet
          </h3>
          <p className="text-xs text-[#526174] max-w-sm mx-auto mb-6">
            Get started by manually creating a ticket, or generate tickets incrementally from selected roadmap features.
          </p>
          <Button
            onClick={() => handleOpenCreate('To Do')}
            variant="primary"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Create First Ticket
          </Button>
        </div>
      )}

      {/* Kanban Columns with Drag-and-Drop */}
      {tickets.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-col lg:flex-row gap-5 items-stretch pb-8 pt-1">
            {COLUMNS.map((colStatus) => (
              <Column
                key={colStatus}
                id={colStatus}
                title={colStatus}
                tickets={columnTicketsMap[colStatus]}
                onTicketClick={handleOpenDetail}
                onAddTicketClick={handleOpenCreate}
              />
            ))}
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
      )}

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        projectId={projectId}
        members={members}
        initialStatus={createInitialStatus}
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
