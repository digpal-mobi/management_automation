'use client';

import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Ticket, BoardColumn, TicketStatus } from '@/types';
import { TicketCard } from './TicketCard';
import {
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

interface ColumnProps {
  column: BoardColumn;
  tickets: Ticket[];
  canManageColumns?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onTicketClick: (ticket: Ticket) => void;
  onAddTicketClick: (column: BoardColumn) => void;
  onEditColumn?: (column: BoardColumn) => void;
  onDeleteColumn?: (column: BoardColumn) => void;
  onMoveColumnLeft?: (column: BoardColumn) => void;
  onMoveColumnRight?: (column: BoardColumn) => void;
}

export function Column({
  column,
  tickets,
  canManageColumns = false,
  isFirst = false,
  isLast = false,
  onTicketClick,
  onAddTicketClick,
  onEditColumn,
  onDeleteColumn,
  onMoveColumnLeft,
  onMoveColumnRight,
}: ColumnProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'Column',
      columnId: column.id,
      category: column.category,
    },
  });

  // Determine category badge and dot style
  const categoryStyles: Record<string, { dot: string; border: string; badge: string; label: string }> = {
    TODO: {
      dot: 'bg-[#526174]',
      border: 'border-[#E2E8F0]',
      badge: 'bg-[#F1F4F7] text-[#526174] border-[#E2E8F0]',
      label: 'To Do',
    },
    'To Do': {
      dot: 'bg-[#526174]',
      border: 'border-[#E2E8F0]',
      badge: 'bg-[#F1F4F7] text-[#526174] border-[#E2E8F0]',
      label: 'To Do',
    },
    IN_PROGRESS: {
      dot: 'bg-[#003049]',
      border: 'border-[#669BBC]/40',
      badge: 'bg-[#EFF5F9] text-[#003049] border-[#669BBC]/30',
      label: 'In Progress',
    },
    'In Progress': {
      dot: 'bg-[#003049]',
      border: 'border-[#669BBC]/40',
      badge: 'bg-[#EFF5F9] text-[#003049] border-[#669BBC]/30',
      label: 'In Progress',
    },
    DONE: {
      dot: 'bg-[#15803D]',
      border: 'border-[#BBF7D0]',
      badge: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
      label: 'Done',
    },
    Done: {
      dot: 'bg-[#15803D]',
      border: 'border-[#BBF7D0]',
      badge: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
      label: 'Done',
    },
  };

  const style = categoryStyles[column.category] || categoryStyles['To Do'];

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-[320px] min-w-[320px] max-w-[340px] flex-shrink-0 rounded-2xl border bg-[#F7F8FA] p-3.5 shadow-card transition-all ${
        isOver ? 'border-[#003049] ring-2 ring-[#003049]/20 bg-[#EFF5F9]/50' : style.border
      }`}
    >
      {/* Column Header */}
      <div className="relative flex items-center justify-between px-2 py-1.5 mb-2.5">
        <div className="flex items-center gap-2 min-w-0 pr-1">
          <span
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${style.dot}`}
            style={column.color ? { backgroundColor: column.color } : undefined}
          />
          <h3
            className="font-bold text-sm text-[#17212B] tracking-tight truncate"
            title={column.name}
          >
            {column.name}
          </h3>
          <span
            className={`flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold border flex-shrink-0 ${style.badge}`}
          >
            {tickets.length}
          </span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAddTicketClick(column)}
            className="p-1 rounded-lg text-[#526174] hover:text-[#003049] hover:bg-white transition-colors"
            title={`Add ticket to ${column.name}`}
            aria-label={`Add ticket to ${column.name}`}
          >
            <Plus className="h-4 w-4" />
          </button>

          {canManageColumns && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 rounded-lg text-[#526174] hover:text-[#17212B] hover:bg-white transition-colors"
                title="Column options"
                aria-label="Column options"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-7 z-30 w-44 rounded-xl border border-[#E2E8F0] bg-white p-1.5 shadow-dropdown animate-in fade-in zoom-in-95 duration-100">
                    {onEditColumn && (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onEditColumn(column);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[#17212B] hover:bg-[#F1F4F7] text-left transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-[#526174]" />
                        <span>Edit Column</span>
                      </button>
                    )}

                    {!isFirst && onMoveColumnLeft && (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onMoveColumnLeft(column);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[#17212B] hover:bg-[#F1F4F7] text-left transition-colors"
                      >
                        <ArrowLeft className="h-3.5 w-3.5 text-[#526174]" />
                        <span>Move Left</span>
                      </button>
                    )}

                    {!isLast && onMoveColumnRight && (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onMoveColumnRight(column);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[#17212B] hover:bg-[#F1F4F7] text-left transition-colors"
                      >
                        <ArrowRight className="h-3.5 w-3.5 text-[#526174]" />
                        <span>Move Right</span>
                      </button>
                    )}

                    {onDeleteColumn && (
                      <div className="pt-1 mt-1 border-t border-[#E2E8F0]">
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            onDeleteColumn(column);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[#C1121F] hover:bg-[#FDF2F2] text-left transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete Column</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Description tooltip / subtle subtitle if present */}
      {column.description && (
        <p className="text-[11px] text-[#526174] px-2 mb-2 line-clamp-1 italic">
          {column.description}
        </p>
      )}

      {/* Tickets List Area */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-0.5 custom-scrollbar min-h-[380px] max-h-[calc(100vh-320px)]">
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
          <div className="h-44 flex flex-col items-center justify-center border border-dashed border-[#CBD5E1] rounded-xl text-[#526174] text-xs px-4 text-center bg-white/50">
            <span className="font-semibold text-[#17212B] mb-1">No tickets in this column</span>
            <span className="text-[11px] text-[#526174]">Drag a ticket here or click + to add one</span>
          </div>
        )}
      </div>

      {/* Quick Add CTA */}
      <div className="mt-3 pt-2.5 border-t border-[#E2E8F0]">
        <button
          onClick={() => onAddTicketClick(column)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-[#CBD5E1] hover:border-[#003049] hover:bg-white text-[#526174] hover:text-[#003049] text-xs font-medium transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Ticket</span>
        </button>
      </div>
    </div>
  );
}
