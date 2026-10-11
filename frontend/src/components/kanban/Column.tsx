'use client';

import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Column as ColumnType, Ticket } from '@/types';
import { TicketCard } from './TicketCard';
import { useAppDispatch } from '@/store/store';
import { api } from '@/lib/api';
import { Plus, X, Zap } from 'lucide-react';

interface ColumnProps {
  column: ColumnType;
  tickets: Ticket[];
  projectId: string;
}

export function Column({ column, tickets, projectId }: ColumnProps) {
  const dispatch = useAppDispatch();
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setNodeRef } = useDroppable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  });

  const columnStatusColors: Record<string, { dot: string; border: string; bg: string }> = {
    Backlog: { dot: 'bg-slate-400', border: 'border-slate-800', bg: 'bg-slate-800/30' },
    'To Do': { dot: 'bg-blue-500', border: 'border-blue-500/20', bg: 'bg-blue-500/5' },
    'In Progress': { dot: 'bg-amber-500', border: 'border-amber-500/20', bg: 'bg-amber-500/5' },
    'In Review': { dot: 'bg-purple-500', border: 'border-purple-500/20', bg: 'bg-purple-500/5' },
    Done: { dot: 'bg-emerald-500', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
  };

  const statusStyle = columnStatusColors[column.name] || {
    dot: 'bg-slate-400',
    border: 'border-slate-800',
    bg: 'bg-slate-800/30',
  };

  const totalPoints = tickets.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await api.createTicket({
        projectId,
        columnId: column.id,
        title: newTitle.trim(),
        description: 'Created from Kanban board',
        storyPoints: 3,
        priority: 'MEDIUM',
        labels: ['feature'],
      });
      setNewTitle('');
      setIsAdding(false);
    } catch (err) {
      console.error('Failed to create quick ticket:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col flex-shrink-0 w-80 rounded-2xl border ${statusStyle.border} bg-slate-950/60 p-3 shadow-lg backdrop-blur-sm min-h-[600px]`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-2 py-2 mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${statusStyle.dot}`} />
          <h3 className="font-semibold text-sm text-slate-100 tracking-tight">
            {column.name}
          </h3>
          <span className="flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            {tickets.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <Zap className="h-3 w-3 text-indigo-400" />
          <span>{totalPoints} pts</span>
        </div>
      </div>

      {/* Tickets List Area */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-0.5 custom-scrollbar min-h-[200px]">
        <SortableContext
          items={tickets.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </SortableContext>

        {tickets.length === 0 && !isAdding && (
          <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-800/80 rounded-xl text-slate-600 text-xs">
            <span>Drop tickets here</span>
          </div>
        )}
      </div>

      {/* Quick Add Ticket Button & Inline Form */}
      <div className="mt-3 pt-2 border-t border-slate-800/80">
        {isAdding ? (
          <form onSubmit={handleQuickAdd} className="space-y-2">
            <input
              type="text"
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="What needs to be built?..."
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newTitle.trim() || isSubmitting}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-medium disabled:opacity-50"
              >
                Add Ticket
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Ticket
          </button>
        )}
      </div>
    </div>
  );
}
