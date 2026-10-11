'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Ticket, Priority, ChecklistItem } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { toggleChecklistLocal, updateTicketLocal } from '@/store/boardSlice';
import { api } from '@/lib/api';
import {
  CheckSquare,
  Square,
  Zap,
  Edit3,
  Save,
  X,
  Code,
  FileCheck,
  GitBranch,
  UserCheck,
} from 'lucide-react';

interface TicketDescriptionPanelProps {
  ticket: Ticket;
}

export function TicketDescriptionPanel({ ticket }: TicketDescriptionPanelProps) {
  const dispatch = useAppDispatch();
  const { users } = useAppSelector((state) => state.project);
  const { board } = useAppSelector((state) => state.board);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(ticket.title);
  const [editDescription, setEditDescription] = useState(ticket.description || '');
  const [editTechNotes, setEditTechNotes] = useState(ticket.technicalNotes || '');
  const [editPriority, setEditPriority] = useState<Priority>(ticket.priority);
  const [editStoryPoints, setEditStoryPoints] = useState(ticket.storyPoints);
  const [editAssigneeId, setEditAssigneeId] = useState(ticket.assigneeId || '');
  const [isSaving, setIsSaving] = useState(false);

  // Toggle Acceptance Criteria Checklist Item
  const handleToggleCriteria = async (item: ChecklistItem) => {
    dispatch(
      toggleChecklistLocal({
        ticketId: ticket.id,
        type: 'acceptance',
        itemId: item.id,
      })
    );

    const updatedCriteria = ticket.acceptanceCriteria.map((c) =>
      c.id === item.id ? { ...c, completed: !c.completed } : c
    );

    try {
      await api.updateTicket(ticket.id, {
        acceptanceCriteria: updatedCriteria,
      });
    } catch (err) {
      console.error('Failed to sync checklist update:', err);
    }
  };

  // Toggle PR Checklist Item
  const handleTogglePrItem = async (item: ChecklistItem) => {
    dispatch(
      toggleChecklistLocal({
        ticketId: ticket.id,
        type: 'pr',
        itemId: item.id,
      })
    );

    const updatedPr = ticket.prChecklist.map((c) =>
      c.id === item.id ? { ...c, completed: !c.completed } : c
    );

    try {
      await api.updateTicket(ticket.id, {
        prChecklist: updatedPr,
      });
    } catch (err) {
      console.error('Failed to sync PR checklist update:', err);
    }
  };

  // Change Column / Status
  const handleColumnChange = async (newColId: string) => {
    try {
      const res = await api.updateTicket(ticket.id, { columnId: newColId });
      if (res.success && res.ticket) {
        dispatch(updateTicketLocal(res.ticket));
      }
    } catch (err) {
      console.error('Failed to update ticket column:', err);
    }
  };

  // Save Full Edit
  const handleSaveEdits = async () => {
    try {
      setIsSaving(true);
      const res = await api.updateTicket(ticket.id, {
        title: editTitle,
        description: editDescription,
        technicalNotes: editTechNotes,
        priority: editPriority,
        storyPoints: editStoryPoints,
        assigneeId: editAssigneeId || null,
      });
      if (res.success && res.ticket) {
        dispatch(updateTicketLocal(res.ticket));
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Failed to save ticket edits:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const acList = Array.isArray(ticket.acceptanceCriteria) ? ticket.acceptanceCriteria : [];
  const completedAC = acList.filter((c) => c.completed).length;
  const totalAC = acList.length;
  const acPercentage = totalAC > 0 ? Math.round((completedAC / totalAC) * 100) : 0;

  const prList = Array.isArray(ticket.prChecklist) ? ticket.prChecklist : [];
  const completedPR = prList.filter((p) => p.completed).length;
  const totalPR = prList.length;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Column Selector */}
          {board && (
            <select
              value={ticket.columnId}
              onChange={(e) => handleColumnChange(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {board.columns.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
          )}

          <Badge variant="priority" priority={ticket.priority} size="md" />

          <span className="flex items-center text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
            <Zap className="h-3 w-3 mr-1 text-indigo-400" />
            {ticket.storyPoints} Story Points
          </span>
        </div>

        {/* Edit Button */}
        <div>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="gap-1"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isSaving}
                onClick={handleSaveEdits}
                className="gap-1"
              >
                <Save className="h-3.5 w-3.5" />
                Save Changes
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="gap-1 text-xs"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit Ticket
            </Button>
          )}
        </div>
      </div>

      {/* Title & Description Section */}
      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              Ticket Title
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Priority
              </label>
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as Priority)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
              >
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Story Points
              </label>
              <input
                type="number"
                value={editStoryPoints}
                onChange={(e) => setEditStoryPoints(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Assignee
              </label>
              <select
                value={editAssigneeId}
                onChange={(e) => setEditAssigneeId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              Description (Markdown)
            </label>
            <textarea
              rows={5}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              Technical Notes
            </label>
            <textarea
              rows={4}
              value={editTechNotes}
              onChange={(e) => setEditTechNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight mb-3">
            {ticket.title}
          </h2>

          {/* Assignee & Labels banner */}
          <div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-indigo-400" />
              <span>Assignee:</span>
              <span className="text-slate-200 font-medium">
                {ticket.assignee?.name || 'Unassigned'}
              </span>
            </div>

            {ticket.labels && ticket.labels.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span>Labels:</span>
                <div className="flex flex-wrap gap-1">
                  {ticket.labels.map((l, i) => (
                    <Badge key={i} variant="label" size="sm">
                      #{l}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Description Body */}
          <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 mb-6">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {ticket.description || '*No description provided.*'}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Interactive Acceptance Criteria Checklist */}
      <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Acceptance Criteria
            </h3>
          </div>
          <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            {completedAC}/{totalAC} completed ({acPercentage}%)
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
            style={{ width: `${acPercentage}%` }}
          />
        </div>

        {/* Interactive Checklist Items */}
        <div className="space-y-2 pt-2">
          {acList.map((item) => (
            <div
              key={item.id}
              onClick={() => handleToggleCriteria(item)}
              className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                item.completed
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-400'
                  : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'
              }`}
            >
              <button
                type="button"
                className="mt-0.5 flex-shrink-0 text-emerald-400 transition-transform active:scale-90"
              >
                {item.completed ? (
                  <CheckSquare className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Square className="h-4 w-4 text-slate-500 hover:text-slate-300" />
                )}
              </button>
              <span
                className={`text-xs leading-relaxed ${
                  item.completed ? 'line-through text-slate-500' : 'text-slate-200'
                }`}
              >
                {item.text}
              </span>
            </div>
          ))}

          {acList.length === 0 && (
            <p className="text-xs text-slate-500 italic">No acceptance criteria defined.</p>
          )}
        </div>
      </div>

      {/* Technical Notes */}
      {ticket.technicalNotes && (
        <div className="space-y-2 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Technical Notes & Implementation Strategy
            </h3>
          </div>
          <div className="prose prose-invert prose-xs max-w-none text-slate-300 font-mono text-[11px] bg-slate-950 p-3 rounded-lg border border-slate-800/80 leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {ticket.technicalNotes}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* PR Checklist */}
      {prList.length > 0 && (
        <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-100">
                Pull Request Checklist
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {completedPR}/{totalPR} checked
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            {prList.map((item) => (
              <div
                key={item.id}
                onClick={() => handleTogglePrItem(item)}
                className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                  item.completed
                    ? 'bg-indigo-950/20 border-indigo-500/20 text-slate-400'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <button
                  type="button"
                  className="mt-0.5 flex-shrink-0 text-indigo-400"
                >
                  {item.completed ? (
                    <CheckSquare className="h-3.5 w-3.5 text-indigo-400" />
                  ) : (
                    <Square className="h-3.5 w-3.5 text-slate-500" />
                  )}
                </button>
                <span className={item.completed ? 'line-through text-slate-500' : ''}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dependencies */}
      {ticket.dependencies && ticket.dependencies.length > 0 && (
        <div className="space-y-2 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-100">Dependencies</h3>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {ticket.dependencies.map((dep, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium"
              >
                {dep}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
