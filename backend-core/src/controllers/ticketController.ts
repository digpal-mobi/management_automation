import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { socketService } from '../services/socketService.js';
import { TicketPriority, TicketStatus } from '@prisma/client';
import { requireProjectAccess } from '../lib/projectAccess.js';

export class TicketController {
  static async createTicket(req: Request, res: Response) {
    try {
      const {
        projectId,
        boardId,
        columnId,
        title,
        description,
        acceptanceCriteria,
        technicalNotes,
        prChecklist,
        priority,
        storyPoints,
        assigneeId,
        assigneeIds,
      } = req.body;

      if (!projectId || !title) {
        return res.status(400).json({ success: false, error: 'projectId and title are required' });
      }

      const role = await requireProjectAccess(req, res, projectId);
      if (!role) return;

      // Resolve Board
      let bId = boardId;
      if (!bId) {
        const defaultBoard = await prisma.board.findFirst({ where: { projectId } });
        bId = defaultBoard?.id;
        if (!bId) {
          const createdBoard = await prisma.board.create({
            data: { projectId, name: 'Main Board' },
          });
          bId = createdBoard.id;
        }
      }

      // If columnId not given, default to first column on board
      let colId = columnId;
      if (!colId) {
        const defaultCol = await prisma.boardColumn.findFirst({
          where: { boardId: bId },
          orderBy: { position: 'asc' },
        });
        colId = defaultCol?.id;
      }

      let prio: TicketPriority = TicketPriority.MEDIUM;
      if (priority === 'HIGH' || priority === 'High') prio = TicketPriority.HIGH;
      if (priority === 'LOW' || priority === 'Low') prio = TicketPriority.LOW;
      if (priority === 'CRITICAL' || priority === 'Critical') prio = TicketPriority.CRITICAL;

      let targetAssigneeIds: string[] = [];
      if (assigneeIds && Array.isArray(assigneeIds)) {
        targetAssigneeIds = Array.from(new Set(assigneeIds.filter(Boolean)));
      } else if (assigneeId) {
        targetAssigneeIds = [assigneeId];
      }

      const primaryAssigneeId = targetAssigneeIds.length > 0 ? targetAssigneeIds[0] : null;

      const ticket = await prisma.ticket.create({
        data: {
          projectId,
          boardId: bId,
          columnId: colId || null,
          title,
          description: description || null,
          acceptanceCriteria: acceptanceCriteria || null,
          technicalNotes: technicalNotes || null,
          prChecklist: prChecklist || null,
          priority: prio,
          storyPoints: storyPoints ? parseInt(storyPoints, 10) : null,
          assigneeId: primaryAssigneeId,
          assignees:
            targetAssigneeIds.length > 0
              ? {
                  create: targetAssigneeIds.map((userId) => ({ userId })),
                }
              : undefined,
        },
        include: {
          assignee: { select: { id: true, username: true, avatarUrl: true, email: true } },
          assignees: {
            include: {
              user: { select: { id: true, username: true, avatarUrl: true, email: true } },
            },
          },
          column: { select: { id: true, name: true, category: true } },
        },
      });

      const formatted = {
        ...ticket,
        assignees:
          ticket.assignees && ticket.assignees.length > 0
            ? ticket.assignees.map((a: any) => a.user || a)
            : ticket.assignee
            ? [ticket.assignee]
            : [],
      };

      socketService.emitToProject(projectId, 'ticket:created', formatted);

      return res.status(201).json({ success: true, ticket: formatted });
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
          assignee: { select: { id: true, username: true, avatarUrl: true, email: true } },
          assignees: {
            include: {
              user: { select: { id: true, username: true, avatarUrl: true, email: true } },
            },
          },
          column: { select: { id: true, name: true, position: true, category: true } },
          project: { select: { id: true, name: true, description: true, techStack: true } },
          _count: { select: { comments: true } },
        },
      });

      if (!ticket) {
        return res.status(404).json({ success: false, error: 'Ticket not found' });
      }

      const role = await requireProjectAccess(req, res, ticket.projectId);
      if (!role) return;

      const formatted = {
        ...ticket,
        assignees:
          ticket.assignees && ticket.assignees.length > 0
            ? ticket.assignees.map((a: any) => a.user || a)
            : ticket.assignee
            ? [ticket.assignee]
            : [],
      };

      return res.status(200).json({ success: true, ticket: formatted });
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
        status,
        title,
        description,
        acceptanceCriteria,
        technicalNotes,
        prChecklist,
        priority,
        storyPoints,
        assigneeId,
        assigneeIds,
      } = req.body;

      const existing = await prisma.ticket.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Ticket not found' });
      }

      const role = await requireProjectAccess(req, res, existing.projectId);
      if (!role) return;

      const updateData: any = {};
      if (columnId !== undefined) {
        updateData.columnId = columnId;
        const col = await prisma.boardColumn.findUnique({ where: { id: columnId } });
        if (col) {
          updateData.status = col.category;
        }
      }
      if (status !== undefined) {
        if (status === 'To Do' || status === 'TODO') updateData.status = TicketStatus.TODO;
        else if (status === 'In Progress' || status === 'IN_PROGRESS') updateData.status = TicketStatus.IN_PROGRESS;
        else if (status === 'Done' || status === 'DONE') updateData.status = TicketStatus.DONE;
      }
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (acceptanceCriteria !== undefined) updateData.acceptanceCriteria = acceptanceCriteria;
      if (technicalNotes !== undefined) updateData.technicalNotes = technicalNotes;
      if (prChecklist !== undefined) updateData.prChecklist = prChecklist;
      if (storyPoints !== undefined) updateData.storyPoints = parseInt(storyPoints, 10);
      if (priority !== undefined) {
        if (priority === 'HIGH' || priority === 'High') updateData.priority = TicketPriority.HIGH;
        else if (priority === 'LOW' || priority === 'Low') updateData.priority = TicketPriority.LOW;
        else if (priority === 'CRITICAL' || priority === 'Critical') updateData.priority = TicketPriority.CRITICAL;
        else updateData.priority = TicketPriority.MEDIUM;
      }

      let targetAssigneeIds: string[] | undefined = undefined;
      if (assigneeIds !== undefined) {
        targetAssigneeIds = Array.from(new Set(assigneeIds.filter(Boolean)));
      } else if (assigneeId !== undefined) {
        targetAssigneeIds = assigneeId ? [assigneeId] : [];
      }

      if (targetAssigneeIds !== undefined) {
        updateData.assigneeId = targetAssigneeIds.length > 0 ? targetAssigneeIds[0] : null;
        await prisma.ticketAssignee.deleteMany({ where: { ticketId: id } });
        if (targetAssigneeIds.length > 0) {
          await prisma.ticketAssignee.createMany({
            data: targetAssigneeIds.map((userId) => ({ ticketId: id, userId })),
            skipDuplicates: true,
          });
        }
      }

      const updated = await prisma.ticket.update({
        where: { id },
        data: updateData,
        include: {
          assignee: { select: { id: true, username: true, avatarUrl: true, email: true } },
          assignees: {
            include: {
              user: { select: { id: true, username: true, avatarUrl: true, email: true } },
            },
          },
          column: { select: { id: true, name: true, category: true } },
        },
      });

      const formatted = {
        ...updated,
        assignees:
          updated.assignees && updated.assignees.length > 0
            ? updated.assignees.map((a: any) => a.user || a)
            : updated.assignee
            ? [updated.assignee]
            : [],
      };

      // Real-time broadcast
      socketService.emitToProject(updated.projectId, 'ticket:updated', formatted);
      socketService.emitToTicket(updated.id, 'ticket:updated', formatted);

      return res.status(200).json({ success: true, ticket: formatted });
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

      const role = await requireProjectAccess(req, res, ticket.projectId);
      if (!role) return;

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
