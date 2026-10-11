'use client';

import React, { useState, useEffect } from 'react';
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
import { Board as BoardType, Project, Ticket } from '@/types';
import { Column } from './Column';
import { TicketCard } from './TicketCard';
import { BoardFilters } from './BoardFilters';
import { TicketDetailModal } from '../ticket/TicketDetailModal';
import { useAppDispatch, useAppSelector } from '@/store/store';
import {
  setBoardData,
  moveTicketOptimistic,
  updateTicketLocal,
  removeTicketLocal,
} from '@/store/boardSlice';
import { setCurrentProject } from '@/store/projectSlice';
import { api } from '@/lib/api';
import { socketClient } from '@/lib/socket';

interface BoardProps {
  initialBoard: BoardType;
  initialProject: Project;
}

export function Board({ initialBoard, initialProject }: BoardProps) {
  const dispatch = useAppDispatch();
  const { board, project, filters, activeTicket } = useAppSelector(
    (state) => state.board
  );

  const [activeDragTicket, setActiveDragTicket] = useState<Ticket | null>(null);

  // Initialize Redux state from props
  useEffect(() => {
    dispatch(setBoardData({ board: initialBoard, project: initialProject }));
    dispatch(setCurrentProject(initialProject));
  }, [initialBoard, initialProject, dispatch]);

  // Connect WebSocket & Join Room
  useEffect(() => {
    if (!initialProject.id) return;

    socketClient.joinProject(initialProject.id);

    const socket = socketClient.getSocket();
    if (!socket) return;

    const handleTicketUpdated = (updatedTicket: Ticket) => {
      dispatch(updateTicketLocal(updatedTicket));
    };

    const handleTicketCreated = () => {
      // Refresh board data
      api.getBoard(initialProject.id).then((res) => {
        if (res.success && res.board) {
          dispatch(setBoardData({ board: res.board, project: res.project }));
        }
      });
    };

    const handleTicketDeleted = ({ ticketId }: { ticketId: string }) => {
      dispatch(removeTicketLocal(ticketId));
    };

    socket.on('ticket:updated', handleTicketUpdated);
    socket.on('ticket:created', handleTicketCreated);
    socket.on('ticket:deleted', handleTicketDeleted);

    return () => {
      socket.off('ticket:updated', handleTicketUpdated);
      socket.off('ticket:created', handleTicketCreated);
      socket.off('ticket:deleted', handleTicketDeleted);
      socketClient.leaveProject(initialProject.id);
    };
  }, [initialProject.id, dispatch]);

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

  const currentBoard = board || initialBoard;
  const currentProj = project || initialProject;

  // Filter tickets for each column
  const filteredColumns = React.useMemo(() => {
    if (!currentBoard) return [];

    return currentBoard.columns.map((col) => {
      const tickets = col.tickets.filter((ticket) => {
        // 1. Search text filter
        if (filters.search) {
          const q = filters.search.toLowerCase();
          const matchTitle = ticket.title.toLowerCase().includes(q);
          const matchDesc = ticket.description?.toLowerCase().includes(q);
          const matchTech = ticket.technicalNotes?.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchTech) return false;
        }

        // 2. Priority filter
        if (filters.priority !== 'ALL' && ticket.priority !== filters.priority) {
          return false;
        }

        // 3. Assignee filter
        if (filters.assigneeId !== 'ALL' && ticket.assigneeId !== filters.assigneeId) {
          return false;
        }

        // 4. Label filter
        if (filters.label !== 'ALL') {
          const labels = Array.isArray(ticket.labels) ? ticket.labels : [];
          if (!labels.includes(filters.label)) return false;
        }

        return true;
      });

      return {
        ...col,
        tickets,
      };
    });
  }, [currentBoard, filters]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const ticketId = active.id as string;

    // Find ticket
    for (const col of currentBoard.columns) {
      const t = col.tickets.find((t) => t.id === ticketId);
      if (t) {
        setActiveDragTicket(t);
        break;
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    // Determine target column and position
    let targetColId: string | null = null;
    let targetPos = 0;

    // Is over a column directly?
    const isOverColumn = currentBoard.columns.some((c) => c.id === overId);
    if (isOverColumn) {
      targetColId = overId;
      const targetCol = currentBoard.columns.find((c) => c.id === overId);
      targetPos = targetCol ? targetCol.tickets.length : 0;
    } else {
      // Over a ticket
      for (const col of currentBoard.columns) {
        const idx = col.tickets.findIndex((t) => t.id === overId);
        if (idx !== -1) {
          targetColId = col.id;
          targetPos = idx;
          break;
        }
      }
    }

    if (targetColId) {
      dispatch(
        moveTicketOptimistic({
          ticketId: activeId,
          targetColumnId: targetColId,
          targetPosition: targetPos,
        })
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragTicket(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find target column and target position from current state
    let targetColumnId = '';
    let targetPosition = 0;

    for (const col of currentBoard.columns) {
      const idx = col.tickets.findIndex((t) => t.id === activeId);
      if (idx !== -1) {
        targetColumnId = col.id;
        targetPosition = idx;
        break;
      }
    }

    if (targetColumnId) {
      try {
        await api.updateTicket(activeId, {
          columnId: targetColumnId,
          position: targetPosition,
        });
      } catch (err) {
        console.error('Failed to sync ticket move to API:', err);
      }
    }
  };

  return (
    <div className="w-full">
      {/* Board Filters & Search Bar */}
      <BoardFilters />

      {/* Kanban Columns Dnd Area */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-5 overflow-x-auto pb-8 pt-2 custom-scrollbar">
          {filteredColumns.map((col) => (
            <Column
              key={col.id}
              column={col}
              tickets={col.tickets}
              projectId={currentProj.id}
            />
          ))}
        </div>

        {/* Drag Overlay for smooth card preview while dragging */}
        <DragOverlay>
          {activeDragTicket ? (
            <div className="w-80 pointer-events-none">
              <TicketCard ticket={activeDragTicket} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Ticket Detail Split-Panel Modal */}
      {activeTicket && <TicketDetailModal />}
    </div>
  );
}
