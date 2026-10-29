import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateRequest, AuthenticatedRequest } from '../lib/auth.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { PERMISSIONS } from '../authorization/permissions.js';
import { syncTicketEmbedding, searchProjectTicketsSemantic } from '../lib/embeddings.js';
import { processAiTicketDiscussion } from '../lib/ticketAiAssistant.js';
import { getProjectRole, canComment } from '../lib/permissions.js';
import { socketService } from '../services/socketService.js';
import { TicketStatus, TicketPriority, TicketType } from '@prisma/client';

const createTicketSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional().nullable(),
  status: z.enum(['To Do', 'In Progress', 'Done', 'TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  type: z.enum(['Feature', 'Bug', 'Task', 'Improvement']).default('Task'),
  assigneeId: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).optional(),
  boardId: z.string().optional(),
  columnId: z.string().optional().nullable(),
});

const updateTicketSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['To Do', 'In Progress', 'Done', 'TODO', 'IN_PROGRESS', 'DONE']).optional(),
  columnId: z.string().optional().nullable(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  type: z.enum(['Feature', 'Bug', 'Task', 'Improvement']).optional(),
  assigneeId: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).optional(),
  storyPoints: z.number().int().optional().nullable(),
  executionOrder: z.number().int().optional().nullable(),
  acceptanceCriteria: z.any().optional().nullable(),
  technicalNotes: z.string().optional().nullable(),
  prChecklist: z.any().optional().nullable(),
  sprint: z.string().optional().nullable(),
});

const ticketOrderItemSchema = z.object({
  id: z.string(),
  columnId: z.string().optional(),
  status: z.enum(['To Do', 'In Progress', 'Done', 'TODO', 'IN_PROGRESS', 'DONE']).optional(),
  executionOrder: z.number().int().min(0),
});

const reorderTicketsSchema = z.union([
  z.object({
    ticketOrders: z.array(ticketOrderItemSchema).min(1, 'ticketOrders cannot be empty'),
  }),
  z.object({
    updates: z.array(ticketOrderItemSchema).min(1, 'updates cannot be empty'),
  }),
]);

const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(3000),
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(3000),
});

export function formatTicketResponse(ticket: any) {
  if (!ticket) return ticket;
  const assigneesList =
    ticket.assignees && ticket.assignees.length > 0
      ? ticket.assignees.map((a: any) => a.user || a)
      : ticket.assignee
      ? [ticket.assignee]
      : [];

  return {
    ...ticket,
    assignees: assigneesList,
  };
}

