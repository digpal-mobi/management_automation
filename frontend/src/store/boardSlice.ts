import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Board, Column, Ticket, Project, TicketPriority } from '@/types';

export interface BoardFilters {
  search: string;
  priority: 'ALL' | TicketPriority;
  type: string;
  assigneeId: string;
  isSemantic: boolean;
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
    type: 'ALL',
    assigneeId: 'ALL',
    isSemantic: false,
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

      if (state.activeTicket && action.payload.board.columns) {
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
        type: 'ALL',
        assigneeId: 'ALL',
        isSemantic: false,
      };
    },
    moveTicketOptimistic: (
      state,
      action: PayloadAction<{
        ticketId: string;
        targetStatus: 'To Do' | 'In Progress' | 'Done';
      }>
    ) => {
      if (!state.board?.columns) return;
      const { ticketId, targetStatus } = action.payload;

      let foundTicket: Ticket | null = null;
      for (const col of state.board.columns) {
        const idx = col.tickets.findIndex((t) => t.id === ticketId);
        if (idx !== -1) {
          foundTicket = { ...col.tickets[idx], status: targetStatus };
          col.tickets.splice(idx, 1);
          break;
        }
      }

      if (foundTicket) {
        const targetCol = state.board.columns.find((c) => c.name === targetStatus);
        if (targetCol) {
          targetCol.tickets.push(foundTicket);
        }
        if (state.activeTicket?.id === ticketId) {
          state.activeTicket.status = targetStatus;
        }
      }
    },
    updateTicketLocal: (state, action: PayloadAction<Ticket>) => {
      if (!state.board?.columns) return;
      const updated = action.payload;

      for (const col of state.board.columns) {
        const idx = col.tickets.findIndex((t) => t.id === updated.id);
        if (idx !== -1) {
          if (col.name === updated.status) {
            col.tickets[idx] = updated;
          } else {
            col.tickets.splice(idx, 1);
            const targetCol = state.board.columns.find((c) => c.name === updated.status);
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
    addTicketLocal: (state, action: PayloadAction<Ticket>) => {
      if (!state.board?.columns) return;
      const ticket = action.payload;
      const targetCol = state.board.columns.find((c) => c.name === ticket.status);
      if (targetCol) {
        targetCol.tickets.unshift(ticket);
      }
    },
    removeTicketLocal: (state, action: PayloadAction<string>) => {
      if (!state.board?.columns) return;
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
  addTicketLocal,
  removeTicketLocal,
} = boardSlice.actions;

export default boardSlice.reducer;
