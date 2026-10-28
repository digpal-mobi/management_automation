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
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Ticket, TicketStatus, TicketPriority, Project, ProjectMember, BoardColumn } from '@/types';
import { Column } from './Column';
import { TicketCard } from './TicketCard';
import { BoardFilters } from './BoardFilters';
import { CreateTicketModal } from '../ticket/CreateTicketModal';
import { TicketDetailModal } from '../ticket/TicketDetailModal';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { setFilters, clearFilters } from '@/store/boardSlice';
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
import Link from 'next/link';
import {
  Plus,
  Kanban,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Columns3,
  AlertTriangle,
  CalendarClock,
  Layers,
  Sliders,
  Edit2,
  Trash2,
  Search,
  X,
  Check,
  CheckCircle2,
  Clock,
  Radio,
  Wifi,
} from 'lucide-react';
import { boardApi, ticketsApi } from '@/lib/api';
import { socketClient } from '@/lib/socket';

interface BoardProps {
  projectId: string;
  project: Project;
  initialColumns?: BoardColumn[];
  initialTickets?: Ticket[];
  members?: ProjectMember[];
}

export function Board({
  projectId,
  project,
  initialColumns,
  initialTickets = [],
  members = [],
}: BoardProps) {
  const { user, fetchWithAuth } = useAuth();
  const { can } = usePermissions(projectId);
  const dispatch = useAppDispatch();
  const { filters } = useAppSelector((state) => state.board);

  // Board Title state with inline editing affordance
  const [boardTitle, setBoardTitle] = useState(project.name || 'Core Platform Delivery Pipeline');
  const [isEditingBoardTitle, setIsEditingBoardTitle] = useState(false);
  const [tempBoardTitle, setTempBoardTitle] = useState(boardTitle);

  // Layout View Mode (Kanban vs Compact layout)
  const [isCompact, setIsCompact] = useState(false);

  // Real-time latency & sync state
  const [syncStatus, setSyncStatus] = useState<'saved' | 'syncing' | 'error'>('saved');
  const [latencyMs, setLatencyMs] = useState(24);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(true);

  // Board columns state (initialized with SSR data)
  const [columns, setColumns] = useState<BoardColumn[]>(() => {
    if (initialColumns && initialColumns.length > 0) {
      return [...initialColumns].sort((a, b) => a.position - b.position);
    }
    return [];
  });

  // Tickets state
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    if (initialTickets && initialTickets.length > 0) return initialTickets;
    if (initialColumns && initialColumns.length > 0) {
      return initialColumns.flatMap((c) => c.tickets || []);
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(!(initialColumns && initialColumns.length > 0));
  const [semanticResults, setSemanticResults] = useState<Ticket[] | null>(null);

  // Horizontal scroll container ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Drag state (Column or Ticket)
  const [activeDragItem, setActiveDragItem] = useState<{
    type: 'Column' | 'Ticket';
    item: BoardColumn | Ticket;
  } | null>(null);

  // Modals state
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [createInitialColumnId, setCreateInitialColumnId] = useState<string | undefined>(undefined);
  const [createInitialStatus, setCreateInitialStatus] = useState<TicketStatus>('To Do');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Quick edit ticket title modal
  const [quickEditTicket, setQuickEditTicket] = useState<Ticket | null>(null);
  const [quickEditTitle, setQuickEditTitle] = useState('');
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
  const [isSavingQuickEdit, setIsSavingQuickEdit] = useState(false);

  // Delete ticket confirmation modal
  const [deletingTicket, setDeletingTicket] = useState<Ticket | null>(null);
  const [isDeleteTicketOpen, setIsDeleteTicketOpen] = useState(false);
  const [isDeletingTicket, setIsDeletingTicket] = useState(false);

  // Column management modals
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');
  const [newColCategory, setNewColCategory] = useState<string>('To Do');
  const [newColWip, setNewColWip] = useState<string>('0');
  const [newColColor, setNewColColor] = useState<string>('#526174');
  const [isAddingCol, setIsAddingCol] = useState(false);

  const [isEditColumnOpen, setIsEditColumnOpen] = useState(false);
  const [editingCol, setEditingCol] = useState<BoardColumn | null>(null);
  const [editColName, setEditColName] = useState('');
  const [editColDesc, setEditColDesc] = useState('');
  const [editColCategory, setEditColCategory] = useState<string>('To Do');
  const [editColWip, setEditColWip] = useState<string>('0');
  const [editColColor, setEditColColor] = useState<string>('#526174');
  const [isUpdatingCol, setIsUpdatingCol] = useState(false);

  // Configure WIP Limit Dialog
  const [wipConfigCol, setWipConfigCol] = useState<BoardColumn | null>(null);
  const [wipLimitInput, setWipLimitInput] = useState('0');
  const [isWipDialogOpen, setIsWipDialogOpen] = useState(false);
  const [isSavingWip, setIsSavingWip] = useState(false);

  // Delete Column Modal (with fallback migration safeguard)
  const [isDeleteColumnOpen, setIsDeleteColumnOpen] = useState(false);
  const [deletingCol, setDeletingCol] = useState<BoardColumn | null>(null);
  const [fallbackColumnId, setFallbackColumnId] = useState<string>('');
  const [isDeletingCol, setIsDeletingCol] = useState(false);

  // Display Preferences Modal
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  // Horizontal scroll buttons detection
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

  // Fetch full board data
  const fetchBoardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await boardApi.getBoard(projectId);
      if (res.success && res.board) {
        const sortedCols = [...(res.board.columns || [])].sort((a, b) => a.position - b.position);
        setColumns(sortedCols);
        const allTickets =
          res.tickets && res.tickets.length > 0
            ? res.tickets
            : sortedCols.flatMap((c: any) => c.tickets || []);
        setTickets(allTickets);
      }
    } catch (err) {
      console.error('Failed to load board data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Initial SSR mount check
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (initialColumns && initialColumns.length > 0) {
        return;
      }
    }
    fetchBoardData();
  }, [fetchBoardData, initialColumns]);

  // Real-time Socket Connection
  useEffect(() => {
    try {
      const socket = socketClient.connect();
      socketClient.joinProject(projectId);

      const handleConnect = () => {
        setIsRealtimeConnected(true);
        setLatencyMs(Math.floor(Math.random() * 15) + 18);
      };

      const handleDisconnect = () => {
        setIsRealtimeConnected(false);
      };

      const handleTicketCreated = (newTicket: Ticket) => {
        setTickets((prev) => {
          if (prev.some((t) => t.id === newTicket.id)) return prev;
          return [newTicket, ...prev];
        });
      };

      const handleTicketUpdated = (updatedTicket: Ticket) => {
        setTickets((prev) =>
          prev.map((t) => (t.id === updatedTicket.id ? { ...t, ...updatedTicket } : t))
        );
      };

      const handleTicketDeleted = (data: { ticketId: string }) => {
        setTickets((prev) => prev.filter((t) => t.id !== data.ticketId));
      };

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('ticket:created', handleTicketCreated);
      socket.on('ticket:updated', handleTicketUpdated);
      socket.on('ticket:deleted', handleTicketDeleted);

      return () => {
        socketClient.leaveProject(projectId);
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('ticket:created', handleTicketCreated);
        socket.off('ticket:updated', handleTicketUpdated);
        socket.off('ticket:deleted', handleTicketDeleted);
      };
    } catch (err) {
      console.warn('Real-time socket initialization failed:', err);
    }
  }, [projectId]);

  // Semantic search with debounce
  useEffect(() => {
    if (!filters.isSemantic || !filters.search.trim()) {
      setSemanticResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const query = encodeURIComponent(filters.search.trim());
        const res = await fetchWithAuth(`/api/projects/${projectId}/tickets/search?q=${query}`);
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

  // Filtered tickets calculation
  const filteredTickets = useMemo(() => {
    const sourceList = semanticResults !== null ? semanticResults : tickets;

    return sourceList.filter((ticket) => {
      // Text Search
      if (!filters.isSemantic && filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const matchTitle = ticket.title.toLowerCase().includes(q);
        const matchDesc = ticket.description?.toLowerCase().includes(q);
        const matchCandidate = ticket.sourceCandidateId?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCandidate) return false;
      }

      // Priority
      if (filters.priority !== 'ALL' && ticket.priority !== filters.priority) {
        return false;
      }

      // Type
      if (filters.type !== 'ALL' && ticket.type !== filters.type) {
        return false;
      }

      // Assignee
      if (filters.assigneeId !== 'ALL' && ticket.assigneeId !== filters.assigneeId) {
        return false;
      }

      // Sprint
      if (filters.sprint && filters.sprint !== 'ALL' && ticket.sprint !== filters.sprint) {
        return false;
      }

      // Quick filter: Assigned to me
      if (filters.assignedToMe && user) {
        const isAssigned =
          ticket.assigneeId === user.id ||
          ticket.assignee?.email === user.email ||
          ticket.assignee?.username === user.username;
        if (!isAssigned) return false;
      }

      // Quick filter: Urgent only
      if (filters.urgentOnly) {
        if (ticket.priority !== 'Critical' && ticket.priority !== 'High') {
          return false;
        }
      }

      return true;
    });
  }, [tickets, semanticResults, filters, user]);

  // Sprints list
  const availableSprints = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((t) => {
      if (t.sprint) set.add(t.sprint);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [tickets]);

  // Group tickets by columnId
  const columnTicketsMap = useMemo(() => {
    const map: Record<string, Ticket[]> = {};
    for (const col of columns) {
      map[col.id] = [];
    }

    const defaultCol = columns[0];

    filteredTickets.forEach((ticket) => {
      if (ticket.columnId && map[ticket.columnId]) {
        map[ticket.columnId].push(ticket);
      } else if (defaultCol) {
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

  // Stats calculation: total tickets and story points velocity
  const stats = useMemo(() => {
    const totalCount = tickets.length;
    let totalPts = 0;
    let completedPts = 0;

    tickets.forEach((t) => {
      const pts = t.storyPoints || 0;
      totalPts += pts;
      if (t.status === 'Done') {
        completedPts += pts;
      }
    });

    return { totalCount, totalPts, completedPts };
  }, [tickets]);

  // Drag and Drop Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;

    if (activeData?.type === 'Column') {
      const col = columns.find((c) => c.id === active.id);
      if (col) setActiveDragItem({ type: 'Column', item: col });
    } else {
      const ticket = tickets.find((t) => t.id === active.id);
      if (ticket) setActiveDragItem({ type: 'Ticket', item: ticket });
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeType = active.data.current?.type;
    if (activeType === 'Column') return; // Column sorting handled in onDragEnd

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTicket = tickets.find((t) => t.id === activeId);
    if (!activeTicket) return;

    // Determine target column
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
    setActiveDragItem(null);

    if (!over) return;

    const activeType = active.data.current?.type;

    // CASE 1: Dragging a Column
    if (activeType === 'Column') {
      const activeId = active.id as string;
      const overId = over.id as string;

      if (activeId !== overId) {
        const oldIndex = columns.findIndex((c) => c.id === activeId);
        const newIndex = columns.findIndex((c) => c.id === overId);

        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = [...columns];
          const [moved] = reordered.splice(oldIndex, 1);
          reordered.splice(newIndex, 0, moved);

          // Update positions
          const updated = reordered.map((col, idx) => ({ ...col, position: idx }));
          setColumns(updated);

          setSyncStatus('syncing');
          try {
            const columnOrders = updated.map((c) => ({ id: c.id, position: c.position }));
            await boardApi.reorderColumns(projectId, updated.map((c) => c.id));
            setSyncStatus('saved');
          } catch (err: any) {
            console.error('Failed to reorder columns:', err);
            toast.error('Failed to save column reordering');
            setSyncStatus('error');
            fetchBoardData(); // Revert
          }
        }
      }
      return;
    }

    // CASE 2: Dragging a Ticket
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

    // Get all tickets in target column
    const colTickets = tickets.filter(
      (t) => t.columnId === targetCol!.id || (!t.columnId && targetCol!.position === 0)
    );
    const targetCategory = targetCol.category;

    // Calculate executionOrder
    const targetExecutionOrder = colTickets.length;

    // Optimistic update
    setTickets((prev) =>
      prev.map((t) =>
        t.id === activeId
          ? {
              ...t,
              columnId: targetCol!.id,
              status: targetCategory,
              executionOrder: targetExecutionOrder,
            }
          : t
      )
    );

    setSyncStatus('syncing');
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}/tickets/${activeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          columnId: targetCol.id,
          status: targetCategory,
          executionOrder: targetExecutionOrder,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error('Failed to move ticket');
        setSyncStatus('error');
        fetchBoardData(); // Revert
      } else {
        setSyncStatus('saved');
      }
    } catch (err) {
      console.error('Error saving ticket move:', err);
      toast.error('Failed to save ticket movement');
      setSyncStatus('error');
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

  // Ticket Modal Handlers
  const handleOpenDetail = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsDetailOpen(true);
  };

  const handleTicketCreated = (newTicket: Ticket) => {
    setTickets((prev) => [newTicket, ...prev]);
  };

  const handleTicketUpdated = (updatedTicket: Ticket) => {
    setTickets((prev) => prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t)));
    setSelectedTicket(updatedTicket);
  };

  const handleTicketDeleted = (ticketId: string) => {
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    setIsDetailOpen(false);
    setSelectedTicket(null);
  };

  // Quick Edit Ticket Title
  const handleOpenQuickEdit = (ticket: Ticket) => {
    setQuickEditTicket(ticket);
    setQuickEditTitle(ticket.title);
    setIsQuickEditOpen(true);
  };

  const handleSaveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEditTicket || !quickEditTitle.trim()) return;

    try {
      setIsSavingQuickEdit(true);
      const res = await ticketsApi.update(projectId, quickEditTicket.id, {
        title: quickEditTitle.trim(),
      });

      if (res.success && res.ticket) {
        toast.success('Ticket title updated');
        handleTicketUpdated(res.ticket);
        setIsQuickEditOpen(false);
        setQuickEditTicket(null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update title');
    } finally {
      setIsSavingQuickEdit(false);
    }
  };

  // Ticket Context Actions
  const handleChangeTicketStatus = async (
    ticket: Ticket,
    newStatus: TicketStatus,
    targetColId?: string
  ) => {
    const matchedCol = targetColId
      ? columns.find((c) => c.id === targetColId)
      : columns.find((c) => c.category === newStatus);

    const columnId = matchedCol?.id || ticket.columnId;

    // Optimistic
    setTickets((prev) =>
      prev.map((t) => (t.id === ticket.id ? { ...t, status: newStatus, columnId } : t))
    );

    try {
      await ticketsApi.update(projectId, ticket.id, {
        status: newStatus,
        columnId,
      });
      toast.success(`Moved to ${newStatus}`);
    } catch (err: any) {
      toast.error('Failed to change ticket status');
      fetchBoardData();
    }
  };

  const handleChangeTicketPriority = async (ticket: Ticket, newPriority: TicketPriority) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticket.id ? { ...t, priority: newPriority } : t))
    );

    try {
      await ticketsApi.update(projectId, ticket.id, {
        priority: newPriority,
      });
      toast.success(`Priority set to ${newPriority}`);
    } catch (err: any) {
      toast.error('Failed to update priority');
      fetchBoardData();
    }
  };

  const handleAssignTicket = async (ticket: Ticket, userId: string | null) => {
    const assignedMember = members.find((m) => m.userId === userId);
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticket.id
          ? {
              ...t,
              assigneeId: userId,
              assignee: assignedMember ? (assignedMember.user as any) : null,
            }
          : t
      )
    );

    try {
      await ticketsApi.update(projectId, ticket.id, {
        assigneeId: userId,
      });
      toast.success(userId ? 'Ticket assigned' : 'Ticket unassigned');
    } catch (err: any) {
      toast.error('Failed to update assignment');
      fetchBoardData();
    }
  };

  const handleDuplicateTicket = async (ticket: Ticket) => {
    try {
      const res = await ticketsApi.create(projectId, {
        title: `${ticket.title} (Copy)`,
        description: ticket.description,
        priority: ticket.priority,
        type: ticket.type,
        status: ticket.status,
        columnId: ticket.columnId,
        assigneeId: ticket.assigneeId,
        storyPoints: ticket.storyPoints,
      });

      if (res.success && res.ticket) {
        toast.success('Ticket duplicated');
        handleTicketCreated(res.ticket);
      }
    } catch (err: any) {
      toast.error('Failed to duplicate ticket');
    }
  };

  const handleDeleteTicketClick = (ticket: Ticket) => {
    setDeletingTicket(ticket);
    setIsDeleteTicketOpen(true);
  };

  const handleConfirmDeleteTicket = async () => {
    if (!deletingTicket) return;
    try {
      setIsDeletingTicket(true);
      const res = await ticketsApi.delete(projectId, deletingTicket.id);
      if (res.success) {
        toast.success('Ticket deleted');
        handleTicketDeleted(deletingTicket.id);
        setIsDeleteTicketOpen(false);
        setDeletingTicket(null);
      }
    } catch (err: any) {
      toast.error('Failed to delete ticket');
    } finally {
      setIsDeletingTicket(false);
    }
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
      const parsedWip = parseInt(newColWip, 10);
      const res = await boardApi.createColumn(projectId, {
        name: newColName.trim(),
        description: newColDesc.trim() || null,
        category: newColCategory,
        color: newColColor || '#526174',
        wipLimit: isNaN(parsedWip) ? 0 : parsedWip,
      });

      if (res.success && res.column) {
        toast.success(`Column "${res.column.name}" added`);
        setNewColName('');
        setNewColDesc('');
        setNewColCategory('To Do');
        setNewColWip('0');
        setIsAddColumnOpen(false);
        fetchBoardData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create column');
    } finally {
      setIsAddingCol(false);
    }
  };

  // Column Actions: Inline Rename
  const handleRenameColumnInline = async (col: BoardColumn, newName: string) => {
    if (!newName.trim() || newName.trim() === col.name) return;

    // Optimistic
    setColumns((prev) =>
      prev.map((c) => (c.id === col.id ? { ...c, name: newName.trim() } : c))
    );

    try {
      await boardApi.updateColumn(projectId, col.id, { name: newName.trim() });
      toast.success(`Column renamed to "${newName.trim()}"`);
    } catch (err: any) {
      toast.error('Failed to rename column');
      fetchBoardData();
    }
  };

  // Column Actions: Edit Column
  const handleOpenEditColumn = (col: BoardColumn) => {
    setEditingCol(col);
    setEditColName(col.name);
    setEditColDesc(col.description || '');
    setEditColCategory(col.category);
    setEditColWip(String(col.wipLimit ?? 0));
    setEditColColor(col.color || '#526174');
    setIsEditColumnOpen(true);
  };

  const handleUpdateColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCol || !editColName.trim()) return;

    try {
      setIsUpdatingCol(true);
      const parsedWip = parseInt(editColWip, 10);
      const res = await boardApi.updateColumn(projectId, editingCol.id, {
        name: editColName.trim(),
        description: editColDesc.trim() || null,
        category: editColCategory as TicketStatus,
        color: editColColor,
        wipLimit: isNaN(parsedWip) ? 0 : parsedWip,
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

  // Column Actions: Configure WIP Limit
  const handleOpenConfigureWip = (col: BoardColumn) => {
    setWipConfigCol(col);
    setWipLimitInput(String(col.wipLimit ?? 0));
    setIsWipDialogOpen(true);
  };

  const handleSaveWipLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wipConfigCol) return;

    try {
      setIsSavingWip(true);
      const limit = Math.max(0, parseInt(wipLimitInput, 10) || 0);
      const res = await boardApi.updateColumn(projectId, wipConfigCol.id, {
        wipLimit: limit,
      });

      if (res.success) {
        toast.success(`WIP limit set to ${limit > 0 ? limit : '∞'} for "${wipConfigCol.name}"`);
        setIsWipDialogOpen(false);
        setWipConfigCol(null);
        fetchBoardData();
      }
    } catch (err: any) {
      toast.error('Failed to configure WIP limit');
    } finally {
      setIsSavingWip(false);
    }
  };

  // Column Actions: Duplicate Column
  const handleDuplicateColumn = async (col: BoardColumn) => {
    try {
      const res = await boardApi.duplicateColumn(projectId, col.id);
      if (res.success && res.column) {
        toast.success(`Duplicated "${col.name}" as "${res.column.name}"`);
        fetchBoardData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to duplicate column');
    }
  };

  // Column Actions: Collapse / Expand Column
  const handleToggleCollapseColumn = (col: BoardColumn) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === col.id ? { ...c, isCollapsed: !c.isCollapsed } : c))
    );
  };

  // Column Actions: Move Column Left / Right
  const handleMoveColumn = async (col: BoardColumn, direction: 'left' | 'right') => {
    const currentIndex = columns.findIndex((c) => c.id === col.id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= columns.length) return;

    const reordered = [...columns];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(newIndex, 0, moved);

    const updated = reordered.map((c, idx) => ({ ...c, position: idx }));
    setColumns(updated);

    try {
      await boardApi.reorderColumns(projectId, updated.map((c) => c.id));
    } catch (err: any) {
      toast.error('Failed to save column position');
      fetchBoardData();
    }
  };

  // Column Actions: Delete Column (with safeguard)
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

  // Board Title Inline Edit
  const handleSaveBoardTitle = () => {
    if (tempBoardTitle.trim()) {
      setBoardTitle(tempBoardTitle.trim());
      toast.success('Board name updated');
    }
    setIsEditingBoardTitle(false);
  };

  const canManageCols = can('board.manage_columns');
  const canCreateTickets = can('ticket.create');

  return (
    <div className="w-full min-w-0 flex flex-col space-y-4">
      {/* ============================================================== */}
      {/* 1. CLEAN TOP CONTEXT & BOARD HEADER                            */}
      {/* ============================================================== */}
      <section className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          {/* Title with Inline Edit Affordance */}
          <div className="flex items-center gap-2 group min-w-0">
            {isEditingBoardTitle ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={tempBoardTitle}
                  autoFocus
                  onChange={(e) => setTempBoardTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveBoardTitle();
                    if (e.key === 'Escape') {
                      setTempBoardTitle(boardTitle);
                      setIsEditingBoardTitle(false);
                    }
                  }}
                  className="h-8 px-2.5 rounded-lg border border-primary text-base font-bold text-slate-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveBoardTitle}
                  className="p-1 rounded bg-primary text-white hover:bg-primary-hover"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTempBoardTitle(boardTitle);
                    setIsEditingBoardTitle(false);
                  }}
                  className="p-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <h1
                id="board-title-text"
                onDoubleClick={() => setIsEditingBoardTitle(true)}
                className="text-lg font-bold text-slate-900 tracking-tight cursor-text hover:text-primary transition-colors truncate"
                title="Double-click to rename board"
              >
                {boardTitle}
              </h1>
            )}

            {!isEditingBoardTitle && (
              <button
                id="board-title-edit-btn"
                type="button"
                onClick={() => setIsEditingBoardTitle(true)}
                className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 opacity-40 group-hover:opacity-100 transition-opacity"
                title="Rename board"
                aria-label="Rename board"
              >
                <Edit2 className="h-3 w-3" />
              </button>
            )}

            {/* Subtle Sync Indicator */}
            {syncStatus === 'syncing' ? (
              <span className="flex items-center gap-1 text-[11px] text-amber-600 ml-1">
                <Clock className="h-3 w-3 animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
              </span>
            ) : syncStatus === 'error' ? (
              <span className="flex items-center gap-1 text-[11px] text-red-600 ml-1">
                <AlertTriangle className="h-3 w-3" />
                <span className="hidden sm:inline">Unsaved</span>
              </span>
            ) : null}
          </div>

          {/* Action Buttons: Plan Sprints & Create Ticket */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href={`/projects/${project?.slug || projectId}/plan`}>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                <span>Plan Sprints</span>
              </Button>
            </Link>

            {canCreateTickets && (
              <Button
                onClick={() => handleOpenCreateTicket()}
                variant="primary"
                size="sm"
                className="flex items-center gap-1.5 text-xs shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Ticket</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filter Control Bar */}
        <BoardFilters
          members={members}
          sprints={availableSprints}
          currentUserId={user?.id}
          searchInputRef={searchInputRef}
        />
      </section>

      {/* Semantic Search Banner */}
      {filters.isSemantic && filters.search.trim() && (
        <div className="px-4 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs text-indigo-900 shadow-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600 animate-spin" />
            <span>
              pgvector semantic search results for: <strong>&ldquo;{filters.search}&rdquo;</strong>{' '}
              ({filteredTickets.length} found)
            </span>
          </div>
          <button
            type="button"
            onClick={() => dispatch(setFilters({ search: '', isSemantic: false }))}
            className="text-indigo-700 hover:text-indigo-950 underline font-medium text-xs"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. HORIZONTALLY SCROLLABLE KANBAN COLUMNS CONTAINER           */}
      {/* ============================================================== */}
      <section className="w-full overflow-x-auto custom-scrollbar pb-12 pt-1" ref={scrollContainerRef}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="inline-flex items-start gap-4 min-w-max pb-4">
            {/* Sortable Column List */}
            <SortableContext items={columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
              {columns.map((col, index) => (
                <Column
                  key={col.id}
                  column={col}
                  tickets={columnTicketsMap[col.id] || []}
                  members={members}
                  columns={columns}
                  canManageColumns={canManageCols}
                  canCreateTicket={canCreateTickets}
                  isFirst={index === 0}
                  isLast={index === columns.length - 1}
                  isCompact={isCompact}
                  onTicketClick={handleOpenDetail}
                  onAddTicketClick={handleOpenCreateTicket}
                  onRenameColumn={handleRenameColumnInline}
                  onEditColumn={handleOpenEditColumn}
                  onConfigureWip={handleOpenConfigureWip}
                  onDuplicateColumn={handleDuplicateColumn}
                  onDeleteColumn={handleOpenDeleteColumn}
                  onMoveColumnLeft={(c) => handleMoveColumn(c, 'left')}
                  onMoveColumnRight={(c) => handleMoveColumn(c, 'right')}
                  onToggleCollapse={handleToggleCollapseColumn}
                  onEditTicketTitle={handleOpenQuickEdit}
                  onChangeTicketStatus={handleChangeTicketStatus}
                  onChangeTicketPriority={handleChangeTicketPriority}
                  onAssignTicket={handleAssignTicket}
                  onDuplicateTicket={handleDuplicateTicket}
                  onDeleteTicket={handleDeleteTicketClick}
                />
              ))}
            </SortableContext>

            {/* + Add Custom Column CTA Button at the end of columns row (Stitch Column 6) */}
            {canManageCols && (
              <div className="w-[280px] flex-shrink-0 pt-0.5">
                <button
                  type="button"
                  onClick={() => setIsAddColumnOpen(true)}
                  className="w-full h-12 rounded-xl bg-slate-100 hover:bg-slate-200/90 text-slate-600 hover:text-slate-900 font-medium text-xs flex items-center justify-center gap-2 shadow-sm transition-all border border-slate-200/80 group"
                >
                  <Plus className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                  <span>Add column</span>
                </button>
              </div>
            )}
          </div>

          {/* Elevated Drag Overlay Preview */}
          <DragOverlay>
            {activeDragItem?.type === 'Ticket' ? (
              <div className="w-80 pointer-events-none opacity-95 shadow-2xl rotate-[-2deg] scale-[1.02]">
                <TicketCard ticket={activeDragItem.item as Ticket} isOverlay />
              </div>
            ) : activeDragItem?.type === 'Column' ? (
              <div className="w-[316px] pointer-events-none opacity-90 shadow-2xl scale-[1.02]">
                <div className="p-3 bg-white rounded-xl border-2 border-primary shadow-xl">
                  <h3 className="font-bold text-xs uppercase text-primary">
                    {(activeDragItem.item as BoardColumn).name}
                  </h3>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </section>



      {/* ============================================================== */}
      {/* 4. DIALOGS & MODALS                                            */}
      {/* ============================================================== */}

      {/* DIALOG: ADD COLUMN */}
      <Dialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Columns3 className="h-5 w-5 text-primary" />
              <span>Add Custom Column</span>
            </DialogTitle>
            <DialogDescription>
              Create a new workflow stage for this project board with configurable WIP limit.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddColumn} className="space-y-3.5 pt-2">
            <Input
              label="Column Name *"
              placeholder="e.g. Backlog, In Review, QA Testing"
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

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Workflow Category *"
                value={newColCategory}
                onChange={(e) => setNewColCategory(e.target.value)}
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </Select>

              <Input
                label="WIP Limit (0 = ∞)"
                type="number"
                min="0"
                max="99"
                value={newColWip}
                onChange={(e) => setNewColWip(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Column Indicator Color
              </label>
              <div className="flex items-center gap-2">
                {['#526174', '#003049', '#669BBC', '#C1121F', '#15803D', '#7C3AED', '#EA580C'].map(
                  (c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        newColColor === c ? 'scale-110 border-slate-900 ring-2 ring-primary/20' : 'border-white'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  )
                )}
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
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

      {/* DIALOG: EDIT COLUMN */}
      <Dialog open={isEditColumnOpen} onOpenChange={setIsEditColumnOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Columns3 className="h-5 w-5 text-primary" />
              <span>Edit Column: {editingCol?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Update column attributes, category, and WIP limits.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateColumn} className="space-y-3.5 pt-2">
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

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Workflow Category *"
                value={editColCategory}
                onChange={(e) => setEditColCategory(e.target.value)}
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </Select>

              <Input
                label="WIP Limit (0 = ∞)"
                type="number"
                min="0"
                max="99"
                value={editColWip}
                onChange={(e) => setEditColWip(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Column Indicator Color
              </label>
              <div className="flex items-center gap-2">
                {['#526174', '#003049', '#669BBC', '#C1121F', '#15803D', '#7C3AED', '#EA580C'].map(
                  (c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        editColColor === c ? 'scale-110 border-slate-900 ring-2 ring-primary/20' : 'border-white'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  )
                )}
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
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

      {/* DIALOG: CONFIGURE WIP LIMIT */}
      <Dialog open={isWipDialogOpen} onOpenChange={setIsWipDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-primary" />
              <span>Configure WIP Limit</span>
            </DialogTitle>
            <DialogDescription>
              Set maximum allowed concurrent tickets in &ldquo;{wipConfigCol?.name}&rdquo;.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveWipLimit} className="space-y-4 pt-2">
            <Input
              label="Maximum Tickets (0 for unlimited)"
              type="number"
              min="0"
              max="99"
              value={wipLimitInput}
              onChange={(e) => setWipLimitInput(e.target.value)}
              required
            />
            <p className="text-xs text-slate-500">
              When tickets in this column exceed this limit, the column header displays an active WIP
              warning banner.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsWipDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSavingWip}>
                Save Limit
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: DELETE COLUMN (SAFEGUARD WITH TICKET MIGRATION) */}
      <Dialog open={isDeleteColumnOpen} onOpenChange={setIsDeleteColumnOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span>Delete Column: {deletingCol?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this column from the project board?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 pt-2">
            {deletingCol && (columnTicketsMap[deletingCol.id]?.length || 0) > 0 ? (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-slate-800 space-y-2.5">
                <p className="font-semibold text-red-700">
                  ⚠️ This column currently contains {columnTicketsMap[deletingCol.id]?.length}{' '}
                  ticket(s).
                </p>
                <p className="text-slate-600">
                  To protect your data, choose a destination column to migrate these tickets to
                  before deletion:
                </p>

                <Select
                  label="Destination Fallback Column *"
                  value={fallbackColumnId}
                  onChange={(e) => setFallbackColumnId(e.target.value)}
                >
                  {columns
                    .filter((c) => c.id !== deletingCol.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        Migrate to: {c.name} ({c.category})
                      </option>
                    ))}
                </Select>
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                This column contains no tickets and can be safely deleted.
              </p>
            )}

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
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

      {/* DIALOG: QUICK EDIT TICKET TITLE */}
      <Dialog open={isQuickEditOpen} onOpenChange={setIsQuickEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-primary" />
              <span>Edit Ticket Title</span>
            </DialogTitle>
            <DialogDescription>Update the title for this card.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveQuickEdit} className="space-y-4 pt-2">
            <Input
              label="Title *"
              value={quickEditTitle}
              onChange={(e) => setQuickEditTitle(e.target.value)}
              required
              maxLength={200}
            />

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsQuickEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSavingQuickEdit}>
                Save Title
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: CONFIRM DELETE TICKET */}
      <Dialog open={isDeleteTicketOpen} onOpenChange={setIsDeleteTicketOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              <span>Delete Ticket</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletingTicket?.title}&rdquo;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteTicketOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              isLoading={isDeletingTicket}
              onClick={handleConfirmDeleteTicket}
            >
              Delete Ticket
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG: DISPLAY PREFERENCES */}
      <Dialog open={isPreferencesOpen} onOpenChange={setIsPreferencesOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-primary" />
              <span>Display Preferences</span>
            </DialogTitle>
            <DialogDescription>Configure Kanban board viewing options.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs text-slate-700">
            <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border cursor-pointer">
              <span>Compact Card Layout</span>
              <input
                type="checkbox"
                checked={isCompact}
                onChange={(e) => setIsCompact(e.target.checked)}
                className="h-4 w-4 text-primary rounded"
              />
            </label>
          </div>

          <div className="pt-3 flex justify-end border-t border-slate-200">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsPreferencesOpen(false)}
            >
              Done
            </Button>
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