export class ProjectTicketController {
  static async getTickets(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const auth = await AuthorizationService.authorize(req, PERMISSIONS.TICKET_VIEW, projectId);
      if (!auth.authorized) {
        return res.status(auth.status || 403).json({ success: false, error: auth.reason });
      }

      const tickets = await prisma.ticket.findMany({
        where: { projectId },
        include: {
          assignee: {
            select: { id: true, username: true, email: true, avatarUrl: true },
          },
          assignees: {
            include: {
              user: { select: { id: true, username: true, email: true, avatarUrl: true } },
            },
          },
          reporter: {
            select: { id: true, username: true, email: true, avatarUrl: true },
          },
          column: {
            select: { id: true, name: true, category: true, position: true },
          },
          _count: {
            select: { comments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({ success: true, tickets: tickets.map(formatTicketResponse) });
    } catch (error: any) {
      console.error('[ProjectTicketController.getTickets] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch tickets' });
    }
  }

  static async createTicket(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const auth = await AuthorizationService.authorize(req, PERMISSIONS.TICKET_CREATE, projectId);
      if (!auth.authorized) {
        return res.status(auth.status || 403).json({ success: false, error: auth.reason });
      }

      const parsed = createTicketSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: (parsed.error as any).issues?.[0]?.message || parsed.error.message,
        });
      }

      const {
        title,
        description,
        status,
        priority,
        type,
        assigneeId,
        assigneeIds,
        boardId: requestedBoardId,
        columnId: requestedColumnId,
      } = parsed.data;

      let targetAssigneeIds: string[] = [];
      if (assigneeIds && Array.isArray(assigneeIds)) {
        targetAssigneeIds = Array.from(new Set(assigneeIds.filter(Boolean)));
      } else if (assigneeId) {
        targetAssigneeIds = [assigneeId];
      }

      if (targetAssigneeIds.length > 0) {
        const assignAuth = await AuthorizationService.authorize(req, PERMISSIONS.TICKET_ASSIGN, projectId);
        if (!assignAuth.authorized) {
          return res.status(403).json({ success: false, error: 'Forbidden: Missing ticket.assign permission' });
        }
      }

      let boardId = requestedBoardId;
      if (!boardId) {
        const defaultBoard = await prisma.board.findFirst({ where: { projectId } });
        if (defaultBoard) {
          boardId = defaultBoard.id;
        } else {
          const newBoard = await prisma.board.create({
            data: { projectId, name: 'Main Board' },
          });
          boardId = newBoard.id;
        }
      }

      let finalColumnId = requestedColumnId || null;
      let finalStatus: TicketStatus = TicketStatus.TODO;

      if (finalColumnId) {
        const targetCol = await prisma.boardColumn.findUnique({ where: { id: finalColumnId } });
        if (targetCol) {
          finalStatus = targetCol.category;
        }
      } else {
        const firstCol = await prisma.boardColumn.findFirst({
          where: { boardId },
          orderBy: { position: 'asc' },
        });
        if (firstCol) {
          finalColumnId = firstCol.id;
          finalStatus = firstCol.category;
        }
      }

      if (status && !finalColumnId) {
        if (status === 'In Progress' || status === 'IN_PROGRESS') finalStatus = TicketStatus.IN_PROGRESS;
        else if (status === 'Done' || status === 'DONE') finalStatus = TicketStatus.DONE;
        else finalStatus = TicketStatus.TODO;
      }

      const primaryAssigneeId = targetAssigneeIds.length > 0 ? targetAssigneeIds[0] : null;

      const ticket = await prisma.ticket.create({
        data: {
          projectId,
          boardId,
          columnId: finalColumnId,
          title: title.trim(),
          description: description?.trim() || null,
          status: finalStatus,
          priority: priority.toUpperCase() as TicketPriority,
          type: type.toUpperCase() as TicketType,
          reporterId: auth.user.id,
          assigneeId: primaryAssigneeId,
          assignees:
            targetAssigneeIds.length > 0
              ? {
                  create: targetAssigneeIds.map((userId) => ({ userId })),
                }
              : undefined,
        },
        include: {
          assignee: {
            select: { id: true, username: true, email: true, avatarUrl: true },
          },
          assignees: {
            include: {
              user: { select: { id: true, username: true, email: true, avatarUrl: true } },
            },
          },
          reporter: {
            select: { id: true, username: true, email: true, avatarUrl: true },
          },
          column: {
            select: { id: true, name: true, category: true, position: true },
          },
        },
      });

      const formattedTicket = formatTicketResponse(ticket);

      syncTicketEmbedding(ticket.id).catch((err) => {
        console.warn(`[Ticket Creation] Async embedding sync failed for ${ticket.id}:`, err.message);
      });

      socketService.emitToProject(projectId, 'ticket:created', formattedTicket);

      return res.status(201).json({ success: true, ticket: formattedTicket });
    } catch (error: any) {
      console.error('[ProjectTicketController.createTicket] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to create ticket' });
    }
  }

  static async searchTickets(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id: projectId } = req.params;
      const userRole = await getProjectRole(projectId, user.id);
      if (!userRole) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const query = (req.query.q as string) || '';
      if (!query.trim()) {
        return res.status(200).json({ success: true, tickets: [] });
      }

      const tickets = await searchProjectTicketsSemantic(projectId, query.trim(), 15);
      const ticketIds = tickets.map((t: any) => t.id);

      const fullTickets = await prisma.ticket.findMany({
        where: { id: { in: ticketIds } },
        include: {
          assignee: {
            select: { id: true, username: true, email: true, avatarUrl: true },
          },
          assignees: {
            include: {
              user: { select: { id: true, username: true, email: true, avatarUrl: true } },
            },
          },
          reporter: {
            select: { id: true, username: true, email: true, avatarUrl: true },
          },
          _count: {
            select: { comments: true },
          },
        },
      });

      return res.status(200).json({ success: true, tickets: fullTickets.map(formatTicketResponse), query });
    } catch (error: any) {
      console.error('[ProjectTicketController.searchTickets] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Semantic search failed' });
    }
  }

  static async getTicketById(req: Request, res: Response) {
    try {
      const { id: projectId, ticketId } = req.params;
      const auth = await AuthorizationService.authorize(req, PERMISSIONS.TICKET_VIEW, projectId);
      if (!auth.authorized) {
        return res.status(auth.status || 403).json({ success: false, error: auth.reason });
      }

      const ticket = await prisma.ticket.findFirst({
        where: { id: ticketId, projectId },
        include: {
          assignee: {
            select: { id: true, username: true, email: true, avatarUrl: true },
          },
          assignees: {
            include: {
              user: { select: { id: true, username: true, email: true, avatarUrl: true } },
            },
          },
          reporter: {
            select: { id: true, username: true, email: true, avatarUrl: true },
          },
          column: {
            select: { id: true, name: true, category: true, position: true },
          },
          comments: {
            include: {
              user: {
                select: { id: true, username: true, email: true, avatarUrl: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!ticket) {
        return res.status(404).json({ success: false, error: 'Ticket not found' });
      }

      return res.status(200).json({ success: true, ticket: formatTicketResponse(ticket) });
    } catch (error: any) {
      console.error('[ProjectTicketController.getTicketById] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch ticket' });
    }
  }

  static async updateTicket(req: Request, res: Response) {
    try {
      const { id: projectId, ticketId } = req.params;
      const existingTicket = await prisma.ticket.findFirst({
        where: { id: ticketId, projectId },
      });

      if (!existingTicket) {
        return res.status(404).json({ success: false, error: 'Ticket not found' });
      }

      const parsed = updateTicketSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: (parsed.error as any).issues?.[0]?.message || parsed.error.message,
        });
      }

      const {
        title,
        description,
        status,
        columnId,
        priority,
        type,
        assigneeId,
        assigneeIds,
        storyPoints,
        executionOrder,
        acceptanceCriteria,
        technicalNotes,
        prChecklist,
        sprint,
      } = parsed.data;

      // 1. Status / Column / Order change check
      let hasStatusChanged = false;
      let targetDbStatus: TicketStatus | undefined = undefined;
      if (status !== undefined) {
        if (status === 'In Progress' || status === 'IN_PROGRESS') targetDbStatus = TicketStatus.IN_PROGRESS;
        else if (status === 'Done' || status === 'DONE') targetDbStatus = TicketStatus.DONE;
        else targetDbStatus = TicketStatus.TODO;

        if (targetDbStatus !== existingTicket.status) {
          hasStatusChanged = true;
        }
      }
      if (columnId !== undefined && columnId !== existingTicket.columnId) {
        hasStatusChanged = true;
      }
      if (executionOrder !== undefined && executionOrder !== existingTicket.executionOrder) {
        hasStatusChanged = true;
      }

      if (hasStatusChanged) {
        const statusAuth = await AuthorizationService.authorize(req, PERMISSIONS.TICKET_CHANGE_STATUS, projectId);
        if (!statusAuth.authorized) {
          return res.status(403).json({ success: false, error: 'Forbidden: Missing ticket.change_status permission' });
        }
      }

      // 2. Assignment change check
      let targetAssigneeIds: string[] | undefined = undefined;
      if (assigneeIds !== undefined) {
        targetAssigneeIds = Array.from(new Set(assigneeIds.filter(Boolean)));
      } else if (assigneeId !== undefined) {
        targetAssigneeIds = assigneeId ? [assigneeId] : [];
      }

      let hasAssigneeChanged = false;
      if (targetAssigneeIds !== undefined) {
        const currentAssignees = await prisma.ticketAssignee.findMany({
          where: { ticketId },
          select: { userId: true },
        });
        const currentIds = currentAssignees.map((a) => a.userId).sort();
        const newIds = [...targetAssigneeIds].sort();
        if (
          currentIds.length !== newIds.length ||
          !currentIds.every((id, idx) => id === newIds[idx])
        ) {
          hasAssigneeChanged = true;
        }
      }

      if (hasAssigneeChanged) {
        const assignAuth = await AuthorizationService.authorize(req, PERMISSIONS.TICKET_ASSIGN, projectId);
        if (!assignAuth.authorized) {
          return res.status(403).json({ success: false, error: 'Forbidden: Missing ticket.assign permission' });
        }
      }

      // 3. General update check
      const hasTitleChanged = title !== undefined && title.trim() !== existingTicket.title;
      const hasDescriptionChanged = description !== undefined && (description ? description.trim() : null) !== (existingTicket.description || null);
      const hasPriorityChanged = priority !== undefined && priority.toUpperCase() !== existingTicket.priority;
      const hasTypeChanged = type !== undefined && type.toUpperCase() !== existingTicket.type;
      const hasStoryPointsChanged = storyPoints !== undefined && storyPoints !== existingTicket.storyPoints;
      const hasTechnicalNotesChanged = technicalNotes !== undefined && (technicalNotes ? technicalNotes.trim() : null) !== (existingTicket.technicalNotes || null);
      const hasSprintChanged = sprint !== undefined && (sprint ? sprint.trim() : null) !== (existingTicket.sprint || null);
      const hasAcChanged = acceptanceCriteria !== undefined && JSON.stringify(acceptanceCriteria) !== JSON.stringify(existingTicket.acceptanceCriteria);
      const hasPrChanged = prChecklist !== undefined && JSON.stringify(prChecklist) !== JSON.stringify(existingTicket.prChecklist);

      const hasGeneralUpdate =
        hasTitleChanged ||
        hasDescriptionChanged ||
        hasPriorityChanged ||
        hasTypeChanged ||
        hasStoryPointsChanged ||
        hasTechnicalNotesChanged ||
        hasSprintChanged ||
        hasAcChanged ||
        hasPrChanged;

      if (hasGeneralUpdate) {
        const updateAuth = await AuthorizationService.authorize(req, PERMISSIONS.TICKET_UPDATE, projectId);
        if (!updateAuth.authorized) {
          return res.status(403).json({ success: false, error: 'Forbidden: Missing ticket.update permission' });
        }
      }

      // If nothing changed, return existing ticket with full relations
      if (!hasStatusChanged && !hasAssigneeChanged && !hasGeneralUpdate) {
        const fullTicket = await prisma.ticket.findUnique({
          where: { id: ticketId },
          include: {
            assignee: { select: { id: true, username: true, email: true, avatarUrl: true } },
            assignees: {
              include: { user: { select: { id: true, username: true, email: true, avatarUrl: true } } },
            },
            reporter: { select: { id: true, username: true, email: true, avatarUrl: true } },
            column: { select: { id: true, name: true, category: true, position: true } },
          },
        });
        return res.status(200).json({ success: true, ticket: formatTicketResponse(fullTicket) });
      }

      const updateData: any = {};
      if (title !== undefined) updateData.title = title.trim();
      if (description !== undefined) updateData.description = description ? description.trim() : null;
      if (priority !== undefined) updateData.priority = priority.toUpperCase() as TicketPriority;
      if (type !== undefined) updateData.type = type.toUpperCase() as TicketType;
      if (storyPoints !== undefined) updateData.storyPoints = storyPoints;
      if (executionOrder !== undefined) updateData.executionOrder = executionOrder ?? 0;
      if (acceptanceCriteria !== undefined) updateData.acceptanceCriteria = acceptanceCriteria;
      if (technicalNotes !== undefined) updateData.technicalNotes = technicalNotes ? technicalNotes.trim() : null;
      if (prChecklist !== undefined) updateData.prChecklist = prChecklist;
      if (sprint !== undefined) updateData.sprint = sprint ? sprint.trim() : null;

      if (targetAssigneeIds !== undefined) {
        updateData.assigneeId = targetAssigneeIds.length > 0 ? targetAssigneeIds[0] : null;
      }

      // Synchronize columnId and status
      if (columnId !== undefined && columnId !== null) {
        const targetCol = await prisma.boardColumn.findUnique({ where: { id: columnId } });
        if (targetCol) {
          updateData.columnId = targetCol.id;
          updateData.status = targetCol.category;
        }
      } else if (status !== undefined) {
        let dbStatus: TicketStatus = TicketStatus.TODO;
        if (status === 'In Progress' || status === 'IN_PROGRESS') dbStatus = TicketStatus.IN_PROGRESS;
        else if (status === 'Done' || status === 'DONE') dbStatus = TicketStatus.DONE;

        updateData.status = dbStatus;

        if (existingTicket.boardId) {
          const matchingCol = await prisma.boardColumn.findFirst({
            where: { boardId: existingTicket.boardId, category: dbStatus },
            orderBy: { position: 'asc' },
          });
          if (matchingCol) {
            updateData.columnId = matchingCol.id;
          }
        }
      }

      if (targetAssigneeIds !== undefined) {
        await prisma.ticketAssignee.deleteMany({ where: { ticketId } });
        if (targetAssigneeIds.length > 0) {
          await prisma.ticketAssignee.createMany({
            data: targetAssigneeIds.map((userId) => ({ ticketId, userId })),
            skipDuplicates: true,
          });
        }
      }

      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: updateData,
        include: {
          assignee: {
            select: { id: true, username: true, email: true, avatarUrl: true },
          },
          assignees: {
            include: {
              user: { select: { id: true, username: true, email: true, avatarUrl: true } },
            },
          },
          reporter: {
            select: { id: true, username: true, email: true, avatarUrl: true },
          },
          column: {
            select: { id: true, name: true, category: true, position: true },
          },
        },
      });

      const formatted = formatTicketResponse(updated);
      syncTicketEmbedding(ticketId).catch(() => {});
      socketService.emitToProject(projectId, 'ticket:updated', formatted);

      return res.status(200).json({ success: true, ticket: formatted });
    } catch (error: any) {
      console.error('[ProjectTicketController.updateTicket] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to update ticket' });
    }
  }

  static async reorderTickets(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const auth = await AuthorizationService.authorize(req, PERMISSIONS.TICKET_CHANGE_STATUS, projectId);
      if (!auth.authorized) {
        return res.status(auth.status || 403).json({ success: false, error: auth.reason });
      }

      const parsed = reorderTicketsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: (parsed.error as any).issues?.[0]?.message || parsed.error.message,
        });
      }

      const ticketOrders = 'ticketOrders' in parsed.data ? parsed.data.ticketOrders : parsed.data.updates;

      await prisma.$transaction(
        ticketOrders.map((item) => {
          const data: any = { executionOrder: item.executionOrder };
          if (item.columnId) data.columnId = item.columnId;
          if (item.status) {
            let dbStatus: TicketStatus = TicketStatus.TODO;
            if (item.status === 'In Progress' || item.status === 'IN_PROGRESS') dbStatus = TicketStatus.IN_PROGRESS;
            else if (item.status === 'Done' || item.status === 'DONE') dbStatus = TicketStatus.DONE;
            data.status = dbStatus;
          }
          return prisma.ticket.update({
            where: { id: item.id },
            data,
          });
        })
      );

      socketService.emitToProject(projectId, 'tickets:reordered', { ticketOrders });

      return res.status(200).json({ success: true, message: 'Tickets reordered successfully' });
    } catch (error: any) {
      console.error('[ProjectTicketController.reorderTickets] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to reorder tickets' });
    }
  }

  static async deleteTicket(req: Request, res: Response) {
    try {
      const { id: projectId, ticketId } = req.params;
      const auth = await AuthorizationService.authorize(req, PERMISSIONS.TICKET_DELETE, projectId);
      if (!auth.authorized) {
        return res.status(auth.status || 403).json({ success: false, error: auth.reason });
      }

      const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, projectId } });
      if (!ticket) {
        return res.status(404).json({ success: false, error: 'Ticket not found' });
      }

      await prisma.ticket.delete({ where: { id: ticketId } });
      socketService.emitToProject(projectId, 'ticket:deleted', { ticketId });

      return res.status(200).json({ success: true, message: 'Ticket deleted successfully' });
    } catch (error: any) {
      console.error('[ProjectTicketController.deleteTicket] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to delete ticket' });
    }
  }

  // --- Comment Handlers ---

  static async getComments(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id: projectId, ticketId } = req.params;
      const userRole = await getProjectRole(projectId, user.id);
      if (!userRole) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const comments = await prisma.comment.findMany({
        where: {
          ticketId,
          OR: [{ aiProcessingStatus: null }, { aiProcessingStatus: { not: 'SKIPPED' } }],
        },
        include: {
          user: {
            select: { id: true, username: true, email: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return res.status(200).json({ success: true, comments });
    } catch (error: any) {
      console.error('[ProjectTicketController.getComments] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch comments' });
    }
  }

  static async createComment(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id: projectId, ticketId } = req.params;
      const userRole = await getProjectRole(projectId, user.id);
      if (!canComment(userRole)) {
        return res.status(403).json({ success: false, error: 'Forbidden. You do not have permission to comment on this ticket.' });
      }

      const parsed = createCommentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: (parsed.error as any).issues?.[0]?.message || parsed.error.message,
        });
      }

      const ticket = await prisma.ticket.findFirst({
        where: { id: ticketId, projectId },
      });
      if (!ticket) {
        return res.status(404).json({ success: false, error: 'Ticket not found' });
      }

      const comment = await prisma.comment.create({
        data: {
          ticketId,
          userId: user.id,
          content: parsed.data.content.trim(),
          isAi: false,
          authorName: user.username,
        },
        include: {
          user: {
            select: { id: true, username: true, email: true, avatarUrl: true },
          },
        },
      });

      socketService.emitToTicket(ticketId, 'message:created', comment);

      // Async AI assistant processing
      processAiTicketDiscussion(comment.id).catch((err) => {
        console.error('[AI Assistant Background] Discussion processing error:', err.message);
      });

      return res.status(201).json({ success: true, comment });
    } catch (error: any) {
      console.error('[ProjectTicketController.createComment] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to create comment' });
    }
  }

  static async updateComment(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id: projectId, ticketId, commentId } = req.params;
      const comment = await prisma.comment.findFirst({
        where: { id: commentId, ticketId },
      });

      if (!comment) {
        return res.status(404).json({ success: false, error: 'Comment not found' });
      }

      if (comment.userId !== user.id) {
        return res.status(403).json({ success: false, error: 'Forbidden. You can only edit your own comments.' });
      }

      const parsed = updateCommentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: (parsed.error as any).issues?.[0]?.message || parsed.error.message,
        });
      }

      const updated = await prisma.comment.update({
        where: { id: commentId },
        data: { content: parsed.data.content.trim() },
        include: {
          user: {
            select: { id: true, username: true, email: true, avatarUrl: true },
          },
        },
      });

      return res.status(200).json({ success: true, comment: updated });
    } catch (error: any) {
      console.error('[ProjectTicketController.updateComment] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to update comment' });
    }
  }

  static async deleteComment(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id: projectId, ticketId, commentId } = req.params;
      const comment = await prisma.comment.findFirst({
        where: { id: commentId, ticketId },
      });

      if (!comment) {
        return res.status(404).json({ success: false, error: 'Comment not found' });
      }

      const userRole = await getProjectRole(projectId, user.id);
      const isPrivileged = userRole === 'owner' || userRole === 'manager';

      if (comment.userId !== user.id && !isPrivileged) {
        return res.status(403).json({ success: false, error: 'Forbidden. You cannot delete this comment.' });
      }

      await prisma.comment.delete({ where: { id: commentId } });

      return res.status(200).json({ success: true, message: 'Comment deleted successfully' });
    } catch (error: any) {
      console.error('[ProjectTicketController.deleteComment] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to delete comment' });
    }
  }

  static async retryComment(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id: projectId, ticketId, commentId } = req.params;
      const comment = await prisma.comment.findFirst({
        where: { id: commentId, ticketId },
      });

      if (!comment) {
        return res.status(404).json({ success: false, error: 'Comment not found' });
      }

      processAiTicketDiscussion(commentId).catch((err) => {
        console.error('[AI Assistant Retry] Error:', err.message);
      });

      return res.status(200).json({ success: true, message: 'AI response retry queued' });
    } catch (error: any) {
      console.error('[ProjectTicketController.retryComment] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Retry failed' });
    }
  }

  static async clearProjectTickets(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id: projectId } = req.params;
      const { sprint } = req.query;
      const userRole = await getProjectRole(projectId, user.id);
      if (userRole !== 'owner' && userRole !== 'manager') {
        return res.status(403).json({ success: false, error: 'Forbidden. Only owners and managers can clear tickets.' });
      }

      const whereClause: any = { projectId };
      if (sprint && typeof sprint === 'string' && sprint !== 'ALL') {
        whereClause.sprint = sprint.toUpperCase();
      }

      const result = await prisma.ticket.deleteMany({
        where: whereClause,
      });

      return res.status(200).json({
        success: true,
        deletedCount: result.count,
        message: sprint ? `Cleared ${result.count} tickets for sprint ${sprint}` : `Cleared all ${result.count} project tickets`,
      });
    } catch (error: any) {
      console.error('[ProjectTicketController.clearProjectTickets] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to clear tickets' });
    }
  }
}
