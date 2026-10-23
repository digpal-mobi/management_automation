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
import { PlusCircle } from 'lucide-react';

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
    }
  }, [isOpen, initialStatus, initialColumnId, columns, reset]);

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
          assigneeId: values.assigneeId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create ticket');
      }

      toast.success('Ticket created successfully');
      onTicketCreated(data.ticket);
      reset();
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

            <Select label="Assignee" {...register('assigneeId')}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.username} ({m.role})
                </option>
              ))}
            </Select>
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
