'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Ticket, TicketStatus } from '@/types';
import { TicketCard } from './TicketCard';
import { Plus } from 'lucide-react';

interface ColumnProps {
  id: TicketStatus;
  title: TicketStatus;
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
  onAddTicketClick: (status: TicketStatus) => void;
}

export function Column({
  id,
  title,
  tickets,
  onTicketClick,
  onAddTicketClick,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'Column',
      status: id,
    },
  });

  const columnStyles: Record<TicketStatus, { dot: string; border: string; badge: string }> = {
    'To Do': {
      dot: 'bg-blue-400',
      border: 'border-slate-800',
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
    'In Progress': {
      dot: 'bg-amber-400',
      border: 'border-slate-800',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
    'Done': {
      dot: 'bg-emerald-400',
      border: 'border-slate-800',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
  };

  const currentStyle = columnStyles[title] || columnStyles['To Do'];

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col flex-1 min-w-[300px] max-w-[420px] rounded-2xl border bg-slate-950/70 p-3.5 shadow-lg backdrop-blur-sm transition-colors ${
        isOver ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-slate-900/50' : currentStyle.border
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-2 py-2 mb-3">
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${currentStyle.dot}`} />
          <h3 className="font-semibold text-sm text-slate-100 tracking-tight">
            {title}
          </h3>
          <span
            className={`flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold border ${currentStyle.badge}`}
          >
            {tickets.length}
          </span>
        </div>

        <button
          onClick={() => onAddTicketClick(title)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title={`Add ticket to ${title}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Tickets List Area */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-0.5 custom-scrollbar min-h-[350px]">
        <SortableContext
          items={tickets.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={() => onTicketClick(ticket)}
            />
          ))}
        </SortableContext>

        {tickets.length === 0 && (
          <div className="h-40 flex flex-col items-center justify-center border border-dashed border-slate-800/80 rounded-xl text-slate-500 text-xs px-4 text-center">
            <span className="font-medium text-slate-400 mb-1">No tickets in this column</span>
            <span className="text-[11px] text-slate-500">Drag a ticket here or click + to add one</span>
          </div>
        )}
      </div>

      {/* Quick Add CTA */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80">
        <button
          onClick={() => onAddTicketClick(title)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-slate-800 hover:border-slate-700 hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Ticket</span>
        </button>
      </div>
    </div>
  );
}
