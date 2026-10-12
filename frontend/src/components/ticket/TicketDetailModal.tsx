'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
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

  // Sync state when ticket changes
  useEffect(() => {
    if (ticket) {
      setTitle(ticket.title);
      setDescription(ticket.description || '');
      setStatus(ticket.status);
      setPriority(ticket.priority);
      setType(ticket.type);
      setAssigneeId(ticket.assigneeId || '');
      setShowDeleteConfirm(false);

      // Fetch comments
      fetchWithAuth(`/api/projects/${projectId}/tickets/${ticket.id}/comments`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.comments) {
            setComments(data.comments);
          }
        })
        .catch((err) => console.error('Failed to fetch comments:', err));
    }
  }, [ticket, projectId, fetchWithAuth]);

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

    try {
      setIsSubmittingComment(true);
      const res = await fetchWithAuth(
        `/api/projects/${projectId}/tickets/${ticket.id}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: newComment.trim() }),
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
    } catch (err: any) {
      toast.error(err.message || 'Error adding comment');
    } finally {
      setIsSubmittingComment(false);
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
      <div className="relative flex flex-col w-full max-w-4xl h-[92vh] bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-slate-400 bg-slate-800/90 px-2.5 py-1 rounded-md border border-slate-700">
              #{ticket.id.slice(0, 8).toUpperCase()}
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="type" type={type} size="sm" />
              <Badge variant="priority" priority={priority} size="sm" />
              <Badge variant="status" status={status} size="sm" />
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
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors"
              title="Delete Ticket"
            >
              <Trash2 className="h-4 w-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Alert Banner */}
        {showDeleteConfirm && (
          <div className="flex items-center justify-between p-4 bg-rose-950/40 border-b border-rose-500/30 text-rose-300 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
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
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar border-r border-slate-800/80">
            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Ticket Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-semibold text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Description
              </label>
              <textarea
                rows={7}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed specifications, reproduction steps, or requirements..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 leading-relaxed placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 custom-scrollbar"
              />
            </div>

            {/* Workflow Attributes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TicketStatus)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as TicketType)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Feature">Feature</option>
                  <option value="Bug">Bug</option>
                  <option value="Task">Task</option>
                  <option value="Improvement">Improvement</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Assignee
                </label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
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
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span>Reporter:</span>
                <span className="text-slate-300 font-medium">
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
          <div className="w-full md:w-[42%] flex flex-col bg-slate-950/80">
            {/* Comments Header */}
            <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Comments & Discussion ({comments.length})
                </h3>
              </div>
            </div>

            {/* Comments Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
              {comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 text-xs">
                  <MessageSquare className="h-8 w-8 text-slate-700 mb-2" />
                  <span>No comments yet. Start the conversation!</span>
                </div>
              ) : (
                comments.map((comment) => {
                  const isAuthor = comment.userId === user?.id;
                  const isEditing = editingCommentId === comment.id;

                  return (
                    <div
                      key={comment.id}
                      className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img
                            src={
                              comment.user?.avatarUrl ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                comment.user?.username || 'U'
                              )}`
                            }
                            alt={comment.user?.username}
                            className="w-5 h-5 rounded-full object-cover bg-slate-800"
                          />
                          <span className="font-semibold text-slate-200">
                            {comment.user?.username}
                          </span>
                          <span className="text-[10px] text-slate-500">
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
                              className="p-1 rounded text-slate-500 hover:text-slate-300"
                              title="Edit"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="p-1 rounded text-slate-500 hover:text-rose-400"
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
                            className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingCommentId(null)}
                              className="px-2 py-0.5 text-[11px] text-slate-400"
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
                        <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Add Comment Input */}
            <form onSubmit={handleAddComment} className="p-3 bg-slate-950 border-t border-slate-800">
              <div className="relative flex items-center">
                <textarea
                  rows={2}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="w-full resize-none rounded-xl bg-slate-900 border border-slate-800 pl-3.5 pr-12 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || isSubmittingComment}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-40"
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
