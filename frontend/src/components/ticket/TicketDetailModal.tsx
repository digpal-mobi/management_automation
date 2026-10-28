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
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import {
  X,
  Trash2,
  Save,
  MessageSquare,
  Edit2,
  User,
  UserPlus,
  Clock,
  Send,
  AlertTriangle,
  CheckSquare,
  Code2,
  GitPullRequest,
  Bot,
  Sparkles,
  RotateCw,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Info,
} from 'lucide-react';

interface TicketDetailModalProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
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

export function TicketDetailModal({
  ticket,
  isOpen,
  onClose,
  projectId,
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
  const [storyPoints, setStoryPoints] = useState<number | ''>('');
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

      fetchComments();
    }
  }, [ticket, fetchComments]);

  const handleToggleAssignee = (userId: string) => {
    if (!canAssign) return;
    setAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleRemoveAssignee = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canAssign) return;
    setAssigneeIds((prev) => prev.filter((id) => id !== userId));
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
      setIsSaving(true);

      // Compute dirty fields so we only send what was modified
      const updates: any = {};
      if (title.trim() && title.trim() !== ticket.title) updates.title = title.trim();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#003049]/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl h-[92vh] bg-white border border-[#E2E8F0] rounded-2xl shadow-dropdown overflow-hidden text-[#17212B]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-white">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-[#003049] bg-[#EFF5F9] px-2.5 py-1 rounded-md border border-[#669BBC]/30">
              #{ticket.id.slice(0, 8).toUpperCase()}
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="type" type={type} size="sm" />
              <Badge variant="priority" priority={priority} size="sm" />
              <Badge variant="status" status={status} size="sm" />
              {storyPoints !== '' && (
                <span className="text-xs font-mono font-medium text-[#003049] bg-[#EFF5F9] px-2 py-0.5 rounded border border-[#669BBC]/30">
                  {storyPoints} story points
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              isLoading={isSaving}
              disabled={isSaving || !canEditAny}
              onClick={handleSave}
              className="gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!canEditAny ? 'You do not have permission to edit this ticket' : 'Save changes'}
            >
              <Save className="h-4 w-4" />
              Save
            </Button>

            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-lg text-[#526174] hover:text-[#C1121F] hover:bg-[#FDF2F2] transition-colors"
                title="Delete Ticket"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#526174] hover:text-[#17212B] hover:bg-[#F1F4F7] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Alert Banner */}
        {showDeleteConfirm && (
          <div className="flex items-center justify-between p-4 bg-[#FDF2F2] border-b border-[#FDE8E8] text-[#C1121F] text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#C1121F]" />
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
        <div className="md:hidden flex items-center border-b border-[#E2E8F0] bg-[#F1F4F7] p-2 gap-2">
          <button
            type="button"
            onClick={() => setMobileTab('details')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              mobileTab === 'details'
                ? 'bg-[#003049] text-white shadow-xs'
                : 'text-[#526174] hover:text-[#17212B]'
            }`}
          >
            Ticket Details
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('discussion')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              mobileTab === 'discussion'
                ? 'bg-[#003049] text-white shadow-xs'
                : 'text-[#526174] hover:text-[#17212B]'
            }`}
          >
            <span>Discussion</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                mobileTab === 'discussion'
                  ? 'bg-white/20 text-white font-bold'
                  : 'bg-white text-[#526174] border border-[#E2E8F0]'
              }`}
            >
              {comments.length}
            </span>
          </button>
        </div>

        {/* Modal Body: Split Content & Discussion */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Details Panel */}
          <div
            className={`${
              mobileTab === 'details' ? 'flex' : 'hidden'
            } md:flex flex-1 flex-col overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar border-r border-[#E2E8F0] bg-white`}
          >
            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-[#17212B] block mb-1">
                Ticket Title
              </label>
              <input
                type="text"
                value={title}
                disabled={!canUpdate}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-sm font-semibold text-[#17212B] focus:outline-none focus:border-[#003049] focus:ring-1 focus:ring-[#003049] disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-[#17212B] block mb-1">
                Description
              </label>
              <textarea
                rows={4}
                value={description}
                disabled={!canUpdate}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed specifications, background, or requirements..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#17212B] leading-relaxed placeholder-[#94A3B8] focus:outline-none focus:border-[#003049] focus:ring-1 focus:ring-[#003049] custom-scrollbar disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>

            {/* Acceptance Criteria Checklist */}
            {acceptanceCriteria.length > 0 && (
              <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#003049]">
                  <CheckSquare className="h-4 w-4 text-[#003049]" />
                  <span>Acceptance Criteria</span>
                </div>
                <div className="space-y-2">
                  {acceptanceCriteria.map((ac, idx) => (
                    <label
                      key={ac.id || idx}
                      className={`flex items-start gap-2.5 text-xs text-[#17212B] transition-colors ${
                        canUpdate ? 'hover:text-[#003049] cursor-pointer' : 'cursor-not-allowed opacity-80'
                      } select-none`}
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
                        className="mt-0.5 rounded border-[#CBD5E1] accent-[#003049] disabled:cursor-not-allowed"
                      />
                      <span className={ac.completed ? 'line-through text-[#94A3B8]' : ''}>
                        {ac.text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Notes if present - Papaya Whip Warm Surface */}
            {technicalNotes && (
              <div className="p-4 rounded-xl bg-[#FDF0D5]/40 border border-[#F7DFAB] space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#780000]">
                  <Code2 className="h-4 w-4 text-[#780000]" />
                  <span>Technical Notes & Architecture</span>
                </div>
                <p className="text-xs text-[#17212B] leading-relaxed whitespace-pre-wrap font-mono bg-white p-3 rounded-lg border border-[#F7DFAB]">
                  {technicalNotes}
                </p>
              </div>
            )}

            {/* PR Checklist if present */}
            {prChecklist.length > 0 && (
              <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#003049]">
                  <GitPullRequest className="h-4 w-4 text-[#003049]" />
                  <span>PR Checklist</span>
                </div>
                <div className="space-y-2">
                  {prChecklist.map((item, idx) => (
                    <label
                      key={item.id || idx}
                      className={`flex items-start gap-2.5 text-xs text-[#17212B] transition-colors ${
                        canUpdate ? 'hover:text-[#003049] cursor-pointer' : 'cursor-not-allowed opacity-80'
                      } select-none`}
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
                        className="mt-0.5 rounded border-[#CBD5E1] accent-[#003049] disabled:cursor-not-allowed"
                      />
                      <span className={item.completed ? 'line-through text-[#94A3B8]' : ''}>
                        {item.text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Workflow Attributes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 my-5 pt-4 border-t border-slate-100">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Status
                </label>
                <div className="relative">
                  <select
                    value={status}
                    disabled={!canChangeStatus}
                    onChange={(e) => setStatus(e.target.value as TicketStatus)}
                    className="w-full h-9 pl-3 pr-8 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 appearance-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs cursor-pointer hover:border-slate-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-50"
                    title={!canChangeStatus ? 'You do not have permission to change status' : undefined}
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Priority
                </label>
                <div className="relative">
                  <select
                    value={priority}
                    disabled={!canUpdate}
                    onChange={(e) => setPriority(e.target.value as TicketPriority)}
                    className="w-full h-9 pl-3 pr-8 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 appearance-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs cursor-pointer hover:border-slate-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-50"
                    title={!canUpdate ? 'You do not have permission to edit priority' : undefined}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Type
                </label>
                <div className="relative">
                  <select
                    value={type}
                    disabled={!canUpdate}
                    onChange={(e) => setType(e.target.value as TicketType)}
                    className="w-full h-9 pl-3 pr-8 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 appearance-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs cursor-pointer hover:border-slate-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-50"
                    title={!canUpdate ? 'You do not have permission to edit type' : undefined}
                  >
                    <option value="Feature">Feature</option>
                    <option value="Bug">Bug</option>
                    <option value="Task">Task</option>
                    <option value="Improvement">Improvement</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div ref={assigneeDropdownRef} className="relative">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Assignees {assigneeIds.length > 0 && `(${assigneeIds.length})`}
                  </label>
                  {canAssign && (
                    <button
                      type="button"
                      onClick={() => setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)}
                      className="text-[11px] font-medium text-primary hover:text-primary-dark flex items-center gap-1 hover:underline"
                    >
                      <UserPlus className="h-3 w-3" />
                      <span>{assigneeIds.length === 0 ? 'Assign' : 'Add/Remove'}</span>
                    </button>
                  )}
                </div>

                {/* Selected Assignee Box */}
                <div
                  onClick={() => canAssign && setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)}
                  className={`min-h-[38px] px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs transition-colors flex flex-wrap gap-1.5 items-center justify-between ${
                    canAssign ? 'cursor-pointer hover:border-slate-300' : 'cursor-not-allowed bg-slate-50 opacity-70'
                  }`}
                  title={!canAssign ? 'You do not have permission to assign tickets' : undefined}
                >
                  <div className="flex flex-wrap gap-1.5 items-center flex-1 min-w-0">
                    {assigneeIds.length === 0 ? (
                      <span className="text-xs text-slate-400 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        Unassigned
                      </span>
                    ) : (
                      members
                        .filter((m) => assigneeIds.includes(m.user.id))
                        .map((m) => (
                          <span
                            key={m.user.id}
                            className="inline-flex items-center gap-1.5 pl-1 pr-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700"
                          >
                            <Avatar
                              name={m.user.username}
                              email={m.user.email}
                              avatarUrl={m.user.avatarUrl}
                              size="xs"
                            />
                            <span className="max-w-[100px] truncate">{m.user.username || m.user.email}</span>
                            {canAssign && (
                              <button
                                type="button"
                                onClick={(e) => handleRemoveAssignee(m.user.id, e)}
                                className="text-slate-400 hover:text-slate-600 rounded p-0.5"
                                title={`Remove ${m.user.username}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </span>
                        ))
                    )}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 pointer-events-none shrink-0 ml-1" />
                </div>

                {/* Dropdown Popover */}
                {isAssigneeDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-30 p-1.5 max-h-56 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Assign Members
                    </div>
                    {members.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-slate-400">No members in project</div>
                    ) : (
                      members.map((m) => {
                        const isSelected = assigneeIds.includes(m.user.id);
                        return (
                          <button
                            key={m.user.id}
                            type="button"
                            onClick={() => handleToggleAssignee(m.user.id)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                              isSelected ? 'bg-primary/10 text-primary font-medium' : 'text-slate-700 hover:bg-slate-50'
                            }`}
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
                                <p className="text-[10px] text-slate-400 truncate">{m.role}</p>
                              </div>
                            </div>
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ml-2 transition-colors ${
                                isSelected ? 'bg-primary border-primary text-white' : 'border-slate-300 bg-white'
                              }`}
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
            </div>

            {/* Reporter Meta */}
            <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#526174]">
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span>Reporter:</span>
                <span className="text-[#17212B] font-semibold">
                  {ticket.reporter?.username || 'System'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Right Comments Panel */}
          <div
            className={`${
              mobileTab === 'discussion' ? 'flex' : 'hidden'
            } md:flex w-full md:w-[42%] flex-col bg-[#F7F8FA] min-h-0 overflow-hidden`}
          >
            {/* Comments Header */}
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#003049]" />
                <h3 className="text-xs font-bold text-[#17212B] uppercase tracking-wider">
                  Discussion ({comments.length})
                </h3>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EFF5F9] border border-[#669BBC]/30 text-[10px] text-[#003049] font-medium">
                <Sparkles className="h-3 w-3 text-[#003049]" />
                <span>AI Assistant Active</span>
              </div>
            </div>

            {/* Comments Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
              {comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#526174] text-xs">
                  <MessageSquare className="h-8 w-8 text-[#CBD5E1] mb-2" />
                  <span className="font-medium text-[#17212B]">No comments yet. Start the conversation!</span>
                  <span className="text-[10px] text-[#526174] mt-1">AI assistant analyzes every inquiry automatically.</span>
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
                        className="p-3.5 rounded-xl bg-white border border-[#669BBC]/30 space-y-2.5 text-xs shadow-card relative overflow-hidden"
                      >
                        {/* Top decorative accent line */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#003049] via-[#669BBC] to-transparent" />

                        {/* AI Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-[#003049] text-white flex items-center justify-center font-bold shadow-xs">
                              <Sparkles className="h-3 w-3 text-[#FDF0D5]" />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 text-xs">TaskPulse Tech Lead</span>
                              <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-[#EFF5F9] text-[#003049] border border-[#669BBC]/30">
                                Staff Lead
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {new Date(comment.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium hidden sm:flex">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Context-Grounded Guidance</span>
                          </div>
                        </div>

                        {/* Processing State */}
                        {isProcessing && (
                          <div className="py-2.5 px-3 rounded-lg bg-[#EFF5F9] border border-[#669BBC]/30 flex items-center gap-2.5 text-[#003049]">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#003049]" />
                            <span className="font-medium text-xs">Analyzing ticket context and architectural notes...</span>
                          </div>
                        )}

                        {/* Failed State */}
                        {isFailed && (
                          <div className="space-y-2 p-3 rounded-lg bg-[#FDF2F2] border border-[#FDE8E8] text-xs">
                            <div className="flex items-start gap-2 text-[#C1121F]">
                              <AlertTriangle className="h-4 w-4 shrink-0 text-[#C1121F] mt-0.5" />
                              <div className="space-y-1">
                                <p className="font-medium text-[#780000]">Guidance generation could not be completed.</p>
                                <p className="text-[11px] text-[#C1121F]/80">
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
                                className="text-xs h-7 px-2.5 gap-1.5 border-[#FDE8E8] text-[#C1121F] hover:bg-[#FDF2F2]"
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
                            <div className="text-slate-800 leading-relaxed text-xs space-y-2">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  h1: ({ node, ...props }) => (
                                    <h1 className="text-sm font-bold text-slate-900 mt-3 mb-1.5" {...props} />
                                  ),
                                  h2: ({ node, ...props }) => (
                                    <h2 className="text-xs font-bold text-slate-900 mt-3 mb-1.5 pb-1 border-b border-slate-100" {...props} />
                                  ),
                                  h3: ({ node, ...props }) => (
                                    <h3 className="text-xs font-semibold text-slate-900 mt-2.5 mb-1" {...props} />
                                  ),
                                  h4: ({ node, ...props }) => (
                                    <h4 className="text-[11px] font-semibold text-[#003049] mt-2 mb-1" {...props} />
                                  ),
                                  p: ({ node, ...props }) => (
                                    <p className="text-slate-800 text-xs mb-2 last:mb-0 leading-relaxed" {...props} />
                                  ),
                                  ul: ({ node, ...props }) => (
                                    <ul className="list-disc pl-4 space-y-1 my-1.5 text-xs text-slate-800" {...props} />
                                  ),
                                  ol: ({ node, ...props }) => (
                                    <ol className="list-decimal pl-4 space-y-1 my-1.5 text-xs text-slate-800" {...props} />
                                  ),
                                  li: ({ node, ...props }) => (
                                    <li className="text-slate-800 leading-relaxed" {...props} />
                                  ),
                                  strong: ({ node, ...props }) => (
                                    <strong className="font-semibold text-slate-900" {...props} />
                                  ),
                                  hr: ({ node, ...props }) => (
                                    <hr className="my-2.5 border-slate-200" {...props} />
                                  ),
                                  blockquote: ({ node, ...props }) => (
                                    <blockquote className="border-l-2 border-[#003049] pl-3 py-1 my-2 bg-slate-50/80 rounded-r text-slate-700 italic text-xs" {...props} />
                                  ),
                                  table: ({ node, ...props }) => (
                                    <div className="overflow-x-auto my-2.5 rounded-lg border border-slate-200 shadow-xs">
                                      <table className="w-full border-collapse text-left text-xs" {...props} />
                                    </div>
                                  ),
                                  thead: ({ node, ...props }) => (
                                    <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-semibold" {...props} />
                                  ),
                                  tbody: ({ node, ...props }) => (
                                    <tbody className="divide-y divide-slate-100 bg-white" {...props} />
                                  ),
                                  tr: ({ node, ...props }) => (
                                    <tr className="hover:bg-slate-50/60 transition-colors" {...props} />
                                  ),
                                  th: ({ node, ...props }) => (
                                    <th className="px-3 py-2 font-semibold text-slate-800 text-xs" {...props} />
                                  ),
                                  td: ({ node, ...props }) => (
                                    <td className="px-3 py-2 text-slate-700 align-top leading-relaxed text-xs" {...props} />
                                  ),
                                  code: ({ node, className, children, ...props }: any) => {
                                    const isInline = !className;
                                    return isInline ? (
                                      <code className="px-1.5 py-0.5 rounded bg-slate-100 text-[#003049] font-mono text-[11px] font-medium border border-slate-200/60" {...props}>
                                        {children}
                                      </code>
                                    ) : (
                                      <div className="relative group my-2">
                                        <pre className="p-3 rounded-lg bg-[#0F172A] text-slate-100 overflow-x-auto font-mono text-[11px] leading-relaxed border border-slate-800 shadow-sm">
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
                              <div className="pt-2 border-t border-[#E2E8F0]">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedCitations((prev) => ({
                                      ...prev,
                                      [comment.id]: !prev[comment.id],
                                    }))
                                  }
                                  className="flex items-center gap-1.5 text-[11px] text-[#003049] hover:text-[#669BBC] font-medium"
                                >
                                  {expandedCitations[comment.id] ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                  <span>Grounded in {comment.aiMetadata.citations.length} Knowledge References</span>
                                </button>
                                {expandedCitations[comment.id] && (
                                  <div className="mt-2 space-y-1.5 pl-3 border-l border-[#669BBC]/40">
                                    {comment.aiMetadata.citations.map((c: any, cIdx: number) => (
                                      <div key={cIdx} className="text-[11px] text-[#526174] space-y-0.5">
                                        <div className="flex items-center gap-1.5 font-medium text-[#17212B]">
                                          <span className="w-1.5 h-1.5 rounded-full bg-[#669BBC]" />
                                          <span>{c.section || 'General Reference'}</span>
                                          {c.distance !== undefined && (
                                            <span className="text-[9px] text-[#526174] font-mono">
                                              (score: {c.distance})
                                            </span>
                                          )}
                                        </div>
                                        {c.snippet && <p className="text-[10px] text-[#526174] italic pl-3">{c.snippet}</p>}
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
                  return (
                    <div
                      key={comment.id}
                      className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-card space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-[#669BBC] text-[10px] text-white flex items-center justify-center font-bold">
                            {(comment.user?.username || 'U')[0].toUpperCase()}
                          </div>
                          <span className="font-semibold text-[#17212B]">
                            {comment.user?.username || 'Team Member'}
                          </span>
                          <span className="text-[10px] text-[#526174]">
                            {new Date(comment.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {isAuthor && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditCommentText(comment.content);
                              }}
                              className="p-1 rounded text-[#526174] hover:text-[#003049]"
                              title="Edit"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="p-1 rounded text-[#526174] hover:text-[#C1121F]"
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2 pt-1">
                          <textarea
                            rows={2}
                            value={editCommentText}
                            onChange={(e) => setEditCommentText(e.target.value)}
                            className="w-full p-2 rounded-lg bg-white border border-[#E2E8F0] text-xs text-[#17212B] focus:outline-none focus:border-[#003049] focus:ring-1 focus:ring-[#003049]"
                          />
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingCommentId(null)}
                              className="px-2 py-0.5 text-[11px] text-[#526174]"
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
                        <p className="text-[#526174] leading-relaxed whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Add Comment Input */}
            <form onSubmit={handleAddComment} className="p-3 bg-white border-t border-[#E2E8F0]">
              <div className="relative flex items-center">
                <textarea
                  rows={2}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="w-full resize-none rounded-xl bg-white border border-[#E2E8F0] pl-3.5 pr-12 py-2 text-xs text-[#17212B] placeholder-[#94A3B8] focus:outline-none focus:border-[#003049] focus:ring-1 focus:ring-[#003049]"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || isSubmittingComment}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-[#003049] text-white hover:bg-[#002437] transition-all disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
