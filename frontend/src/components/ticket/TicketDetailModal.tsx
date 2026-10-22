'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { socketClient } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
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
import {
  X,
  Trash2,
  Save,
  MessageSquare,
  Edit2,
  User,
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

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TicketStatus>('To Do');
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  const [type, setType] = useState<TicketType>('Task');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [storyPoints, setStoryPoints] = useState<number | ''>('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<ChecklistItem[]>([]);
  const [technicalNotes, setTechnicalNotes] = useState<string>('');
  const [prChecklist, setPrChecklist] = useState<ChecklistItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

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
      setAssigneeId(ticket.assigneeId || '');
      setStoryPoints(ticket.storyPoints ?? '');
      setAcceptanceCriteria(parseChecklist(ticket.acceptanceCriteria));
      setTechnicalNotes(ticket.technicalNotes || '');
      setPrChecklist(parseChecklist(ticket.prChecklist));
      setShowDeleteConfirm(false);

      fetchComments();
    }
  }, [ticket, fetchComments]);

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
      const res = await fetchWithAuth(
        `/api/projects/${projectId}/tickets/${ticket.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description,
            status,
            priority,
            type,
            assigneeId: assigneeId || null,
            storyPoints: storyPoints === '' ? null : Number(storyPoints),
            acceptanceCriteria,
            technicalNotes: technicalNotes || null,
            prChecklist,
          }),
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
          method: 'PUT',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl h-[92vh] bg-[#000000] border border-[#2A2A2A] rounded-2xl shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A] bg-[#0A0A0A]">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-[#A3A3A3] bg-[#141414] px-2.5 py-1 rounded-md border border-[#2A2A2A]">
              #{ticket.id.slice(0, 8).toUpperCase()}
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="type" type={type} size="sm" />
              <Badge variant="priority" priority={priority} size="sm" />
              <Badge variant="status" status={status} size="sm" />
              {storyPoints !== '' && (
                <span className="text-xs font-mono font-medium text-[#A3A3A3] bg-[#141414] px-2 py-0.5 rounded border border-[#2A2A2A]">
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
              onClick={handleSave}
              className="gap-1.5"
            >
              <Save className="h-4 w-4" />
              Save
            </Button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-lg text-[#525252] hover:text-white hover:bg-[#141414] transition-colors"
              title="Delete Ticket"
            >
              <Trash2 className="h-4 w-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#525252] hover:text-white hover:bg-[#141414] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Alert Banner */}
        {showDeleteConfirm && (
          <div className="flex items-center justify-between p-4 bg-[#141414] border-b border-[#2A2A2A] text-white text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-white" />
              <span>Are you sure you want to delete this ticket? This action cannot be undone.</span>
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

        {/* Modal Body: Split Content & Discussion */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Details Panel */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar border-r border-[#2A2A2A]">
            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-[#A3A3A3] block mb-1">
                Ticket Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] text-sm font-semibold text-white focus:outline-none focus:ring-1 focus:ring-white"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-[#A3A3A3] block mb-1">
                Description
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed specifications, background, or requirements..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] text-xs text-white leading-relaxed placeholder-[#525252] focus:outline-none focus:ring-1 focus:ring-white custom-scrollbar"
              />
            </div>

            {/* Acceptance Criteria Checklist */}
            {acceptanceCriteria.length > 0 && (
              <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <CheckSquare className="h-4 w-4 text-white" />
                  <span>Acceptance Criteria</span>
                </div>
                <div className="space-y-2">
                  {acceptanceCriteria.map((ac, idx) => (
                    <label
                      key={ac.id || idx}
                      className="flex items-start gap-2.5 text-xs text-[#A3A3A3] hover:text-white cursor-pointer select-none transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={ac.completed}
                        onChange={() => {
                          setAcceptanceCriteria((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, completed: !item.completed } : item
                            )
                          );
                        }}
                        className="mt-0.5 rounded border-[#2A2A2A] bg-[#000000] accent-white"
                      />
                      <span className={ac.completed ? 'line-through text-[#525252]' : ''}>
                        {ac.text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Notes if present */}
            {technicalNotes && (
              <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Code2 className="h-4 w-4 text-white" />
                  <span>Technical Notes & Architecture</span>
                </div>
                <p className="text-xs text-[#A3A3A3] leading-relaxed whitespace-pre-wrap font-mono bg-[#000000] p-3 rounded-lg border border-[#2A2A2A]">
                  {technicalNotes}
                </p>
              </div>
            )}

            {/* PR Checklist if present */}
            {prChecklist.length > 0 && (
              <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <GitPullRequest className="h-4 w-4 text-white" />
                  <span>PR Checklist</span>
                </div>
                <div className="space-y-2">
                  {prChecklist.map((item, idx) => (
                    <label
                      key={item.id || idx}
                      className="flex items-start gap-2.5 text-xs text-[#A3A3A3] hover:text-white cursor-pointer select-none transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => {
                          setPrChecklist((prev) =>
                            prev.map((it, i) =>
                              i === idx ? { ...it, completed: !it.completed } : it
                            )
                          );
                        }}
                        className="mt-0.5 rounded border-[#2A2A2A] bg-[#000000] accent-white"
                      />
                      <span className={item.completed ? 'line-through text-[#525252]' : ''}>
                        {item.text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Workflow Attributes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-semibold text-[#A3A3A3] block mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TicketStatus)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-xs text-white focus:outline-none focus:ring-1 focus:ring-white cursor-pointer"
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#A3A3A3] block mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-xs text-white focus:outline-none focus:ring-1 focus:ring-white cursor-pointer"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#A3A3A3] block mb-1">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as TicketType)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-xs text-white focus:outline-none focus:ring-1 focus:ring-white cursor-pointer"
                >
                  <option value="Feature">Feature</option>
                  <option value="Bug">Bug</option>
                  <option value="Task">Task</option>
                  <option value="Improvement">Improvement</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#A3A3A3] block mb-1">
                  Assignee
                </label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-xs text-white focus:outline-none focus:ring-1 focus:ring-white cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.username}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Reporter Meta */}
            <div className="pt-4 border-t border-[#2A2A2A] flex items-center justify-between text-xs text-[#525252]">
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span>Reporter:</span>
                <span className="text-white font-medium">
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
          <div className="w-full md:w-[42%] flex flex-col bg-[#0A0A0A]">
            {/* Comments Header */}
            <div className="px-5 py-3.5 border-b border-[#2A2A2A] bg-[#000000] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-white" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Discussion ({comments.length})
                </h3>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-300">
                <Sparkles className="h-3 w-3 text-indigo-400" />
                <span>AI Assistant Active</span>
              </div>
            </div>

            {/* Comments Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
              {comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#525252] text-xs">
                  <MessageSquare className="h-8 w-8 text-[#2A2A2A] mb-2" />
                  <span>No comments yet. Start the conversation!</span>
                  <span className="text-[10px] text-[#404040] mt-1">AI assistant analyzes every inquiry automatically.</span>
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
                        className="p-3.5 rounded-xl bg-gradient-to-b from-[#15141E] to-[#0F0E14] border border-indigo-500/30 space-y-2.5 text-xs shadow-sm relative overflow-hidden"
                      >
                        {/* Top decorative accent line */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-transparent" />

                        {/* AI Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center font-bold">
                              <Bot className="h-3 w-3" />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-white">AI Ticket Assistant</span>
                              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                                AI
                              </span>
                            </div>
                            <span className="text-[10px] text-[#737373]">
                              {new Date(comment.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          {comment.aiMetadata?.provider && (
                            <span className="text-[10px] text-[#737373] hidden sm:inline-block font-mono">
                              {comment.aiMetadata.provider}
                            </span>
                          )}
                        </div>

                        {/* Processing State */}
                        {isProcessing && (
                          <div className="py-2.5 px-3 rounded-lg bg-indigo-950/20 border border-indigo-500/20 flex items-center gap-2.5 text-indigo-300">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                            <span className="font-medium text-xs">AI is analyzing context and preparing response...</span>
                          </div>
                        )}

                        {/* Failed State */}
                        {isFailed && (
                          <div className="space-y-2 p-3 rounded-lg bg-red-950/20 border border-red-500/30 text-xs">
                            <div className="flex items-start gap-2 text-red-300">
                              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                              <div className="space-y-1">
                                <p className="font-medium text-white">Response generation could not be completed.</p>
                                <p className="text-[11px] text-red-300/80">
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
                                className="text-xs h-7 px-2.5 gap-1.5 border-red-500/40 text-red-200 hover:bg-red-900/30 hover:text-white"
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
                            <div className="text-[#D4D4D4] leading-relaxed text-xs space-y-2">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  h3: ({ node, ...props }) => <h3 className="text-xs font-bold text-white mt-2 mb-1" {...props} />,
                                  h4: ({ node, ...props }) => <h4 className="text-[11px] font-semibold text-indigo-300 mt-2 mb-1" {...props} />,
                                  p: ({ node, ...props }) => <p className="text-[#D4D4D4] mb-1.5 last:mb-0 leading-relaxed" {...props} />,
                                  ul: ({ node, ...props }) => <ul className="list-disc pl-4 space-y-0.5 my-1" {...props} />,
                                  ol: ({ node, ...props }) => <ol className="list-decimal pl-4 space-y-0.5 my-1" {...props} />,
                                  li: ({ node, ...props }) => <li className="text-[#D4D4D4]" {...props} />,
                                  code: ({ node, className, children, ...props }: any) => {
                                    const isInline = !className;
                                    return isInline ? (
                                      <code className="px-1 py-0.5 rounded bg-[#1F1F1F] text-indigo-200 font-mono text-[11px]" {...props}>
                                        {children}
                                      </code>
                                    ) : (
                                      <div className="relative group my-2">
                                        <pre className="p-2.5 rounded-lg bg-[#000000] border border-[#2A2A2A] overflow-x-auto font-mono text-[11px] text-gray-200">
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
                              <div className="pt-2 border-t border-[#22222E]">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedCitations((prev) => ({
                                      ...prev,
                                      [comment.id]: !prev[comment.id],
                                    }))
                                  }
                                  className="flex items-center gap-1.5 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                                >
                                  {expandedCitations[comment.id] ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                  <span>Grounded in {comment.aiMetadata.citations.length} Knowledge References</span>
                                </button>
                                {expandedCitations[comment.id] && (
                                  <div className="mt-2 space-y-1.5 pl-3 border-l border-indigo-500/20">
                                    {comment.aiMetadata.citations.map((c: any, cIdx: number) => (
                                      <div key={cIdx} className="text-[11px] text-[#A3A3A3] space-y-0.5">
                                        <div className="flex items-center gap-1.5 font-medium text-white">
                                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                          <span>{c.section || 'General Reference'}</span>
                                          {c.distance !== undefined && (
                                            <span className="text-[9px] text-[#737373] font-mono">
                                              (score: {c.distance})
                                            </span>
                                          )}
                                        </div>
                                        {c.snippet && <p className="text-[10px] text-[#737373] italic pl-3">{c.snippet}</p>}
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
                      className="p-3.5 rounded-xl bg-[#141414] border border-[#2A2A2A] space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-[#2A2A2A] text-[10px] text-white flex items-center justify-center font-bold">
                            {(comment.user?.username || 'U')[0].toUpperCase()}
                          </div>
                          <span className="font-semibold text-white">
                            {comment.user?.username || 'Team Member'}
                          </span>
                          <span className="text-[10px] text-[#525252]">
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
                              className="p-1 rounded text-[#525252] hover:text-white"
                              title="Edit"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="p-1 rounded text-[#525252] hover:text-white"
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
                            className="w-full p-2 rounded-lg bg-[#000000] border border-[#2A2A2A] text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
                          />
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingCommentId(null)}
                              className="px-2 py-0.5 text-[11px] text-[#A3A3A3]"
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
                        <p className="text-[#A3A3A3] leading-relaxed whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Add Comment Input */}
            <form onSubmit={handleAddComment} className="p-3 bg-[#000000] border-t border-[#2A2A2A]">
              <div className="relative flex items-center">
                <textarea
                  rows={2}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="w-full resize-none rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] pl-3.5 pr-12 py-2 text-xs text-white placeholder-[#525252] focus:outline-none focus:ring-1 focus:ring-white"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || isSubmittingComment}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white text-black hover:bg-[#F5F5F5] transition-all disabled:opacity-30"
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
