'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Ticket } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { MessageSquare, User as UserIcon } from 'lucide-react';

interface TicketCardProps {
  ticket: Ticket;
  onClick?: () => void;
  isOverlay?: boolean;
}

export function TicketCard({ ticket, onClick, isOverlay = false }: TicketCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: ticket.id,
    data: {
      type: 'Ticket',
      ticket,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const commentCount = ticket._count?.comments ?? ticket.comments?.length ?? 0;
  const shortId = ticket.id.length > 8 ? `TIC-${ticket.id.slice(-4).toUpperCase()}` : ticket.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Prevent click trigger when dragging
        if (!isDragging && onClick) {
          onClick();
        }
      }}
      className={`group relative rounded-xl border bg-slate-900/90 p-4 shadow-sm hover:shadow-md transition-all duration-150 cursor-grab active:cursor-grabbing select-none ${
        isDragging
          ? 'opacity-40 border-indigo-500 ring-2 ring-indigo-500/20'
          : isOverlay
          ? 'shadow-2xl border-indigo-500 ring-2 ring-indigo-500/30 scale-105'
          : 'border-slate-800/90 hover:border-slate-700 hover:bg-slate-900'
      }`}
    >
      {/* Top Meta: Ticket ID, Type Badge, and Priority Badge */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-mono font-medium text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/60">
            #{shortId}
          </span>
          <Badge variant="type" type={ticket.type} size="sm" />
        </div>
        <Badge variant="priority" priority={ticket.priority} size="sm" />
      </div>

      {/* Ticket Title */}
      <h4 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug mb-1.5">
        {ticket.title}
      </h4>

      {/* Short Description */}
      {ticket.description && (
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
          {ticket.description}
        </p>
      )}

      {/* Footer: Assignee & Comments */}
      <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/70 text-xs text-slate-400">
        {/* Assignee Avatar */}
        <div className="flex items-center gap-1.5">
          {ticket.assignee ? (
            <div
              className="flex items-center gap-1.5"
              title={ticket.assignee.username || ticket.assignee.email}
            >
              {ticket.assignee.avatarUrl ? (
                <img
                  src={ticket.assignee.avatarUrl}
                  alt={ticket.assignee.username}
                  className="w-5 h-5 rounded-full object-cover border border-slate-700"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-[10px] font-semibold text-indigo-300 flex items-center justify-center">
                  {(ticket.assignee.username || ticket.assignee.email)[0].toUpperCase()}
                </div>
              )}
              <span className="text-[11px] text-slate-300 truncate max-w-[100px]">
                {ticket.assignee.username || ticket.assignee.email}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <UserIcon className="h-3 w-3" />
              <span>Unassigned</span>
            </div>
          )}
        </div>

        {/* Comment Count */}
        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
          <MessageSquare className="h-3 w-3 text-slate-500" />
          <span>{commentCount}</span>
        </div>
      </div>
    </div>
  );
}
