'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Ticket, ProjectMember, TicketStatus, TicketPriority, TicketType } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { PlusCircle } from 'lucide-react';

const createTicketFormSchema = z.object({
  title: z.string().min(1, 'Ticket title is required').max(200),
  description: z.string().optional(),
  type: z.enum(['Feature', 'Bug', 'Task', 'Improvement']),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  status: z.enum(['To Do', 'In Progress', 'Done']),
  assigneeId: z.string().optional(),
});

type CreateTicketFormValues = z.infer<typeof createTicketFormSchema>;

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  members: ProjectMember[];
  initialStatus?: TicketStatus;
  onTicketCreated: (ticket: Ticket) => void;
}

export function CreateTicketModal({
  isOpen,
  onClose,
  projectId,
  members,
  initialStatus = 'To Do',
  onTicketCreated,
}: CreateTicketModalProps) {
  const { fetchWithAuth } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTicketFormValues>({
    resolver: zodResolver(createTicketFormSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'Feature',
      priority: 'Medium',
      status: initialStatus,
      assigneeId: '',
    },
  });

  const onSubmit = async (values: CreateTicketFormValues) => {
    try {
      setSubmitting(true);
      const res = await fetchWithAuth(`/api/projects/${projectId}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          assigneeId: values.assigneeId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Failed to create ticket');
        return;
      }

      toast.success('Ticket created successfully!');
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
            <PlusCircle className="h-5 w-5 text-white" />
            <span>Create New Ticket</span>
          </DialogTitle>
          <DialogDescription>
            Add a developer-ready ticket directly to this project's Kanban board.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-[#A3A3A3] block mb-1">
              Title *
            </label>
            <input
              type="text"
              {...register('title')}
              placeholder="e.g. Implement user authentication middleware"
              className={`w-full px-3.5 py-2.5 rounded-xl bg-[#000000] border text-xs text-white placeholder-[#525252] focus:outline-none focus:ring-1 focus:ring-white ${
                errors.title ? 'border-white' : 'border-[#2A2A2A]'
              }`}
            />
            {errors.title && (
              <span className="text-[11px] text-[#A3A3A3] mt-1 block">
                {errors.title.message}
              </span>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-[#A3A3A3] block mb-1">
              Description
            </label>
            <textarea
              rows={4}
              {...register('description')}
              placeholder="Detailed explanation of what needs to be built and why..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#000000] border border-[#2A2A2A] text-xs text-white placeholder-[#525252] focus:outline-none focus:ring-1 focus:ring-white custom-scrollbar"
            />
          </div>

          {/* Grid: Type, Priority, Status, Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-semibold text-[#A3A3A3] block mb-1">
                Type
              </label>
              <select
                {...register('type')}
                className="w-full px-3 py-2 rounded-xl bg-[#000000] border border-[#2A2A2A] text-xs text-white focus:outline-none focus:ring-1 focus:ring-white cursor-pointer"
              >
                <option value="Feature">Feature</option>
                <option value="Bug">Bug</option>
                <option value="Task">Task</option>
                <option value="Improvement">Improvement</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#A3A3A3] block mb-1">
                Priority
              </label>
              <select
                {...register('priority')}
                className="w-full px-3 py-2 rounded-xl bg-[#000000] border border-[#2A2A2A] text-xs text-white focus:outline-none focus:ring-1 focus:ring-white cursor-pointer"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#A3A3A3] block mb-1">
                Status
              </label>
              <select
                {...register('status')}
                className="w-full px-3 py-2 rounded-xl bg-[#000000] border border-[#2A2A2A] text-xs text-white focus:outline-none focus:ring-1 focus:ring-white cursor-pointer"
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#A3A3A3] block mb-1">
                Assignee
              </label>
              <select
                {...register('assigneeId')}
                className="w-full px-3 py-2 rounded-xl bg-[#000000] border border-[#2A2A2A] text-xs text-white focus:outline-none focus:ring-1 focus:ring-white cursor-pointer"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.username} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-[#2A2A2A]">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={submitting}
              className="gap-1.5"
            >
              <PlusCircle className="h-4 w-4" />
              Create Ticket
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
