'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { socketClient } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Ticket,
  Comment,
  ProjectMember,
  TicketStatus,
  TicketPriority,
  TicketType,
} from '@/types';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import {
  X,
  Trash2,
  Save,
  MessageSquare,
  Edit2,
  User,
  Send,
  AlertTriangle,
  CheckSquare,
  Sparkles,
  RotateCw,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  MoreVertical,
  Bug,
  Circle,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface TicketDetailModalProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string;
  members: ProjectMember[];
  onTicketUpdated: (ticket: Ticket) => void;
  onTicketDeleted: (ticketId: string) => void;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

const parseChecklist = (items: any): ChecklistItem[] => {
  if (!items) return [];
  if (Array.isArray(items)) {
    return items.map((item, idx) => {
      if (typeof item === 'string') {
        return { id: `item-${idx}`, text: item, completed: false };
      }
      return {
        id: item.id || `item-${idx}`,
        text: item.text || String(item),
        completed: Boolean(item.completed),
      };
    });
  }
  return [];
};

function ticketDisplayKey(ticket: Ticket): string {
  if (ticket.sourceCandidateId) return ticket.sourceCandidateId;
  return ticket.id.slice(0, 8).toUpperCase();
}

function getInitials(username?: string | null, email?: string | null): string {
  const name = (username || email || 'U').trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function priorityDotClass(priority: TicketPriority): string {
  switch (priority) {
    case 'Critical':
      return 'bg-danger';
    case 'High':
      return 'bg-warning';
    case 'Medium':
      return 'bg-warning';
    case 'Low':
      return 'bg-tm';
    default:
      return 'bg-accent';
  }
}

function statusDotClass(status: TicketStatus): string {
  switch (status) {
    case 'Done':
      return 'bg-success';
    case 'In Progress':
      return 'bg-accent';
    default:
      return 'bg-tm';
  }
}

function TypeIcon({ ticketType }: { ticketType: TicketType }) {
  const className = 'h-3.5 w-3.5';
  switch (ticketType) {
    case 'Bug':
      return <Bug className={className} />;
    case 'Feature':
      return <Circle className={className} />;
    case 'Improvement':
      return <TrendingUp className={className} />;
    default:
      return <CheckSquare className={className} />;
  }
}

function checklistProgress(items: ChecklistItem[]) {
  const total = items.length;
  const done = items.filter((i) => i.completed).length;
  const pct = total > 0 ? (done / total) * 100 : 0;
  return { done, total, pct };
}

export function TicketDetailModal({
  ticket,
  isOpen,
  onClose,
  projectId,
  projectName,
  members,
  onTicketUpdated,
  onTicketDeleted,
}: TicketDetailModalProps) {
  const { user, fetchWithAuth } = useAuth();
  const { can } = usePermissions(projectId);

  const canUpdate = can('ticket.update');
  const canChangeStatus = can('ticket.change_status');
  const canAssign = can('ticket.assign');
  const canDelete = can('ticket.delete');
  const canEditAny = canUpdate || canChangeStatus || canAssign;

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TicketStatus>('To Do');
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  const [type, setType] = useState<TicketType>('Task');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [storyPoints, setStoryPoints] = useState<number | ''>('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<ChecklistItem[]>([]);
  const [technicalNotes, setTechnicalNotes] = useState<string>('');
  const [prChecklist, setPrChecklist] = useState<ChecklistItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Close assignee dropdown on outside click
  useEffect(() => {
    if (!isAssigneeDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(e.target as Node)) {
        setIsAssigneeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAssigneeDropdownOpen]);

  useEffect(() => {
    if (!showMoreMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMoreMenu]);

  // Delete Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Comments State
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [retryingCommentId, setRetryingCommentId] = useState<string | null>(null);
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({});
  const [mobileTab, setMobileTab] = useState<'details' | 'discussion'>('details');
  const [collabTab, setCollabTab] = useState<'discussion' | 'activity' | 'info'>('discussion');

  // Fetch comments callback
  const fetchComments = useCallback(async () => {
    if (!ticket) return;
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}/tickets/${ticket.id}/comments`);
      const data = await res.json();
      if (data.success && data.comments) {
        setComments(data.comments);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    }
  }, [ticket, projectId, fetchWithAuth]);

  // Sync state when ticket changes
  useEffect(() => {
    if (ticket) {
      setTitle(ticket.title);
      setDescription(ticket.description || '');
      setStatus(ticket.status);
      setPriority(ticket.priority);
      setType(ticket.type);
      const initialAssigneeIds =
        ticket.assignees && ticket.assignees.length > 0
          ? ticket.assignees.map((u) => u.id)
          : ticket.assigneeId
          ? [ticket.assigneeId]
          : [];
      setAssigneeIds(initialAssigneeIds);
      setStoryPoints(ticket.storyPoints ?? '');
      setAcceptanceCriteria(parseChecklist(ticket.acceptanceCriteria));
      setTechnicalNotes(ticket.technicalNotes || '');
      setPrChecklist(parseChecklist(ticket.prChecklist));
      setShowDeleteConfirm(false);
      setIsAssigneeDropdownOpen(false);
      setShowMoreMenu(false);
      setIsEditingDescription(false);
      setCopiedKey(false);

      fetchComments();
    }
  }, [ticket, fetchComments]);

  const handleToggleAssignee = (userId: string) => {
    if (!canAssign) return;
    setAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Auto-refresh polling while any comment is PROCESSING or PENDING
  useEffect(() => {
    if (!isOpen || !ticket) return;

    const hasActiveAiProcessing = comments.some(
      (c) => c.isAi && (c.aiProcessingStatus === 'PROCESSING' || c.aiProcessingStatus === 'PENDING')
    );

    let interval: NodeJS.Timeout | null = null;
    if (hasActiveAiProcessing) {
      interval = setInterval(() => {
        fetchComments();
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, ticket, comments, fetchComments]);

  // Real-time socket listener for ticket comments
  useEffect(() => {
    if (!isOpen || !ticket) return;
    try {
      const socket = socketClient.connect();
      socketClient.joinTicket(ticket.id);

      const handleUpdate = () => {
        fetchComments();
      };

      socket.on('message:created', handleUpdate);
      socket.on('comment:created', handleUpdate);
      socket.on('comment:updated', handleUpdate);

      return () => {
        socketClient.leaveTicket(ticket.id);
        socket.off('message:created', handleUpdate);
        socket.off('comment:created', handleUpdate);
        socket.off('comment:updated', handleUpdate);
      };
    } catch (err) {
      console.warn('Socket connection error in TicketDetailModal:', err);
    }
  }, [isOpen, ticket, fetchComments]);

  if (!isOpen || !ticket) return null;

  // Save changes
  const handleSave = async () => {
    try {
      if (!title.trim()) {
        toast.error('Ticket title cannot be empty.');
        return;
      }
      if (title.trim().length < 2) {
        toast.error('Ticket title must be at least 2 characters.');
        return;
      }
      if (title.trim().length > 250) {
        toast.error('Ticket title cannot exceed 250 characters.');
        return;
      }
      if (storyPoints !== '') {
        const num = Number(storyPoints);
        if (Number.isNaN(num) || num < 0 || !Number.isInteger(num)) {
          toast.error('Story points must be a non-negative whole number.');
          return;
        }
        if (num > 100) {
          toast.error('Story points cannot exceed 100.');
          return;
        }
      }

      setIsSaving(true);

      // Compute dirty fields so we only send what was modified
      const updates: any = {};
      if (title.trim() !== ticket.title) updates.title = title.trim();
      if ((description?.trim() || null) !== (ticket.description || null)) updates.description = description?.trim() || null;
      if (status !== ticket.status) updates.status = status;
      if (priority !== ticket.priority) updates.priority = priority;
      if (type !== ticket.type) updates.type = type;
      const ticketAssigneeIds =
        ticket.assignees && ticket.assignees.length > 0
          ? ticket.assignees.map((u) => u.id)
          : ticket.assigneeId
          ? [ticket.assigneeId]
          : [];
      const isAssigneesChanged =
        assigneeIds.length !== ticketAssigneeIds.length ||
        !assigneeIds.every((id) => ticketAssigneeIds.includes(id));

      if (isAssigneesChanged) {
        updates.assigneeIds = assigneeIds;
        updates.assigneeId = assigneeIds[0] || null;
      }
      const currentPts = storyPoints === '' ? null : Number(storyPoints);
      if (currentPts !== ticket.storyPoints) updates.storyPoints = currentPts;
      if ((technicalNotes?.trim() || null) !== (ticket.technicalNotes || null)) updates.technicalNotes = technicalNotes?.trim() || null;
      if (JSON.stringify(acceptanceCriteria) !== JSON.stringify(ticket.acceptanceCriteria || [])) updates.acceptanceCriteria = acceptanceCriteria;
      if (JSON.stringify(prChecklist) !== JSON.stringify(ticket.prChecklist || [])) updates.prChecklist = prChecklist;

      // If user clicked save without editing anything
      if (Object.keys(updates).length === 0) {
        toast.success('Ticket saved (no changes)');
        return;
      }

      const res = await fetchWithAuth(
        `/api/projects/${projectId}/tickets/${ticket.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Failed to update ticket');
        return;
      }

      toast.success('Ticket updated successfully');
      onTicketUpdated(data.ticket);
    } catch (err: any) {
      toast.error(err.message || 'Error updating ticket');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete ticket
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await fetchWithAuth(
        `/api/projects/${projectId}/tickets/${ticket.id}`,
        {
          method: 'DELETE',
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Failed to delete ticket');
        return;
      }

      toast.success('Ticket deleted');
      onTicketDeleted(ticket.id);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting ticket');
    } finally {
      setIsDeleting(false);
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmittingComment) return;

    const commentText = newComment.trim();
    try {
      setIsSubmittingComment(true);
      const res = await fetchWithAuth(
        `/api/projects/${projectId}/tickets/${ticket.id}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: commentText }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Failed to add comment');
        return;
      }

      setComments((prev) => [...prev, data.comment]);
      setNewComment('');
      toast.success('Comment added');

      // Refresh comments soon so pending AI response appears
      setTimeout(fetchComments, 900);
    } catch (err: any) {
      toast.error(err.message || 'Error adding comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Retry AI Response
  const handleRetryAi = async (commentId: string) => {
    try {
      setRetryingCommentId(commentId);
      const res = await fetchWithAuth(
        `/api/projects/${projectId}/tickets/${ticket.id}/comments/${commentId}/retry`,
        {
          method: 'POST',
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Failed to retry AI response');
        return;
      }

      toast.success('AI response retry initiated');
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, aiProcessingStatus: 'PROCESSING', content: '' }
            : c
        )
      );
      setTimeout(fetchComments, 1200);
    } catch (err: any) {
      toast.error(err.message || 'Error retrying AI response');
    } finally {
      setRetryingCommentId(null);
    }
  };

  // Update Comment
  const handleSaveCommentEdit = async (commentId: string) => {
    if (!editCommentText.trim()) return;

    try {
      const res = await fetchWithAuth(
        `/api/projects/${projectId}/tickets/${ticket.id}/comments/${commentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: editCommentText.trim() }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Failed to update comment');
        return;
      }

      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? data.comment : c))
      );
      setEditingCommentId(null);
      toast.success('Comment updated');
    } catch (err: any) {
      toast.error(err.message || 'Error editing comment');
    }
  };

  // Delete Comment
  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetchWithAuth(
        `/api/projects/${projectId}/tickets/${ticket.id}/comments/${commentId}`,
        { method: 'DELETE' }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Failed to delete comment');
        return;
      }

      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success('Comment removed');
    } catch (err: any) {
      toast.error(err.message || 'Error deleting comment');
    }
  };

  const handleCopyKey = async () => {
    const key = ticketDisplayKey(ticket);
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(true);
      toast.success('Ticket key copied');
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      toast.error('Failed to copy ticket key');
    }
  };

  const acProgress = checklistProgress(acceptanceCriteria);
  const prProgress = checklistProgress(prChecklist);
  const ticketKey = ticketDisplayKey(ticket);
  const assignedMembers = members.filter((m) => assigneeIds.includes(m.user.id));
  const labelTags = [
    ...(ticket.module ? [ticket.module] : []),
    type,
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  const metadataSelectClass =
    'absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed';

  return (
    <div
      className="fixed inset-0 z-50 bg-[#080d14]/80 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="task-title"
        aria-modal="true"
        role="dialog"
        className="w-full max-w-[1260px] h-[min(830px,92vh)] bg-surface rounded-xl border border-border shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden text-tp"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="h-14 border-b border-border bg-surface/95 px-4 sm:px-5 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
            <div
              className="w-6 h-6 rounded bg-[#2a3649] flex items-center justify-center text-accent shrink-0"
              title={type}
            >
              <TypeIcon ticketType={type} />
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-tp tracking-tight shrink-0">
              <span>{ticketKey}</span>
              <button
                type="button"
                onClick={handleCopyKey}
                className="p-1 text-ts hover:text-tp rounded transition"
                title="Copy ticket key"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <span className="text-border hidden sm:inline">/</span>
            <div className="text-xs text-ts font-medium truncate max-w-[140px] sm:max-w-[240px] hidden sm:block">
              {projectName ? `${projectName} / Board` : 'Project / Board'}
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#202D48] text-accent border border-accent/30 shrink-0">
              <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', statusDotClass(status))} />
              {status}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              isLoading={isSaving}
              loadingText="Saving..."
              disabled={isSaving || !canEditAny}
              onClick={handleSave}
              className="gap-1.5 h-8 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              title={!canEditAny ? 'You do not have permission to edit this ticket' : 'Save changes'}
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>

            <button
              type="button"
              disabled
              title="Coming soon"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1d2736] border border-border text-xs text-tp font-medium opacity-60 cursor-not-allowed"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>Analyze Scope</span>
            </button>

            <div className="h-4 w-px bg-border mx-0.5 hidden md:block" />

            <div className="relative" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setShowMoreMenu((v) => !v)}
                className="p-1.5 rounded-md hover:bg-elevated text-ts hover:text-tp transition"
                title="More options"
                aria-expanded={showMoreMenu}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-1 min-w-[160px] bg-elevated border border-border rounded-lg shadow-lg z-30 py-1 animate-in fade-in zoom-in-95 duration-100">
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowDeleteConfirm(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-danger hover:bg-danger-subtle text-left"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete ticket
                    </button>
                  )}
                  {!canDelete && (
                    <p className="px-3 py-2 text-xs text-ts">No actions</p>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-elevated text-ts hover:text-tp transition ml-0.5"
              title="Close modal (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Delete Confirmation Alert Banner */}
        {showDeleteConfirm && (
          <div className="flex items-center justify-between p-4 bg-danger-subtle border-b border-danger/30 text-danger text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-danger" />
              <span className="font-medium">Are you sure you want to delete this ticket? This action cannot be undone.</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={isDeleting}
                onClick={handleDelete}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        )}

        {/* Mobile Tab Switcher */}
        <div className="md:hidden flex items-center border-b border-border bg-hover p-2 gap-2">
          <button
            type="button"
            onClick={() => setMobileTab('details')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              mobileTab === 'details'
                ? 'bg-accent text-canvas shadow-xs'
                : 'text-ts hover:text-tp'
            }`}
          >
            Ticket Details
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('discussion')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              mobileTab === 'discussion'
                ? 'bg-accent text-canvas shadow-xs'
                : 'text-ts hover:text-tp'
            }`}
          >
            <span>Discussion</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                mobileTab === 'discussion'
                  ? 'bg-canvas/20 text-canvas font-bold'
                  : 'bg-elevated text-ts border border-border'
              }`}
            >
              {comments.length}
            </span>
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden min-h-0 flex-col md:flex-row">
          <main
            className={cn(
              'w-full md:w-[64%] h-full overflow-y-auto px-6 sm:px-8 py-6 space-y-7 bg-surface border-r border-divider custom-scrollbar',
              mobileTab === 'details' ? 'flex flex-col' : 'hidden md:flex'
            )}
          >
            <section>
              <input
                id="task-title"
                type="text"
                value={title}
                disabled={!canUpdate}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-[22px] font-semibold tracking-tight text-tp leading-snug bg-transparent border-0 p-0 focus:outline-none focus:ring-0 placeholder:text-tm disabled:text-tm disabled:cursor-not-allowed hover:text-white transition"
                placeholder="Untitled ticket"
              />
            </section>

            <section
              aria-label="Task Metadata"
              className="p-4 rounded-lg bg-[#111720]/70 border border-divider space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center min-w-0">
                  <span className="w-24 text-ts shrink-0">Status</span>
                  <div className="relative inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#1a2330] border border-[#2b394b] text-tp font-medium">
                    <span className={cn('w-2 h-2 rounded-full', statusDotClass(status))} />
                    <span>{status}</span>
                    <ChevronDown className="w-3 h-3 text-ts ml-1 pointer-events-none" />
                    <select
                      value={status}
                      disabled={!canChangeStatus}
                      onChange={(e) => setStatus(e.target.value as TicketStatus)}
                      className={metadataSelectClass}
                      title={!canChangeStatus ? 'You do not have permission to change status' : undefined}
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center min-w-0">
                  <span className="w-24 text-ts shrink-0">Priority</span>
                  <div className="relative inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#1a2330] border border-[#2b394b] text-tp font-medium">
                    <span className={cn('w-2 h-2 rounded-full', priorityDotClass(priority))} />
                    <span>{priority}</span>
                    <ChevronDown className="w-3 h-3 text-ts ml-1 pointer-events-none" />
                    <select
                      value={priority}
                      disabled={!canUpdate}
                      onChange={(e) => setPriority(e.target.value as TicketPriority)}
                      className={metadataSelectClass}
                      title={!canUpdate ? 'You do not have permission to edit priority' : undefined}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center min-w-0 relative flex-wrap" ref={assigneeDropdownRef}>
                  <span className="w-24 text-ts shrink-0">Assignees</span>
                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    {assigneeIds.length === 0 ? (
                      <span className="text-tp font-medium text-ts flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        Unassigned
                      </span>
                    ) : (
                      <>
                        <div className="flex -space-x-1.5 items-center">
                          {assignedMembers.slice(0, 4).map((m) => (
                            <span
                              key={m.user.id}
                              className="w-6 h-6 rounded-full bg-[#3d4b63] border-2 border-surface flex items-center justify-center text-[10px] font-bold text-white"
                              title={m.user.username || m.user.email}
                            >
                              {getInitials(m.user.username, m.user.email)}
                            </span>
                          ))}
                        </div>
                        <span className="text-tp font-medium ml-1 truncate max-w-[140px]">
                          {assignedMembers
                            .map((m) => m.user.username || m.user.email?.split('@')[0])
                            .join(', ')}
                        </span>
                      </>
                    )}
                    {canAssign && (
                      <button
                        type="button"
                        onClick={() => setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)}
                        className="w-5 h-5 rounded-full border border-dashed border-border flex items-center justify-center text-ts hover:text-tp hover:border-tm transition text-[11px]"
                        title="Add or remove assignees"
                      >
                        +
                      </button>
                    )}
                  </div>
                  {isAssigneeDropdownOpen && (
                    <div className="absolute left-24 top-full mt-1 w-[min(100%,16rem)] bg-elevated border border-border rounded-xl shadow-lg z-30 p-1.5 max-h-56 overflow-y-auto custom-scrollbar">
                      <div className="px-2 py-1 text-[10px] font-semibold text-tm uppercase tracking-wider">
                        Assign Members
                      </div>
                      {members.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-tm">No members in project</div>
                      ) : (
                        members.map((m) => {
                          const isSelected = assigneeIds.includes(m.user.id);
                          return (
                            <button
                              key={m.user.id}
                              type="button"
                              onClick={() => handleToggleAssignee(m.user.id)}
                              className={cn(
                                'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors',
                                isSelected ? 'bg-accent/10 text-accent font-medium' : 'text-ts hover:bg-hover'
                              )}
                            >
                              <div className="flex items-center gap-2 truncate min-w-0">
                                <Avatar
                                  name={m.user.username}
                                  email={m.user.email}
                                  avatarUrl={m.user.avatarUrl}
                                  size="xs"
                                />
                                <div className="truncate">
                                  <p className="truncate font-medium">{m.user.username || m.user.email}</p>
                                  <p className="text-[10px] text-tm truncate">{m.role}</p>
                                </div>
                              </div>
                              <div
                                className={cn(
                                  'w-4 h-4 rounded border flex items-center justify-center shrink-0 ml-2',
                                  isSelected ? 'bg-accent border-accent text-canvas' : 'border-border bg-elevated'
                                )}
                              >
                                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center min-w-0">
                  <span className="w-24 text-ts shrink-0">Type</span>
                  <div className="relative inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1c2438] text-accent border border-accent/30 font-medium">
                    <TypeIcon ticketType={type} />
                    <span>{type}</span>
                    <select
                      value={type}
                      disabled={!canUpdate}
                      onChange={(e) => setType(e.target.value as TicketType)}
                      className={metadataSelectClass}
                      title={!canUpdate ? 'You do not have permission to edit type' : undefined}
                    >
                      <option value="Feature">Feature</option>
                      <option value="Bug">Bug</option>
                      <option value="Task">Task</option>
                      <option value="Improvement">Improvement</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center min-w-0">
                  <span className="w-24 text-ts shrink-0">Sprint</span>
                  <div className="flex items-center gap-1.5 text-tp min-w-0">
                    {ticket.sprint ? (
                      <span className="px-2 py-0.5 rounded bg-[#1a2330] border border-divider font-medium truncate">
                        {ticket.sprint}
                      </span>
                    ) : (
                      <span className="text-ts">—</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center min-w-0">
                  <span className="w-24 text-ts shrink-0">Estimate</span>
                  <div className="flex items-center gap-2 text-tp font-mono">
                    <input
                      type="number"
                      min={0}
                      value={storyPoints}
                      disabled={!canUpdate}
                      onChange={(e) => {
                        const v = e.target.value;
                        setStoryPoints(v === '' ? '' : Number(v));
                      }}
                      className="w-16 bg-[#1b2533] px-2 py-0.5 rounded border border-divider font-semibold text-xs text-tp focus:outline-none focus:border-accent disabled:opacity-60"
                      placeholder="—"
                    />
                    {storyPoints !== '' && <span className="text-[11px] text-ts font-sans">pts</span>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start min-w-0 sm:col-span-2">
                  <span className="w-24 text-ts shrink-0 pt-0.5">Labels</span>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {labelTags.length === 0 ? (
                      <span className="text-ts">—</span>
                    ) : (
                      labelTags.map((label) => (
                        <span
                          key={label}
                          className="px-2 py-0.5 rounded bg-[#1b2636] border border-[#2b3a4e] text-[11px] text-[#A6C0FE]"
                        >
                          {label}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs uppercase tracking-wider font-semibold text-ts">Description</h2>
                {canUpdate && !isEditingDescription && (
                  <button
                    type="button"
                    onClick={() => setIsEditingDescription(true)}
                    className="text-xs text-ts hover:text-tp transition px-2 py-1 rounded hover:bg-elevated"
                  >
                    Edit
                  </button>
                )}
                {canUpdate && isEditingDescription && (
                  <button
                    type="button"
                    onClick={() => setIsEditingDescription(false)}
                    className="text-xs text-accent hover:text-accent-hover transition px-2 py-1 rounded"
                  >
                    Done
                  </button>
                )}
              </div>
              {isEditingDescription && canUpdate ? (
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed specifications, background, or requirements..."
                  className="w-full p-3.5 rounded-lg bg-[#121922] border border-divider text-sm text-tp leading-relaxed placeholder:text-tm focus:outline-none focus:border-accent custom-scrollbar"
                />
              ) : (
                <div className="p-3.5 rounded-lg bg-[#121922] border border-divider text-sm text-tp leading-relaxed min-h-[4rem] whitespace-pre-wrap">
                  {description?.trim() ? description : (
                    <span className="text-ts italic">No description provided.</span>
                  )}
                </div>
              )}
            </section>

            {acceptanceCriteria.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <h2 className="text-xs uppercase tracking-wider font-semibold text-ts">Acceptance Criteria</h2>
                    <span className="text-xs font-mono text-ts shrink-0">
                      {acProgress.done} of {acProgress.total} completed
                    </span>
                  </div>
                  <div className="w-32 bg-[#1b2533] h-1.5 rounded-full overflow-hidden shrink-0">
                    <div
                      className="bg-success h-full rounded-full transition-all"
                      style={{ width: `${acProgress.pct}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  {acceptanceCriteria.map((ac, idx) => (
                    <label
                      key={ac.id || idx}
                      className={cn(
                        'flex items-start space-x-2.5 p-2 rounded hover:bg-[#16202c] transition group cursor-pointer',
                        !canUpdate && 'cursor-not-allowed opacity-80 hover:bg-transparent'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={ac.completed}
                        disabled={!canUpdate}
                        onChange={() => {
                          setAcceptanceCriteria((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, completed: !item.completed } : item
                            )
                          );
                        }}
                        className="mt-0.5 rounded bg-[#1e2a3b] border-border text-accent focus:ring-0 focus:ring-offset-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <span
                        className={cn(
                          'group-hover:text-tp transition',
                          ac.completed ? 'line-through text-ts' : 'text-tp'
                        )}
                      >
                        {ac.text}
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            )}

            {technicalNotes && (
              <section className="space-y-3">
                <h2 className="text-xs uppercase tracking-wider font-semibold text-ts">
                  Technical Notes &amp; Architecture
                </h2>
                <div className="p-3.5 rounded-lg bg-[#10161f] border border-divider space-y-3">
                  {/```|POST |GET |\/api\//.test(technicalNotes) ? (
                    <div className="font-mono text-[11px] bg-[#0c1017] p-3 rounded border border-border/80 text-blue-200/90 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                      {technicalNotes}
                    </div>
                  ) : (
                    <p className="text-xs text-ts leading-relaxed whitespace-pre-wrap">{technicalNotes}</p>
                  )}
                </div>
              </section>
            )}

            {prChecklist.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <h2 className="text-xs uppercase tracking-wider font-semibold text-ts">PR Checklist</h2>
                    <span className="text-xs font-mono text-ts shrink-0">
                      {prProgress.done} of {prProgress.total} completed
                    </span>
                  </div>
                  <div className="w-32 bg-[#1b2533] h-1.5 rounded-full overflow-hidden shrink-0">
                    <div
                      className="bg-success h-full rounded-full transition-all"
                      style={{ width: `${prProgress.pct}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  {prChecklist.map((item, idx) => (
                    <label
                      key={item.id || idx}
                      className={cn(
                        'flex items-start space-x-2.5 p-2 rounded hover:bg-[#16202c] transition group cursor-pointer',
                        !canUpdate && 'cursor-not-allowed opacity-80 hover:bg-transparent'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        disabled={!canUpdate}
                        onChange={() => {
                          setPrChecklist((prev) =>
                            prev.map((it, i) =>
                              i === idx ? { ...it, completed: !it.completed } : it
                            )
                          );
                        }}
                        className="mt-0.5 rounded bg-[#1e2a3b] border-border text-accent focus:ring-0 focus:ring-offset-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <span
                        className={cn(
                          'group-hover:text-tp transition',
                          item.completed ? 'line-through text-ts' : 'text-tp'
                        )}
                      >
                        {item.text}
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-3 pb-4">
              <h2 className="text-xs uppercase tracking-wider font-semibold text-ts">Attachments</h2>
              <p className="text-xs text-ts py-2">No attachments</p>
            </section>
          </main>

          <aside
            aria-label="Discussion and Activity"
            className={cn(
              'w-full md:w-[36%] h-full bg-navigation flex flex-col overflow-hidden min-h-0',
              mobileTab === 'discussion' ? 'flex' : 'hidden md:flex'
            )}
          >
            <nav
              className="h-11 border-b border-divider px-4 flex items-center gap-5 text-xs font-medium shrink-0 bg-[#0f151e]"
              role="tablist"
              aria-label="Collaboration"
            >
              {(
                [
                  { id: 'discussion' as const, label: 'Discussion', count: comments.length },
                  { id: 'activity' as const, label: 'Activity' },
                  { id: 'info' as const, label: 'Info & Telemetry' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={collabTab === tab.id}
                  onClick={() => setCollabTab(tab.id)}
                  className={cn(
                    'h-full border-b-2 flex items-center gap-1.5 transition focus:outline-none',
                    collabTab === tab.id
                      ? 'border-accent text-tp font-semibold'
                      : 'border-transparent text-ts hover:text-tp'
                  )}
                >
                  <span>{tab.label}</span>
                  {'count' in tab && tab.count !== undefined && (
                    <span className="bg-[#1e2a3c] text-accent px-1.5 py-0.5 rounded-full text-[10px]">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {collabTab === 'activity' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar text-xs">
                <div className="rounded-lg border border-divider bg-[#17202c] p-3 space-y-1">
                  <p className="font-medium text-tp">Ticket created</p>
                  <p className="text-ts">
                    {new Date(ticket.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-divider bg-[#17202c] p-3 space-y-1">
                  <p className="font-medium text-tp">Last updated</p>
                  <p className="text-ts">
                    {new Date(ticket.updatedAt).toLocaleString()}
                  </p>
                </div>
                {[...comments]
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                  )
                  .map((comment) => (
                    <div
                      key={`activity-${comment.id}`}
                      className="rounded-lg border border-divider bg-[#17202c] p-3 space-y-1"
                    >
                      <p className="font-medium text-tp">
                        {comment.isAi
                          ? 'AI guidance posted'
                          : `${comment.user?.username || 'User'} commented`}
                      </p>
                      <p className="text-ts">
                        {new Date(comment.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
              </div>
            )}

            {collabTab === 'info' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar text-xs">
                <div className="rounded-lg border border-divider bg-[#17202c] p-3 space-y-2">
                  <p className="uppercase tracking-wider text-tm text-[10px]">Identifiers</p>
                  <p className="font-medium text-tp font-mono break-all">{ticket.id}</p>
                  {ticket.sourceCandidateId && (
                    <p className="text-ts">
                      Source: <span className="font-mono text-tp">{ticket.sourceCandidateId}</span>
                    </p>
                  )}
                </div>
                <div className="rounded-lg border border-divider bg-[#17202c] p-3 space-y-2">
                  <p className="uppercase tracking-wider text-tm text-[10px]">People</p>
                  <p className="text-ts">
                    Reporter:{' '}
                    <span className="text-tp font-medium">{ticket.reporter?.username || 'System'}</span>
                  </p>
                  <p className="text-ts">
                    Created:{' '}
                    <span className="text-tp">{new Date(ticket.createdAt).toLocaleString()}</span>
                  </p>
                </div>
                <div className="rounded-lg border border-divider bg-[#17202c] p-3 space-y-2">
                  <p className="uppercase tracking-wider text-tm text-[10px]">Status snapshot</p>
                  <p className="text-ts">
                    Status: <span className="text-tp">{status}</span>
                  </p>
                  <p className="text-ts">
                    Priority: <span className="text-tp">{priority}</span>
                  </p>
                  <p className="text-ts">
                    Type: <span className="text-tp">{type}</span>
                  </p>
                  <p className="text-ts">
                    Story points:{' '}
                    <span className="text-tp">{storyPoints === '' ? '—' : storyPoints}</span>
                  </p>
                </div>
                <div className="rounded-lg border border-divider bg-[#17202c] p-3 space-y-2">
                  <p className="uppercase tracking-wider text-tm text-[10px]">Collaboration</p>
                  <p className="text-ts">
                    Comments: <span className="text-tp">{comments.length}</span>
                  </p>
                  <p className="text-ts">
                    Assignees: <span className="text-tp">{assigneeIds.length}</span>
                  </p>
                  <p className="text-ts">
                    AI replies:{' '}
                    <span className="text-tp">{comments.filter((c) => c.isAi).length}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Comments Stream */}
            <div
              className={`${
                collabTab === 'discussion' ? 'flex' : 'hidden'
              } flex-1 flex-col min-h-0 overflow-hidden`}
            >
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
              {comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-ts">
                  <MessageSquare className="h-8 w-8 text-tm mb-2" />
                  <span className="font-medium text-tp">No comments yet. Start the conversation!</span>
                  <span className="text-[10px] text-ts mt-1">AI assistant analyzes every inquiry automatically.</span>
                </div>
              ) : (
                comments.map((comment) => {
                  const isAuthor = comment.userId === user?.id;
                  const isEditing = editingCommentId === comment.id;

                  // ── Render AI Comment ──────────────────────────────────────────
                  if (comment.isAi) {
                    const isProcessing =
                      comment.aiProcessingStatus === 'PROCESSING' ||
                      comment.aiProcessingStatus === 'PENDING';
                    const isFailed = comment.aiProcessingStatus === 'FAILED';

                    return (
                      <div
                        key={comment.id}
                        className="p-3.5 rounded-lg bg-[#17202c] border border-accent/30 space-y-2.5 relative overflow-hidden"
                      >
                        {/* Top decorative accent line */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent via-accent-hover to-transparent" />

                        {/* AI Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-accent text-canvas flex items-center justify-center font-bold shadow-xs">
                              <Sparkles className="h-3 w-3 text-canvas" />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-tp text-xs">TaskPulse Tech Lead</span>
                              <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-accent-subtle text-accent border border-accent/30">
                                Staff Lead
                              </span>
                            </div>
                            <span className="text-[10px] text-tm">
                              {new Date(comment.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-tm font-medium hidden sm:flex">
                            <span className="w-1.5 h-1.5 rounded-full bg-success" />
                            <span>Context-Grounded Guidance</span>
                          </div>
                        </div>

                        {/* Processing State */}
                        {isProcessing && (
                          <div className="py-2.5 px-3 rounded-lg bg-accent-subtle border border-accent/30 flex items-center gap-2.5 text-accent">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                            <span className="font-medium text-xs">Analyzing ticket context and architectural notes...</span>
                          </div>
                        )}

                        {/* Failed State */}
                        {isFailed && (
                          <div className="space-y-2 p-3 rounded-lg bg-danger-subtle border border-danger/30 text-xs">
                            <div className="flex items-start gap-2 text-danger">
                              <AlertTriangle className="h-4 w-4 shrink-0 text-danger mt-0.5" />
                              <div className="space-y-1">
                                <p className="font-medium text-warning">Guidance generation could not be completed.</p>
                                <p className="text-[11px] text-danger/80">
                                  {comment.aiMetadata?.error || 'Temporary timeout or service limitation.'}
                                </p>
                              </div>
                            </div>
                            <div className="flex justify-end pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRetryAi(comment.id)}
                                disabled={retryingCommentId === comment.id}
                                className="text-xs h-7 px-2.5 gap-1.5 border-danger/30 text-danger hover:bg-danger-subtle"
                              >
                                <RotateCw className={`h-3 w-3 ${retryingCommentId === comment.id ? 'animate-spin' : ''}`} />
                                {retryingCommentId === comment.id ? 'Retrying...' : 'Retry Response'}
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Completed Content */}
                        {!isProcessing && !isFailed && (
                          <div className="space-y-3 pt-0.5">
                            <div className="text-tp leading-relaxed text-xs space-y-2">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  h1: ({ node, ...props }) => (
                                    <h1 className="text-sm font-bold text-tp mt-3 mb-1.5" {...props} />
                                  ),
                                  h2: ({ node, ...props }) => (
                                    <h2 className="text-xs font-bold text-tp mt-3 mb-1.5 pb-1 border-b border-divider" {...props} />
                                  ),
                                  h3: ({ node, ...props }) => (
                                    <h3 className="text-xs font-semibold text-tp mt-2.5 mb-1" {...props} />
                                  ),
                                  h4: ({ node, ...props }) => (
                                    <h4 className="text-[11px] font-semibold text-accent mt-2 mb-1" {...props} />
                                  ),
                                  p: ({ node, ...props }) => (
                                    <p className="text-tp text-xs mb-2 last:mb-0 leading-relaxed" {...props} />
                                  ),
                                  ul: ({ node, ...props }) => (
                                    <ul className="list-disc pl-4 space-y-1 my-1.5 text-xs text-tp" {...props} />
                                  ),
                                  ol: ({ node, ...props }) => (
                                    <ol className="list-decimal pl-4 space-y-1 my-1.5 text-xs text-tp" {...props} />
                                  ),
                                  li: ({ node, ...props }) => (
                                    <li className="text-tp leading-relaxed" {...props} />
                                  ),
                                  strong: ({ node, ...props }) => (
                                    <strong className="font-semibold text-tp" {...props} />
                                  ),
                                  hr: ({ node, ...props }) => (
                                    <hr className="my-2.5 border-border" {...props} />
                                  ),
                                  blockquote: ({ node, ...props }) => (
                                    <blockquote className="border-l-2 border-accent pl-3 py-1 my-2 bg-surface/80 rounded-r text-ts italic text-xs" {...props} />
                                  ),
                                  table: ({ node, ...props }) => (
                                    <div className="overflow-x-auto my-2.5 rounded-lg border border-border shadow-xs">
                                      <table className="w-full border-collapse text-left text-xs" {...props} />
                                    </div>
                                  ),
                                  thead: ({ node, ...props }) => (
                                    <thead className="bg-surface/90 border-b border-border text-ts font-semibold" {...props} />
                                  ),
                                  tbody: ({ node, ...props }) => (
                                    <tbody className="divide-y divide-divider bg-elevated" {...props} />
                                  ),
                                  tr: ({ node, ...props }) => (
                                    <tr className="hover:bg-hover/60 transition-colors" {...props} />
                                  ),
                                  th: ({ node, ...props }) => (
                                    <th className="px-3 py-2 font-semibold text-tp text-xs" {...props} />
                                  ),
                                  td: ({ node, ...props }) => (
                                    <td className="px-3 py-2 text-ts align-top leading-relaxed text-xs" {...props} />
                                  ),
                                  code: ({ node, className, children, ...props }: any) => {
                                    const isInline = !className;
                                    return isInline ? (
                                      <code className="px-1.5 py-0.5 rounded bg-elevated text-accent font-mono text-[11px] font-medium border border-border/60" {...props}>
                                        {children}
                                      </code>
                                    ) : (
                                      <div className="relative group my-2">
                                        <pre className="p-3 rounded-lg bg-canvas text-tp overflow-x-auto font-mono text-[11px] leading-relaxed border border-border shadow-card">
                                          <code>{children}</code>
                                        </pre>
                                      </div>
                                    );
                                  },
                                }}
                              >
                                {comment.content}
                              </ReactMarkdown>
                            </div>

                            {/* Citations Accordion */}
                            {Array.isArray(comment.aiMetadata?.citations) && comment.aiMetadata.citations.length > 0 && (
                              <div className="pt-2 border-t border-border">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedCitations((prev) => ({
                                      ...prev,
                                      [comment.id]: !prev[comment.id],
                                    }))
                                  }
                                  className="flex items-center gap-1.5 text-[11px] text-accent hover:text-accent font-medium"
                                >
                                  {expandedCitations[comment.id] ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                  <span>Grounded in {comment.aiMetadata.citations.length} Knowledge References</span>
                                </button>
                                {expandedCitations[comment.id] && (
                                  <div className="mt-2 space-y-1.5 pl-3 border-l border-accent/40">
                                    {comment.aiMetadata.citations.map((c: any, cIdx: number) => (
                                      <div key={cIdx} className="text-[11px] text-ts space-y-0.5">
                                        <div className="flex items-center gap-1.5 font-medium text-tp">
                                          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                                          <span>{c.section || 'General Reference'}</span>
                                          {c.distance !== undefined && (
                                            <span className="text-[9px] text-ts font-mono">
                                              (score: {c.distance})
                                            </span>
                                          )}
                                        </div>
                                        {c.snippet && <p className="text-[10px] text-ts italic pl-3">{c.snippet}</p>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // ── Render Human Comment ───────────────────────────────────────
                  const initials = getInitials(
                    comment.user?.username,
                    comment.user?.email
                  );
                  return (
                    <article key={comment.id} className="flex space-x-3 group">
                      <div className="w-7 h-7 rounded-full bg-[#3d4b63] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        {initials}
                      </div>
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <span className="font-semibold text-tp">
                              {comment.user?.username || 'Team Member'}
                            </span>
                            <span className="text-[10px] text-ts">
                              {new Date(comment.createdAt).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {isAuthor && (
                            <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditCommentText(comment.content);
                                }}
                                className="p-1 rounded text-ts hover:text-tp"
                                title="Edit"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(comment.id)}
                                className="p-1 rounded text-ts hover:text-danger"
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              rows={3}
                              value={editCommentText}
                              onChange={(e) => setEditCommentText(e.target.value)}
                              className="w-full p-2.5 rounded-lg bg-[#17202c] border border-divider text-xs text-tp focus:outline-none focus:border-accent"
                            />
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingCommentId(null)}
                                className="px-2 py-0.5 text-[11px] text-ts"
                              >
                                Cancel
                              </button>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleSaveCommentEdit(comment.id)}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-[#17202c] p-2.5 rounded-lg border border-divider text-tp leading-relaxed whitespace-pre-wrap">
                            {comment.content}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            <footer className="p-3 border-t border-divider bg-[#0e141d] shrink-0">
              <form onSubmit={handleAddComment}>
                <div className="bg-elevated border border-border rounded-lg p-2.5 focus-within:border-accent/70 transition">
                  <textarea
                    rows={2}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment or type @ to mention..."
                    className="w-full bg-transparent border-0 p-0 text-xs text-tp placeholder:text-ts/60 focus:ring-0 resize-none font-sans outline-none"
                  />
                  <div className="flex items-center justify-end pt-2 border-t border-[#293647] mt-1.5">
                    <button
                      type="submit"
                      disabled={!newComment.trim() || isSubmittingComment}
                      className="bg-accent hover:bg-accent-hover text-canvas font-semibold px-3 py-1 text-xs rounded transition flex items-center gap-1 disabled:opacity-40"
                    >
                      <span>{isSubmittingComment ? 'Sending…' : 'Send'}</span>
                      <Send className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </form>
            </footer>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
