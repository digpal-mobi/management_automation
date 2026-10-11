import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Board, Column, Ticket, Project, Priority } from '@/types';

export interface BoardFilters {
  search: string;
  priority: 'ALL' | Priority;
  label: string;
  assigneeId: string;
}

interface BoardState {
  board: Board | null;
  project: Project | null;
  activeTicket: Ticket | null;
  filters: BoardFilters;
  loading: boolean;
  error: string | null;
}

const initialState: BoardState = {
  board: null,
  project: null,
  activeTicket: null,
  filters: {
    search: '',
    priority: 'ALL',
    label: 'ALL',
    assigneeId: 'ALL',
  },
  loading: false,
  error: null,
};

export const boardSlice = createSlice({
  name: 'board',
  initialState,
  reducers: {
    setBoardData: (
      state,
      action: PayloadAction<{ board: Board; project: Project }>
    ) => {
      state.board = action.payload.board;
      state.project = action.payload.project;
      state.loading = false;
      state.error = null;

      // If activeTicket is open, update its reference
      if (state.activeTicket) {
        for (const col of action.payload.board.columns) {
          const found = col.tickets.find((t) => t.id === state.activeTicket?.id);
          if (found) {
            state.activeTicket = found;
            break;
          }
        }
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    setActiveTicket: (state, action: PayloadAction<Ticket | null>) => {
      state.activeTicket = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<BoardFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        search: '',
        priority: 'ALL',
        label: 'ALL',
        assigneeId: 'ALL',
      };
    },
    // Optimistic Drag-and-Drop Ticket Move
    moveTicketOptimistic: (
      state,
      action: PayloadAction<{
        ticketId: string;
        targetColumnId: string;
        targetPosition: number;
      }>
    ) => {
      if (!state.board) return;

      const { ticketId, targetColumnId, targetPosition } = action.payload;
      let ticketToMove: Ticket | null = null;
      let sourceColIndex = -1;

      // 1. Locate and remove from source column
      for (let i = 0; i < state.board.columns.length; i++) {
        const col = state.board.columns[i];
        const tIndex = col.tickets.findIndex((t) => t.id === ticketId);
        if (tIndex !== -1) {
          ticketToMove = col.tickets[tIndex];
          col.tickets.splice(tIndex, 1);
          sourceColIndex = i;
          break;
        }
      }

      if (!ticketToMove) return;

      // 2. Insert into target column
      const targetCol = state.board.columns.find((c) => c.id === targetColumnId);
      if (targetCol) {
        ticketToMove.columnId = targetColumnId;
        ticketToMove.position = targetPosition;
        targetCol.tickets.splice(targetPosition, 0, ticketToMove);

        // Reindex positions
        targetCol.tickets.forEach((t, idx) => {
          t.position = idx;
        });

        if (state.activeTicket?.id === ticketId) {
          state.activeTicket = ticketToMove;
        }
      }
    },
    updateTicketLocal: (state, action: PayloadAction<Ticket>) => {
      if (!state.board) return;
      const updated = action.payload;

      for (const col of state.board.columns) {
        const idx = col.tickets.findIndex((t) => t.id === updated.id);
        if (idx !== -1) {
          if (col.id === updated.columnId) {
            col.tickets[idx] = updated;
          } else {
            // Moved to a different column
            col.tickets.splice(idx, 1);
            const targetCol = state.board.columns.find((c) => c.id === updated.columnId);
            if (targetCol) {
              targetCol.tickets.push(updated);
            }
          }
          break;
        }
      }

      if (state.activeTicket?.id === updated.id) {
        state.activeTicket = updated;
      }
    },
    toggleChecklistLocal: (
      state,
      action: PayloadAction<{
        ticketId: string;
        type: 'acceptance' | 'pr';
        itemId: string;
      }>
    ) => {
      if (!state.board) return;
      const { ticketId, type, itemId } = action.payload;

      const updateList = (ticket: Ticket) => {
        const list = type === 'acceptance' ? ticket.acceptanceCriteria : ticket.prChecklist;
        const item = list.find((x) => x.id === itemId);
        if (item) {
          item.completed = !item.completed;
        }
      };

      for (const col of state.board.columns) {
        const t = col.tickets.find((t) => t.id === ticketId);
        if (t) {
          updateList(t);
          break;
        }
      }

      if (state.activeTicket?.id === ticketId) {
        updateList(state.activeTicket);
      }
    },
    removeTicketLocal: (state, action: PayloadAction<string>) => {
      if (!state.board) return;
      const ticketId = action.payload;

      for (const col of state.board.columns) {
        col.tickets = col.tickets.filter((t) => t.id !== ticketId);
      }

      if (state.activeTicket?.id === ticketId) {
        state.activeTicket = null;
      }
    },
  },
});

export const {
  setBoardData,
  setLoading,
  setError,
  setActiveTicket,
  setFilters,
  clearFilters,
  moveTicketOptimistic,
  updateTicketLocal,
  toggleChecklistLocal,
  removeTicketLocal,
} = boardSlice.actions;

export default boardSlice.reducer;
