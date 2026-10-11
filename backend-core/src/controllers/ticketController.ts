import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { socketService } from '../services/socketService.js';
import { Priority } from '@prisma/client';

export class TicketController {
  static async createTicket(req: Request, res: Response) {
    try {
      const {
        projectId,
        columnId,
        title,
        description,
        acceptanceCriteria,
        technicalNotes,
        prChecklist,
        priority,
        storyPoints,
        labels,
        assigneeId,
      } = req.body;

      if (!projectId || !title) {
        return res.status(400).json({ success: false, error: 'projectId and title are required' });
      }

      // If columnId not given, default to Backlog
      let colId = columnId;
      if (!colId) {
        const defaultCol = await prisma.column.findFirst({
          where: { board: { projectId }, name: 'Backlog' },
        });
        colId = defaultCol?.id;
      }

      // Count existing tickets in column to set position
      const count = await prisma.ticket.count({ where: { columnId: colId } });

      let prio: Priority = Priority.MEDIUM;
      if (priority === 'HIGH') prio = Priority.HIGH;
      if (priority === 'LOW') prio = Priority.LOW;

      const ticket = await prisma.ticket.create({
        data: {
          projectId,
          columnId: colId,
          title,
          description: description || '',
          acceptanceCriteria: acceptanceCriteria || [],
          technicalNotes: technicalNotes || '',
          prChecklist: prChecklist || [],
          priority: prio,
          storyPoints: storyPoints || 3,
          labels: labels || [],
          position: count,
          assigneeId: assigneeId || null,
        },
        include: {
          assignee: { select: { id: true, name: true, avatar: true, email: true } },
          column: { select: { id: true, name: true } },
        },
      });

      socketService.emitToProject(projectId, 'ticket:created', ticket);

      return res.status(201).json({ success: true, ticket });
    } catch (error: any) {
      console.error('[TicketController.createTicket] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getTicketById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const ticket = await prisma.ticket.findUnique({
        where: { id },
        include: {
          assignee: { select: { id: true, name: true, avatar: true, email: true } },
          column: { select: { id: true, name: true, position: true } },
          project: { select: { id: true, name: true, description: true, techStack: true } },
          _count: { select: { messages: true } },
        },
      });

      if (!ticket) {
        return res.status(404).json({ success: false, error: 'Ticket not found' });
      }

      return res.status(200).json({ success: true, ticket });
    } catch (error: any) {
      console.error('[TicketController.getTicketById] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async updateTicket(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        columnId,
        position,
        title,
        description,
        acceptanceCriteria,
        technicalNotes,
        prChecklist,
        priority,
        storyPoints,
        labels,
        assigneeId,
      } = req.body;

      const existing = await prisma.ticket.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Ticket not found' });
      }

      const updateData: any = {};
      if (columnId !== undefined) updateData.columnId = columnId;
      if (position !== undefined) updateData.position = position;
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (acceptanceCriteria !== undefined) updateData.acceptanceCriteria = acceptanceCriteria;
      if (technicalNotes !== undefined) updateData.technicalNotes = technicalNotes;
      if (prChecklist !== undefined) updateData.prChecklist = prChecklist;
      if (labels !== undefined) updateData.labels = labels;
      if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
      if (storyPoints !== undefined) updateData.storyPoints = parseInt(storyPoints, 10);
      if (priority !== undefined) {
        if (priority === 'HIGH') updateData.priority = Priority.HIGH;
        else if (priority === 'LOW') updateData.priority = Priority.LOW;
        else updateData.priority = Priority.MEDIUM;
      }

      const updated = await prisma.ticket.update({
        where: { id },
        data: updateData,
        include: {
          assignee: { select: { id: true, name: true, avatar: true, email: true } },
          column: { select: { id: true, name: true } },
        },
      });

      // Real-time broadcast
      socketService.emitToProject(updated.projectId, 'ticket:updated', updated);
      socketService.emitToTicket(updated.id, 'ticket:updated', updated);

      return res.status(200).json({ success: true, ticket: updated });
    } catch (error: any) {
      console.error('[TicketController.updateTicket] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async deleteTicket(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const ticket = await prisma.ticket.findUnique({ where: { id } });
      if (!ticket) {
        return res.status(404).json({ success: false, error: 'Ticket not found' });
      }

      await prisma.ticket.delete({ where: { id } });

      socketService.emitToProject(ticket.projectId, 'ticket:deleted', { ticketId: id });
      socketService.emitToTicket(id, 'ticket:deleted', { ticketId: id });

      return res.status(200).json({ success: true, message: 'Ticket deleted' });
    } catch (error: any) {
      console.error('[TicketController.deleteTicket] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}
