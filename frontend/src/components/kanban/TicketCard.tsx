'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Ticket } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { MessageSquare, User as UserIcon, CheckSquare } from 'lucide-react';

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
  const acCount = ticket.acceptanceCriteria?.length ?? 0;

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
      className={`group relative rounded-xl border bg-[#0A0A0A] p-4 shadow-sm hover:shadow transition-all duration-150 cursor-grab active:cursor-grabbing select-none ${
        isDragging
          ? 'opacity-40 border-white ring-1 ring-white/20'
          : isOverlay
          ? 'shadow-2xl border-white ring-1 ring-white/40 scale-105 bg-[#141414]'
          : 'border-[#2A2A2A] hover:border-[#404040] hover:bg-[#141414]'
      }`}
    >
      {/* Top Meta: Ticket ID, Type Badge, and Priority Badge */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-mono font-medium text-[#A3A3A3] bg-[#141414] px-1.5 py-0.5 rounded border border-[#2A2A2A]">
            #{shortId}
          </span>
          <Badge variant="type" type={ticket.type} size="sm" />
        </div>
        <div className="flex items-center gap-1.5">
          {ticket.storyPoints && (
            <span className="text-[10px] font-mono font-semibold text-[#A3A3A3] bg-[#141414] px-1.5 py-0.5 rounded border border-[#2A2A2A]">
              {ticket.storyPoints}pt
            </span>
          )}
          <Badge variant="priority" priority={ticket.priority} size="sm" />
        </div>
      </div>

      {/* Ticket Title */}
      <h4 className="text-sm font-semibold text-white group-hover:text-white transition-colors line-clamp-2 leading-snug mb-1.5">
        {ticket.title}
      </h4>

      {/* Short Description */}
      {ticket.description && (
        <p className="text-xs text-[#A3A3A3] line-clamp-2 leading-relaxed mb-3">
          {ticket.description}
        </p>
      )}

      {/* Acceptance Criteria Indicator if available */}
      {acCount > 0 && (
        <div className="flex items-center gap-1 text-[11px] text-[#525252] mb-3">
          <CheckSquare className="h-3 w-3 text-[#A3A3A3]" />
          <span>{acCount} acceptance criteria</span>
        </div>
      )}

      {/* Footer: Assignee & Comments */}
      <div className="flex items-center justify-between pt-2.5 border-t border-[#2A2A2A] text-xs text-[#525252]">
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
                  className="w-5 h-5 rounded-full object-cover border border-[#2A2A2A]"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-[#141414] border border-[#2A2A2A] text-[10px] font-semibold text-white flex items-center justify-center">
                  {(ticket.assignee.username || ticket.assignee.email)[0].toUpperCase()}
                </div>
              )}
              <span className="text-[11px] text-[#A3A3A3] truncate max-w-[100px]">
                {ticket.assignee.username || ticket.assignee.email}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-[#525252]">
              <UserIcon className="h-3 w-3" />
              <span>Unassigned</span>
            </div>
          )}
        </div>

        {/* Comment Count */}
        <div className="flex items-center gap-1 text-[11px] text-[#525252] font-medium">
          <MessageSquare className="h-3 w-3 text-[#525252]" />
          <span>{commentCount}</span>
        </div>
      </div>
    </div>
  );
}
