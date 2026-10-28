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
  Minus,
  MoreHorizontal,
  Edit2,
  Trash2,
  Copy,
  ExternalLink,
  GitPullRequest,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  MoveRight,
  Tag,
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

  // Close context menu on click outside
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

  // Acceptance criteria count
  const acList = (ticket.acceptanceCriteria as any[]) || [];
  const acTotal = acList.length;
  const acCompleted = acList.filter((item) => item.completed).length;

  // PR checklist / subtask progress
  const prList = (ticket.prChecklist as any[]) || [];
  const prTotal = prList.length;
  const prCompleted = prList.filter((item) => item.completed).length;

  // Extract tags: look for module or hashtags in description/title
  const tags: string[] = [];
  if (ticket.module) {
    tags.push(ticket.module.toLowerCase().startsWith('#') ? ticket.module.toLowerCase() : `#${ticket.module.toLowerCase()}`);
  }
  const textToScan = `${ticket.title} ${ticket.description || ''}`;
  const hashtagMatches = textToScan.match(/#[a-zA-Z0-9_-]+/g);
  if (hashtagMatches) {
    hashtagMatches.slice(0, 3).forEach((tag) => {
      if (!tags.includes(tag.toLowerCase())) {
        tags.push(tag.toLowerCase());
      }
    });
  }

  // Copy ticket link handler
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
      className={`group relative rounded-xl border bg-white shadow-sm transition-all duration-150 select-none cursor-grab active:cursor-grabbing ${
        isCompact ? 'p-3' : 'p-3.5'
      } ${
        isDragging
          ? 'opacity-40 border-primary ring-2 ring-primary/20 scale-[0.98]'
          : isOverlay
          ? 'shadow-2xl border-primary ring-2 ring-primary/30 rotate-[-2deg] scale-[1.02] bg-white z-50'
          : 'border-slate-200/80 hover:border-slate-300 hover:shadow-md'
      }`}
    >
      {/* Top Metadata Row */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {/* Priority Pill */}
          {ticket.priority === 'Critical' ? (
            <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[10px] uppercase flex items-center gap-1 tracking-wide shadow-2xs">
              <Zap className="h-3 w-3 fill-red-600 text-red-600 flex-shrink-0" />
              <span>URGENT</span>
            </span>
          ) : ticket.priority === 'High' ? (
            <span className="px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-bold text-[10px] uppercase flex items-center gap-1 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 flex-shrink-0"></span>
              <span>HIGH</span>
            </span>
          ) : ticket.priority === 'Medium' ? (
            <span className="text-slate-400 group-hover:text-slate-600 flex items-center" title="Medium Priority">
              <Minus className="h-3.5 w-3.5" />
            </span>
          ) : (
            <span className="text-slate-400 group-hover:text-slate-600 flex items-center" title="Low Priority">
              <ArrowDown className="h-3.5 w-3.5" />
            </span>
          )}

          {/* Ticket Identifier */}
          <span className="font-mono text-[11px] font-semibold text-slate-500 uppercase tracking-tight">
            {displayId}
          </span>

          {/* Sprint Tag / Sprint Goal */}
          {ticket.sprint && (
            <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-mono text-[10px] font-bold">
              {ticket.sprint}
            </span>
          )}

          {ticket.isLocked && (
            <span title="Locked to sprint by PM" className="text-amber-600">
              <Lock className="h-3 w-3 inline" />
            </span>
          )}
        </div>

        {/* Right side: Points badge and 3-dot Context Menu */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {ticket.storyPoints != null && ticket.storyPoints > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-medium border border-slate-200/80">
              {ticket.storyPoints} pt{ticket.storyPoints > 1 ? 's' : ''}
            </span>
          )}

          {/* Card Context Menu Trigger */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors opacity-70 group-hover:opacity-100"
              title="Ticket actions"
              aria-label="Ticket actions"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>

            {/* Context Menu Dropdown */}
            {menuOpen && (
              <div
                className="absolute right-0 top-7 w-48 rounded-xl bg-white border border-slate-200 shadow-dropdown p-1.5 z-50 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Open details */}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    if (onEditDetails) onEditDetails(ticket);
                    else if (onClick) onClick();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-left font-medium text-slate-800 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                  <span>Open Ticket</span>
                </button>

                {/* Edit Title */}
                {canEdit && onEditTitle && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onEditTitle(ticket);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-left font-medium text-slate-800 transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                    <span>Edit Title</span>
                  </button>
                )}

                <div className="my-1 border-t border-slate-100" />

                {/* Change Status Submenu */}
                {canChangeStatus && onChangeStatus && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setStatusSubmenu(!statusSubmenu)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-left font-medium transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <MoveRight className="h-3.5 w-3.5 text-slate-500" />
                        <span>Move Status</span>
                      </span>
                      <ChevronRight className="h-3 w-3 text-slate-400" />
                    </button>
                    {statusSubmenu && (
                      <div className="pl-3 py-1 space-y-0.5 border-l-2 border-primary/20 ml-2 my-1">
                        {(['To Do', 'In Progress', 'Done'] as TicketStatus[]).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => {
                              setMenuOpen(false);
                              onChangeStatus(ticket, st);
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1 rounded text-left text-[11px] hover:bg-slate-100 ${
                              ticket.status === st ? 'font-bold text-primary' : 'text-slate-600'
                            }`}
                          >
                            <span>{st}</span>
                            {ticket.status === st && <CheckCircle2 className="h-3 w-3 text-primary" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Change Priority Submenu */}
                {canEdit && onChangePriority && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setPrioritySubmenu(!prioritySubmenu)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-left font-medium transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 text-slate-500" />
                        <span>Priority</span>
                      </span>
                      <ChevronRight className="h-3 w-3 text-slate-400" />
                    </button>
                    {prioritySubmenu && (
                      <div className="pl-3 py-1 space-y-0.5 border-l-2 border-primary/20 ml-2 my-1">
                        {(['Critical', 'High', 'Medium', 'Low'] as TicketPriority[]).map((pr) => (
                          <button
                            key={pr}
                            type="button"
                            onClick={() => {
                              setMenuOpen(false);
                              onChangePriority(ticket, pr);
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1 rounded text-left text-[11px] hover:bg-slate-100 ${
                              ticket.priority === pr ? 'font-bold text-primary' : 'text-slate-600'
                            }`}
                          >
                            <span>{pr}</span>
                            {ticket.priority === pr && <CheckCircle2 className="h-3 w-3 text-primary" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Assign / Reassign Submenu */}
                {canAssign && onAssign && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setAssignSubmenu(!assignSubmenu)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-left font-medium transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <UserIcon className="h-3.5 w-3.5 text-slate-500" />
                        <span>Assignee</span>
                      </span>
                      <ChevronRight className="h-3 w-3 text-slate-400" />
                    </button>
                    {assignSubmenu && (
                      <div className="pl-3 py-1 space-y-0.5 border-l-2 border-primary/20 ml-2 my-1 max-h-36 overflow-y-auto custom-scrollbar">
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            onAssign(ticket, null);
                          }}
                          className={`w-full flex items-center justify-between px-2 py-1 rounded text-left text-[11px] hover:bg-slate-100 ${
                            !ticket.assigneeId ? 'font-bold text-primary' : 'text-slate-600'
                          }`}
                        >
                          <span>Unassigned</span>
                          {!ticket.assigneeId && <CheckCircle2 className="h-3 w-3 text-primary" />}
                        </button>
                        {members.map((m) => (
                          <button
                            key={m.userId}
                            type="button"
                            onClick={() => {
                              setMenuOpen(false);
                              onAssign(ticket, m.userId);
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1 rounded text-left text-[11px] hover:bg-slate-100 ${
                              ticket.assigneeId === m.userId ? 'font-bold text-primary' : 'text-slate-600'
                            }`}
                          >
                            <span className="truncate">{m.user.username || m.user.email}</span>
                            {ticket.assigneeId === m.userId && <CheckCircle2 className="h-3 w-3 text-primary" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="my-1 border-t border-slate-100" />

                {/* Duplicate Ticket */}
                {onDuplicate && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDuplicate(ticket);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-left font-medium text-slate-800 transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5 text-slate-500" />
                    <span>Duplicate Ticket</span>
                  </button>
                )}

                {/* Copy Link */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-left font-medium text-slate-800 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                  <span>Copy Link</span>
                </button>

                {/* Delete Ticket */}
                {canDelete && onDelete && (
                  <>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(ticket);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-50 text-left font-medium text-red-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      <span>Delete Ticket</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ticket Title */}
      <h4
        className={`font-medium text-[13px] leading-snug text-slate-900 group-hover:text-primary transition-colors line-clamp-2 ${
          isDone ? 'line-through text-slate-400' : ''
        } ${isCompact ? 'mb-1' : 'mb-2'}`}
      >
        {ticket.title}
      </h4>



      {/* Middle Tags & Progress Row */}
      <div className="flex items-center justify-between gap-1 pt-1 mb-2.5 flex-wrap">
        {/* Tags */}
        <div className="flex items-center gap-1 flex-wrap">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] font-medium"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Indicators: Acceptance Criteria Progress / Subtasks */}
        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400 ml-auto">
          {acTotal > 0 && (
            <span
              className="flex items-center gap-1 hover:text-slate-600"
              title={`${acCompleted} of ${acTotal} acceptance criteria checked`}
            >
              <CheckSquare className="h-3 w-3 text-slate-400" />
              <span>
                {acCompleted}/{acTotal}
              </span>
            </span>
          )}

          {prTotal > 0 && (
            <span
              className="flex items-center gap-1 hover:text-slate-600"
              title={`${prCompleted} of ${prTotal} PR checks completed`}
            >
              <GitPullRequest className="h-3 w-3 text-slate-400" />
              <span>
                {prCompleted}/{prTotal}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Footer: Assignee & Meta */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
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
              <span className="text-[11px] text-slate-600 font-medium truncate max-w-[110px]">
                {ticket.assignee.username || ticket.assignee.email}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <UserIcon className="h-3 w-3" />
              <span>Unassigned</span>
            </div>
          )}
        </div>

        {/* Comment Count */}
        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
          <MessageSquare className="h-3 w-3 text-slate-400" />
          <span>{commentCount}</span>
        </div>
      </div>
    </article>
  );
}
