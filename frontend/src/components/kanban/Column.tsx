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
      dot: 'bg-[#526174]',
      border: 'border-[#E2E8F0]',
      badge: 'bg-[#F1F4F7] text-[#526174] border-[#E2E8F0]',
    },
    'In Progress': {
      dot: 'bg-[#003049]',
      border: 'border-[#669BBC]/40',
      badge: 'bg-[#EFF5F9] text-[#003049] border-[#669BBC]/30',
    },
    'Done': {
      dot: 'bg-[#15803D]',
      border: 'border-[#BBF7D0]',
      badge: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
    },
  };

  const currentStyle = columnStyles[title] || columnStyles['To Do'];

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col flex-1 min-w-[300px] max-w-[420px] rounded-2xl border bg-[#F7F8FA] p-3.5 shadow-card transition-colors ${
        isOver ? 'border-[#003049] ring-2 ring-[#003049]/20 bg-[#EFF5F9]/50' : currentStyle.border
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-2 py-2 mb-3">
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full ${currentStyle.dot}`} />
          <h3 className="font-bold text-sm text-[#17212B] tracking-tight">
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
          className="p-1 rounded-lg text-[#526174] hover:text-[#003049] hover:bg-white transition-colors"
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
          <div className="h-40 flex flex-col items-center justify-center border border-dashed border-[#CBD5E1] rounded-xl text-[#526174] text-xs px-4 text-center bg-white/50">
            <span className="font-semibold text-[#17212B] mb-1">No tickets in this column</span>
            <span className="text-[11px] text-[#526174]">Drag a ticket here or click + to add one</span>
          </div>
        )}
      </div>

      {/* Quick Add CTA */}
      <div className="mt-3 pt-2.5 border-t border-[#E2E8F0]">
        <button
          onClick={() => onAddTicketClick(title)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-[#CBD5E1] hover:border-[#003049] hover:bg-white text-[#526174] hover:text-[#003049] text-xs font-medium transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Ticket</span>
        </button>
      </div>
    </div>
  );
}
