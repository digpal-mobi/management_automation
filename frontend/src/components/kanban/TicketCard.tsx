'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Ticket } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { MessageSquare, User as UserIcon, CheckSquare, Lock } from 'lucide-react';

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
      className={`group relative rounded-xl border bg-white p-4 shadow-card hover:shadow-card-hover transition-all duration-150 cursor-grab active:cursor-grabbing select-none ${
        isDragging
          ? 'opacity-40 border-[#003049] ring-2 ring-[#003049]/20'
          : isOverlay
          ? 'shadow-2xl border-[#003049] ring-2 ring-[#003049]/30 scale-105 bg-white'
          : 'border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#FDFDFE]'
      }`}
    >
      {/* Top Meta: Ticket ID / Candidate ID, Sprint badge, Type Badge, and Priority Badge */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {ticket.sourceCandidateId ? (
            <span className="text-[11px] font-mono font-bold text-[#003049] bg-[#EFF5F9] px-1.5 py-0.5 rounded border border-[#669BBC]/30">
              {ticket.sourceCandidateId}
            </span>
          ) : (
            <span className="text-[11px] font-mono font-medium text-[#526174] bg-[#F1F4F7] px-1.5 py-0.5 rounded border border-[#E2E8F0]">
              #{shortId}
            </span>
          )}
          {ticket.sprint && (
            <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
              {ticket.sprint}
              {ticket.executionOrder ? ` · #${ticket.executionOrder}` : ''}
            </span>
          )}
          {ticket.isLocked && (
            <span title="Locked to sprint by PM" className="text-amber-600">
              <Lock className="h-3 w-3 inline" />
            </span>
          )}
          <Badge variant="type" type={ticket.type} size="sm" />
        </div>
        <div className="flex items-center gap-1.5">
          {ticket.storyPoints && (
            <span className="text-[10px] font-mono font-semibold text-[#003049] bg-[#EFF5F9] px-1.5 py-0.5 rounded border border-[#669BBC]/30">
              {ticket.storyPoints}pt
            </span>
          )}
          <Badge variant="priority" priority={ticket.priority} size="sm" />
        </div>
      </div>

      {/* Ticket Title */}
      <h4 className="text-sm font-semibold text-[#17212B] group-hover:text-[#003049] transition-colors line-clamp-2 leading-snug mb-1.5">
        {ticket.title}
      </h4>

      {/* Short Description */}
      {ticket.description && (
        <p className="text-xs text-[#526174] line-clamp-2 leading-relaxed mb-3">
          {ticket.description}
        </p>
      )}

      {/* Acceptance Criteria Indicator if available */}
      {acCount > 0 && (
        <div className="flex items-center gap-1 text-[11px] text-[#526174] mb-3">
          <CheckSquare className="h-3 w-3 text-[#669BBC]" />
          <span>{acCount} acceptance criteria</span>
        </div>
      )}

      {/* Footer: Assignee & Comments */}
      <div className="flex items-center justify-between pt-2.5 border-t border-[#E2E8F0] text-xs text-[#526174]">
        {/* Assignee Avatar */}
        <div className="flex items-center gap-1.5">
          {ticket.assignee ? (
            <div
              className="flex items-center gap-1.5"
              title={ticket.assignee.username || ticket.assignee.email}
            >
              <Avatar
                name={ticket.assignee.username}
                email={ticket.assignee.email}
                avatarUrl={ticket.assignee.avatarUrl}
                size="xs"
              />
              <span className="text-[11px] text-[#526174] font-medium truncate max-w-[100px]">
                {ticket.assignee.username || ticket.assignee.email}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-[#94A3B8]">
              <UserIcon className="h-3 w-3" />
              <span>Unassigned</span>
            </div>
          )}
        </div>

        {/* Comment Count */}
        <div className="flex items-center gap-1 text-[11px] text-[#526174] font-medium">
          <MessageSquare className="h-3 w-3 text-[#94A3B8]" />
          <span>{commentCount}</span>
        </div>
      </div>
    </div>
  );
}
