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
      dot: 'bg-[#525252]',
      border: 'border-[#2A2A2A]',
      badge: 'bg-[#141414] text-[#A3A3A3] border-[#2A2A2A]',
    },
    'In Progress': {
      dot: 'bg-white',
      border: 'border-[#2A2A2A]',
      badge: 'bg-white/10 text-white border-white/20',
    },
    'Done': {
      dot: 'bg-[#A3A3A3]',
      border: 'border-[#2A2A2A]',
      badge: 'bg-[#2A2A2A] text-white border-[#404040]',
    },
  };

  const currentStyle = columnStyles[title] || columnStyles['To Do'];

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col flex-1 min-w-[300px] max-w-[420px] rounded-2xl border bg-[#0A0A0A] p-3.5 shadow-sm transition-colors ${
        isOver ? 'border-white ring-1 ring-white/20 bg-[#141414]' : currentStyle.border
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-2 py-2 mb-3">
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full ${currentStyle.dot}`} />
          <h3 className="font-semibold text-sm text-white tracking-tight">
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
          className="p-1 rounded-lg text-[#525252] hover:text-white hover:bg-[#141414] transition-colors"
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
          <div className="h-40 flex flex-col items-center justify-center border border-dashed border-[#2A2A2A] rounded-xl text-[#525252] text-xs px-4 text-center">
            <span className="font-medium text-[#A3A3A3] mb-1">No tickets in this column</span>
            <span className="text-[11px] text-[#525252]">Drag a ticket here or click + to add one</span>
          </div>
        )}
      </div>

      {/* Quick Add CTA */}
      <div className="mt-3 pt-2.5 border-t border-[#2A2A2A]">
        <button
          onClick={() => onAddTicketClick(title)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-[#2A2A2A] hover:border-[#404040] hover:bg-[#141414] text-[#A3A3A3] hover:text-white text-xs font-medium transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Ticket</span>
        </button>
      </div>
    </div>
  );
}
