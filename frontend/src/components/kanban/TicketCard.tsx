'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Ticket } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { useAppDispatch } from '@/store/store';
import { setActiveTicket } from '@/store/boardSlice';
import {
  MessageSquare,
  CheckSquare,
  Zap,
  GitBranch,
  User as UserIcon,
} from 'lucide-react';

interface TicketCardProps {
  ticket: Ticket;
  isOverlay?: boolean;
}

export function TicketCard({ ticket, isOverlay = false }: TicketCardProps) {
  const dispatch = useAppDispatch();

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

  // Calculate Acceptance Criteria completion
  const criteria = Array.isArray(ticket.acceptanceCriteria) ? ticket.acceptanceCriteria : [];
  const completedCriteria = criteria.filter((c) => c.completed).length;
  const totalCriteria = criteria.length;
  const criteriaPct = totalCriteria > 0 ? Math.round((completedCriteria / totalCriteria) * 100) : 0;

  const labels = Array.isArray(ticket.labels) ? ticket.labels : [];
  const commentCount = ticket._count?.messages || 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Prevent click when dragging
        if (!isDragging) {
          dispatch(setActiveTicket(ticket));
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
      {/* Top Meta: Priority & Story Points */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <Badge variant="priority" priority={ticket.priority} size="sm" />

        <div className="flex items-center gap-1.5">
          {ticket.dependencies && ticket.dependencies.length > 0 && (
            <span
              title={`Depends on: ${ticket.dependencies.join(', ')}`}
              className="flex items-center text-[10px] font-medium text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/80"
            >
              <GitBranch className="h-2.5 w-2.5 mr-0.5 text-amber-400" />
              {ticket.dependencies.length}
            </span>
          )}

          <span className="flex items-center text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
            <Zap className="h-3 w-3 mr-0.5 text-indigo-400" />
            {ticket.storyPoints} pts
          </span>
        </div>
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

      {/* Acceptance Criteria Progress */}
      {totalCriteria > 0 && (
        <div className="mb-3 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <CheckSquare className="h-3 w-3 text-slate-500" />
              Acceptance Criteria
            </span>
            <span className="font-mono text-[10px] text-slate-300 font-medium">
              {completedCriteria}/{totalCriteria}
            </span>
          </div>
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                criteriaPct === 100
                  ? 'bg-emerald-500'
                  : criteriaPct > 0
                  ? 'bg-indigo-500'
                  : 'bg-slate-700'
              }`}
              style={{ width: `${criteriaPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Labels Pills */}
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {labels.slice(0, 3).map((lbl, idx) => (
            <span
              key={idx}
              className="text-[10px] font-medium text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60"
            >
              #{lbl}
            </span>
          ))}
          {labels.length > 3 && (
            <span className="text-[10px] text-slate-500 font-medium self-center">
              +{labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer: Assignee & Discussion */}
      <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/70 text-xs text-slate-400">
        {/* Assignee */}
        <div className="flex items-center gap-1.5">
          {ticket.assignee ? (
            <div className="flex items-center gap-1.5" title={ticket.assignee.name}>
              <img
                src={
                  ticket.assignee.avatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
                }
                alt={ticket.assignee.name}
                className="w-5 h-5 rounded-full object-cover border border-slate-700"
              />
              <span className="text-[11px] text-slate-300 truncate max-w-[90px]">
                {ticket.assignee.name.split(' ')[0]}
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
