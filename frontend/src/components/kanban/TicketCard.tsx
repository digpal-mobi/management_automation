'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Ticket, TicketPriority, TicketStatus, ProjectMember, BoardColumn } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { toast } from 'sonner';
import {
  MessageSquare,
  User as UserIcon,
  CheckSquare,
  Lock,
  Zap,
  ArrowDown,
  ArrowUp,
  Minus,
  MoreHorizontal,
  Edit2,
  Trash2,
  Copy,
  ExternalLink,
  GitPullRequest,
  CheckCircle2,
  ChevronRight,
  MoveRight,
  AlertCircle,
} from 'lucide-react';

interface TicketCardProps {
  ticket: Ticket;
  members?: ProjectMember[];
  columns?: BoardColumn[];
  isCompact?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canAssign?: boolean;
  canChangeStatus?: boolean;
  onClick?: () => void;
  onEditTitle?: (ticket: Ticket) => void;
  onEditDetails?: (ticket: Ticket) => void;
  onChangeStatus?: (ticket: Ticket, newStatus: TicketStatus, columnId?: string) => void;
  onChangePriority?: (ticket: Ticket, newPriority: TicketPriority) => void;
  onAssign?: (ticket: Ticket, userId: string | null) => void;
  onDuplicate?: (ticket: Ticket) => void;
  onDelete?: (ticket: Ticket) => void;
  isOverlay?: boolean;
}

function PriorityIndicator({ priority }: { priority: TicketPriority }) {
  if (priority === 'Critical') {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-danger-subtle text-danger font-semibold flex items-center gap-0.5 border border-danger/30">
        <AlertCircle className="h-2.5 w-2.5" />
        Urgent
      </span>
    );
  }
  if (priority === 'High') {
    return <ArrowUp className="h-3.5 w-3.5 text-danger flex-shrink-0" aria-label="High priority" />;
  }
  if (priority === 'Medium') {
    return <Minus className="h-3.5 w-3.5 text-ts flex-shrink-0" aria-label="Medium priority" />;
  }
  return <ArrowDown className="h-3.5 w-3.5 text-ts flex-shrink-0" aria-label="Low priority" />;
}

