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
  storyPoints: z.number().int().optional().nullable(),
});

const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(3000),
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(3000),
});

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

      return res.status(200).json({ success: true, tickets });
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
        boardId: requestedBoardId,
        columnId: requestedColumnId,
      } = parsed.data;

      if (assigneeId) {
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
          assigneeId: assigneeId || null,
        },
        include: {
          assignee: {
            select: { id: true, username: true, email: true, avatarUrl: true },
          },
          reporter: {
            select: { id: true, username: true, email: true, avatarUrl: true },
          },
          column: {
            select: { id: true, name: true, category: true, position: true },
          },
        },
      });

      syncTicketEmbedding(ticket.id).catch((err) => {
        console.warn(`[Ticket Creation] Async embedding sync failed for ${ticket.id}:`, err.message);
      });

      socketService.emitToProject(projectId, 'ticket:created', ticket);

      return res.status(201).json({ success: true, ticket });
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
          reporter: {
            select: { id: true, username: true, email: true, avatarUrl: true },
          },
          _count: {
            select: { comments: true },
          },
        },
      });

      return res.status(200).json({ success: true, tickets: fullTickets, query });
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

      return res.status(200).json({ success: true, ticket });
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

      const { title, description, status, columnId, priority, type, assigneeId, storyPoints } = parsed.data;

      // Status change check
      if (status !== undefined || columnId !== undefined) {
        const statusAuth = await AuthorizationService.authorize(req, PERMISSIONS.TICKET_CHANGE_STATUS, projectId);
        if (!statusAuth.authorized) {
          return res.status(403).json({ success: false, error: 'Forbidden: Missing ticket.change_status permission' });
        }
      }

      // Assignment change check
      if (assigneeId !== undefined && assigneeId !== existingTicket.assigneeId) {
        const assignAuth = await AuthorizationService.authorize(req, PERMISSIONS.TICKET_ASSIGN, projectId);
        if (!assignAuth.authorized) {
          return res.status(403).json({ success: false, error: 'Forbidden: Missing ticket.assign permission' });
        }
      }

      // General update check
      if (title !== undefined || description !== undefined || priority !== undefined || type !== undefined || storyPoints !== undefined) {
        const updateAuth = await AuthorizationService.authorize(req, PERMISSIONS.TICKET_UPDATE, projectId);
        if (!updateAuth.authorized) {
          return res.status(403).json({ success: false, error: 'Forbidden: Missing ticket.update permission' });
        }
      }

      const updateData: any = {};
      if (title !== undefined) updateData.title = title.trim();
      if (description !== undefined) updateData.description = description ? description.trim() : null;
      if (priority !== undefined) updateData.priority = priority.toUpperCase() as TicketPriority;
      if (type !== undefined) updateData.type = type.toUpperCase() as TicketType;
      if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null;
      if (storyPoints !== undefined) updateData.storyPoints = storyPoints;

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

      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: updateData,
        include: {
          assignee: {
            select: { id: true, username: true, email: true, avatarUrl: true },
          },
          reporter: {
            select: { id: true, username: true, email: true, avatarUrl: true },
          },
          column: {
            select: { id: true, name: true, category: true, position: true },
          },
        },
      });

      syncTicketEmbedding(ticketId).catch(() => {});
      socketService.emitToProject(projectId, 'ticket:updated', updated);

      return res.status(200).json({ success: true, ticket: updated });
    } catch (error: any) {
      console.error('[ProjectTicketController.updateTicket] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to update ticket' });
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
