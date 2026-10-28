'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Ticket, ProjectMember, TicketStatus, BoardColumn } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { PlusCircle, User, UserPlus, Check, ChevronDown, X } from 'lucide-react';

const createTicketFormSchema = z.object({
  title: z.string().min(1, 'Ticket title is required').max(200),
  description: z.string().optional(),
  type: z.enum(['Feature', 'Bug', 'Task', 'Improvement']),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  status: z.enum(['To Do', 'In Progress', 'Done']),
  columnId: z.string().optional(),
  assigneeId: z.string().optional(),
});

type CreateTicketFormValues = z.infer<typeof createTicketFormSchema>;

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  members: ProjectMember[];
  initialStatus?: TicketStatus;
  initialColumnId?: string;
  columns?: BoardColumn[];
  onTicketCreated: (ticket: Ticket) => void;
}

export function CreateTicketModal({
  isOpen,
  onClose,
  projectId,
  members,
  initialStatus = 'To Do',
  initialColumnId,
  columns = [],
  onTicketCreated,
}: CreateTicketModalProps) {
  const { fetchWithAuth } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
  const assigneeDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close assignee dropdown on click outside
  React.useEffect(() => {
    if (!isAssigneeOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(e.target as Node)) {
        setIsAssigneeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAssigneeOpen]);

  // Compute default columnId
  const defaultColId = initialColumnId || columns[0]?.id || '';

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateTicketFormValues>({
    resolver: zodResolver(createTicketFormSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'Task',
      priority: 'Medium',
      status: initialStatus,
      columnId: defaultColId,
      assigneeId: '',
    },
  });

  const selectedColId = watch('columnId');

  // Re-sync initial status and columnId when modal opens
  React.useEffect(() => {
    if (isOpen) {
      reset({
        title: '',
        description: '',
        type: 'Task',
        priority: 'Medium',
        status: initialStatus,
        columnId: initialColumnId || columns[0]?.id || '',
        assigneeId: '',
      });
      setSelectedAssigneeIds([]);
      setIsAssigneeOpen(false);
    }
  }, [isOpen, initialStatus, initialColumnId, columns, reset]);

  const handleToggleAssignee = (userId: string) => {
    setSelectedAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleRemoveAssignee = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAssigneeIds((prev) => prev.filter((id) => id !== userId));
  };

  // When column changes, synchronize status with column category if possible
  const handleColumnChange = (colId: string) => {
    setValue('columnId', colId);
    const col = columns.find((c) => c.id === colId);
    if (col && col.category) {
      setValue('status', col.category);
    }
  };

  const onSubmit = async (values: CreateTicketFormValues) => {
    try {
      setSubmitting(true);
      const res = await fetchWithAuth(`/api/projects/${projectId}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          columnId: values.columnId || null,
          assigneeIds: selectedAssigneeIds,
          assigneeId: selectedAssigneeIds[0] || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create ticket');
      }

      toast.success('Ticket created successfully');
      onTicketCreated(data.ticket);
      reset();
      setSelectedAssigneeIds([]);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error creating ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-[#003049]" />
            <span>Create New Ticket</span>
          </DialogTitle>
          <DialogDescription>
            Add a developer-ready ticket directly to any column on this project&apos;s Kanban board.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Title */}
          <Input
            label="Title *"
            placeholder="e.g. Implement user authentication middleware"
            error={errors.title?.message}
            {...register('title')}
          />

          {/* Description */}
          <Textarea
            label="Description"
            rows={4}
            placeholder="Detailed explanation of what needs to be built and why..."
            {...register('description')}
          />

          {/* Grid: Type, Priority, Board Column, Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Select label="Type" {...register('type')}>
              <option value="Feature">Feature</option>
              <option value="Bug">Bug</option>
              <option value="Task">Task</option>
              <option value="Improvement">Improvement</option>
            </Select>

            <Select label="Priority" {...register('priority')}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </Select>

            {columns.length > 0 ? (
              <Select
                label="Board Column *"
                value={selectedColId}
                onChange={(e) => handleColumnChange(e.target.value)}
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name} ({col.category})
                  </option>
                ))}
              </Select>
            ) : (
              <Select label="Status" {...register('status')}>
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </Select>
            )}

            <div ref={assigneeDropdownRef} className="relative">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Assignees {selectedAssigneeIds.length > 0 && `(${selectedAssigneeIds.length})`}
              </label>

              {/* Multi-assignee trigger box */}
              <div
                onClick={() => setIsAssigneeOpen(!isAssigneeOpen)}
                className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs transition-colors flex flex-wrap gap-1.5 items-center justify-between cursor-pointer hover:border-slate-300"
              >
                <div className="flex flex-wrap gap-1.5 items-center flex-1 min-w-0">
                  {selectedAssigneeIds.length === 0 ? (
                    <span className="text-xs text-slate-400 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      Unassigned
                    </span>
                  ) : (
                    members
                      .filter((m) => selectedAssigneeIds.includes(m.user.id))
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
                          <button
                            type="button"
                            onClick={(e) => handleRemoveAssignee(m.user.id, e)}
                            className="text-slate-400 hover:text-slate-600 rounded p-0.5"
                            title={`Remove ${m.user.username}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))
                  )}
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 pointer-events-none shrink-0 ml-1" />
              </div>

              {/* Dropdown Popover */}
              {isAssigneeOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-30 p-1.5 max-h-56 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Select Assignees
                  </div>
                  {members.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-400">No members in project</div>
                  ) : (
                    members.map((m) => {
                      const isSelected = selectedAssigneeIds.includes(m.user.id);
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

          {/* Form Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-[#E2E8F0]">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={submitting}
              leftIcon={<PlusCircle className="h-4 w-4" />}
            >
              Create Ticket
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