export function TicketCard({
  ticket,
  members = [],
  columns = [],
  isCompact = false,
  canEdit = true,
  canDelete = true,
  canAssign = true,
  canChangeStatus = true,
  onClick,
  onEditTitle,
  onEditDetails,
  onChangeStatus,
  onChangePriority,
  onAssign,
  onDuplicate,
  onDelete,
  isOverlay = false,
}: TicketCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [prioritySubmenu, setPrioritySubmenu] = useState(false);
  const [statusSubmenu, setStatusSubmenu] = useState(false);
  const [assignSubmenu, setAssignSubmenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setPrioritySubmenu(false);
        setStatusSubmenu(false);
        setAssignSubmenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const commentCount = ticket._count?.comments ?? ticket.comments?.length ?? 0;
  const shortId = ticket.id.length > 8 ? `TIC-${ticket.id.slice(-4).toUpperCase()}` : ticket.id;
  const displayId = ticket.sourceCandidateId || shortId;

  const acList = (ticket.acceptanceCriteria as Array<{ completed?: boolean }>) || [];
  const acTotal = acList.length;
  const acCompleted = acList.filter((item) => item.completed).length;

  const prList = (ticket.prChecklist as Array<{ completed?: boolean }>) || [];
  const prTotal = prList.length;
  const prCompleted = prList.filter((item) => item.completed).length;

  const cardTags: { label: string; accent?: boolean }[] = [];
  if (ticket.module) {
    cardTags.push({ label: ticket.module });
  }
  if (ticket.type) {
    cardTags.push({ label: ticket.type, accent: ticket.type === 'Feature' });
  }

  const cardAssignees =
    ticket.assignees && ticket.assignees.length > 0
      ? ticket.assignees
      : ticket.assignee
      ? [ticket.assignee]
      : [];
  const cardAssigneeIds = cardAssignees.map((a) => a.id);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}${window.location.pathname}?ticketId=${ticket.id}`;
      navigator.clipboard.writeText(url);
      toast.success('Ticket link copied to clipboard');
    }
  };

  const isDone = ticket.status === 'Done';

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (!isDragging && onClick && !menuOpen) {
          onClick();
        }
      }}
      className={`group relative p-3 rounded-[10px] border shadow-sm transition-all duration-150 select-none cursor-grab active:cursor-grabbing ${
        isDragging
          ? 'opacity-40 border-accent ring-2 ring-accent/20 scale-[0.98] bg-elevated'
          : isOverlay
          ? 'shadow-2xl border-accent ring-2 ring-accent/30 rotate-[-2deg] scale-[1.02] bg-elevated z-50'
          : isDone
          ? 'bg-elevated/75 border-border/80 hover:border-accent/30 opacity-85'
          : 'bg-elevated border-border hover:border-accent/40'
      }`}
    >
      {/* Top row: ID, priority, badges, menu */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {isDone && (
            <CheckCircle2 className="h-[15px] w-[15px] text-success fill-success/20 flex-shrink-0" aria-hidden />
          )}
          <span
            className={`font-mono text-[11px] text-ts flex-shrink-0 ${
              isDone ? 'line-through' : ''
            }`}
          >
            {displayId}
          </span>
          {!isDone && <PriorityIndicator priority={ticket.priority} />}
          {ticket.sprint && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-subtle text-accent border border-accent/30">
              {ticket.sprint}
            </span>
          )}
          {ticket.isLocked && (
            <span title="Locked to sprint by PM" className="text-warning">
              <Lock className="h-3 w-3 inline" />
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {ticket.storyPoints != null && ticket.storyPoints > 0 && !isCompact && (
            <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-canvas text-ts font-mono text-[10px] border border-border/60">
              {ticket.storyPoints} pt{ticket.storyPoints > 1 ? 's' : ''}
            </span>
          )}

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className={`text-ts hover:text-tp transition-opacity ${
                menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
              title="Ticket actions"
              aria-label="Ticket actions"
            >
              <MoreHorizontal className="h-[15px] w-[15px]" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-7 w-48 rounded-xl bg-elevated border border-border shadow-dropdown p-1.5 z-50 text-xs text-ts animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    if (onEditDetails) onEditDetails(ticket);
                    else if (onClick) onClick();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-hover text-left font-medium text-tp transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-tm" />
                  <span>Open Ticket</span>
                </button>

                {canEdit && onEditTitle && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onEditTitle(ticket);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-hover text-left font-medium text-tp transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-tm" />
                    <span>Edit Title</span>
                  </button>
                )}

                <div className="my-1 border-t border-divider" />

                {canChangeStatus && onChangeStatus && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setStatusSubmenu(!statusSubmenu)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-hover text-left font-medium transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <MoveRight className="h-3.5 w-3.5 text-tm" />
                        <span>Move Status</span>
                      </span>
                      <ChevronRight className="h-3 w-3 text-tm" />
                    </button>
                    {statusSubmenu && (
                      <div className="pl-3 py-1 space-y-0.5 border-l-2 border-accent/20 ml-2 my-1">
                        {(['To Do', 'In Progress', 'Done'] as TicketStatus[]).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => {
                              setMenuOpen(false);
                              onChangeStatus(ticket, st);
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1 rounded text-left text-[11px] hover:bg-hover ${
                              ticket.status === st ? 'font-bold text-accent' : 'text-ts'
                            }`}
                          >
                            <span>{st}</span>
                            {ticket.status === st && <CheckCircle2 className="h-3 w-3 text-accent" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {canEdit && onChangePriority && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setPrioritySubmenu(!prioritySubmenu)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-hover text-left font-medium transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 text-tm" />
                        <span>Priority</span>
                      </span>
                      <ChevronRight className="h-3 w-3 text-tm" />
                    </button>
                    {prioritySubmenu && (
                      <div className="pl-3 py-1 space-y-0.5 border-l-2 border-accent/20 ml-2 my-1">
                        {(['Critical', 'High', 'Medium', 'Low'] as TicketPriority[]).map((pr) => (
                          <button
                            key={pr}
                            type="button"
                            onClick={() => {
                              setMenuOpen(false);
                              onChangePriority(ticket, pr);
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1 rounded text-left text-[11px] hover:bg-hover ${
                              ticket.priority === pr ? 'font-bold text-accent' : 'text-ts'
                            }`}
                          >
                            <span>{pr}</span>
                            {ticket.priority === pr && <CheckCircle2 className="h-3 w-3 text-accent" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {canAssign && onAssign && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setAssignSubmenu(!assignSubmenu)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-hover text-left font-medium transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <UserIcon className="h-3.5 w-3.5 text-tm" />
                        <span>Assignee</span>
                      </span>
                      <ChevronRight className="h-3 w-3 text-tm" />
                    </button>
                    {assignSubmenu && (
                      <div className="pl-3 py-1 space-y-0.5 border-l-2 border-accent/20 ml-2 my-1 max-h-36 overflow-y-auto custom-scrollbar">
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            onAssign(ticket, null);
                          }}
                          className={`w-full flex items-center justify-between px-2 py-1 rounded text-left text-[11px] hover:bg-hover ${
                            cardAssignees.length === 0 ? 'font-bold text-accent' : 'text-ts'
                          }`}
                        >
                          <span>Unassigned</span>
                          {cardAssignees.length === 0 && <CheckCircle2 className="h-3 w-3 text-accent" />}
                        </button>
                        {members.map((m) => {
                          const isAssigned = cardAssigneeIds.includes(m.userId);
                          return (
                            <button
                              key={m.userId}
                              type="button"
                              onClick={() => {
                                onAssign(ticket, m.userId);
                              }}
                              className={`w-full flex items-center justify-between px-2 py-1 rounded text-left text-[11px] hover:bg-hover ${
                                isAssigned ? 'font-bold text-accent bg-accent/5' : 'text-ts'
                              }`}
                            >
                              <span className="truncate">{m.user.username || m.user.email}</span>
                              {isAssigned && <CheckCircle2 className="h-3 w-3 text-accent shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="my-1 border-t border-divider" />

                {onDuplicate && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDuplicate(ticket);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-hover text-left font-medium text-tp transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5 text-tm" />
                    <span>Duplicate Ticket</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-hover text-left font-medium text-tp transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-tm" />
                  <span>Copy Link</span>
                </button>

                {canDelete && onDelete && (
                  <>
                    <div className="my-1 border-t border-divider" />
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(ticket);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-danger-subtle text-left font-medium text-danger transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-danger" />
                      <span>Delete Ticket</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <h3
        className={`text-sm font-medium leading-snug mb-2.5 line-clamp-2 ${
          isDone ? 'text-ts line-through' : 'text-tp'
        } ${isCompact ? 'mb-2' : ''}`}
      >
        {ticket.title}
      </h3>

      {cardTags.length > 0 && (
        <div className={`flex flex-wrap gap-1.5 ${isCompact ? 'mb-2' : 'mb-3'}`}>
          {cardTags.map((tag) => (
            <span
              key={tag.label}
              className={`text-[11px] px-2 py-0.5 rounded border font-medium ${
                tag.accent
                  ? 'bg-accent-subtle border-accent/30 text-accent'
                  : 'bg-canvas border-border/60 text-ts'
              }`}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {!isCompact && prTotal > 0 && (
        <div className="flex flex-col gap-1 mb-2.5">
          <div className="flex items-center justify-between text-[11px] text-ts font-mono">
            <span className="font-sans text-ts flex items-center gap-1">
              <GitPullRequest className="h-3 w-3" />
              PR checks
            </span>
            <span className="text-tp font-medium">
              {prCompleted}/{prTotal} ({Math.round((prCompleted / prTotal) * 100)}%)
            </span>
          </div>
          <div className="w-full h-1.5 bg-canvas rounded-full overflow-hidden border border-border/60">
            <div
              className="h-full bg-accent/80 rounded-full transition-all"
              style={{ width: `${prTotal > 0 ? (prCompleted / prTotal) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px] text-ts">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1" title="Comments">
            <MessageSquare className="h-[13px] w-[13px]" />
            <span>{commentCount}</span>
          </div>
          {acTotal > 0 && (
            <div className="flex items-center gap-1" title="Acceptance criteria">
              <CheckSquare className="h-[13px] w-[13px]" />
              <span>
                {acCompleted}/{acTotal}
              </span>
            </div>
          )}
          {isDone && (
            <span className="text-[10px] text-ts truncate">
              Completed{' '}
              {ticket.updatedAt
                ? new Date(ticket.updatedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })
                : ''}
            </span>
          )}
        </div>

        {cardAssignees.length > 0 ? (
          <div
            className="flex items-center -space-x-1.5 flex-shrink-0"
            title={cardAssignees.map((a) => a.username || a.email).join(', ')}
          >
            {cardAssignees.slice(0, 3).map((u, i) => (
              <Avatar
                key={u.id || i}
                name={u.username}
                email={u.email}
                avatarUrl={u.avatarUrl}
                size="xs"
                className="ring-2 ring-elevated"
              />
            ))}
            {cardAssignees.length > 3 && (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-elevated ring-2 ring-elevated text-[9px] font-semibold text-ts">
                +{cardAssignees.length - 3}
              </span>
            )}
          </div>
        ) : (
          <div
            className="w-5 h-5 rounded-full bg-surface border border-border/80 flex items-center justify-center flex-shrink-0"
            title="Unassigned"
          >
            <UserIcon className="h-3 w-3 text-ts" />
          </div>
        )}
      </div>
    </article>
  );
}
