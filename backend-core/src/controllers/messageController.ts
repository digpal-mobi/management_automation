import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AiService } from '../services/aiService.js';
import { socketService } from '../services/socketService.js';
import { requireProjectAccess } from '../lib/projectAccess.js';

export class MessageController {
  static async getTicketMessages(req: Request, res: Response) {
    try {
      const { id: ticketId } = req.params;
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { projectId: true },
      });
      if (!ticket) {
        return res.status(404).json({ success: false, error: 'Ticket not found' });
      }
      const role = await requireProjectAccess(req, res, ticket.projectId);
      if (!role) return;

      const comments = await prisma.comment.findMany({
        where: { ticketId },
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, username: true, avatarUrl: true, email: true } },
        },
      });

      return res.status(200).json({ success: true, messages: comments });
    } catch (error: any) {
      console.error('[MessageController.getTicketMessages] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async createMessage(req: Request, res: Response) {
    try {
      const { id: ticketId } = req.params;
      const { content, senderId, senderName, senderType } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ success: false, error: 'Content is required' });
      }

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { project: true },
      });

      if (!ticket) {
        return res.status(404).json({ success: false, error: 'Ticket not found' });
      }
      const role = await requireProjectAccess(req, res, ticket.projectId);
      if (!role) return;

      const isAi = senderType === 'AI';
      const comment = await prisma.comment.create({
        data: {
          ticketId,
          content,
          isAi,
          userId: senderId || null,
          authorName: senderName || (isAi ? 'TaskPulse AI' : 'Team Member'),
        },
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
        },
      });

      socketService.emitToTicket(ticketId, 'message:created', comment);

      return res.status(201).json({ success: true, message: comment });
    } catch (error: any) {
      console.error('[MessageController.createMessage] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async askAi(req: Request, res: Response) {
    try {
      const { id: ticketId } = req.params;
      const { message, senderId, senderName } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({ success: false, error: 'Message is required' });
      }

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          project: true,
          comments: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!ticket) {
        return res.status(404).json({ success: false, error: 'Ticket not found' });
      }
      const role = await requireProjectAccess(req, res, ticket.projectId);
      if (!role) return;

      const userMsg = await prisma.comment.create({
        data: {
          ticketId,
          content: message,
          isAi: false,
          userId: senderId || null,
          authorName: senderName || 'Developer',
        },
      });
      socketService.emitToTicket(ticketId, 'message:created', userMsg);

      const history = ticket.comments.reverse().map((m) => ({
        senderType: m.isAi ? 'ai' : 'user',
        content: m.content,
      }));

      const aiResult = await AiService.chatWithTicket({
        projectId: ticket.projectId,
        project: {
          name: ticket.project.name,
          description: ticket.project.description || '',
          techStack: ticket.project.techStack || '',
        },
        ticket: {
          id: ticket.id,
          title: ticket.title,
          description: ticket.description || '',
          acceptanceCriteria: ticket.acceptanceCriteria,
          technicalNotes: ticket.technicalNotes,
          priority: ticket.priority,
          storyPoints: ticket.storyPoints || 0,
          labels: [],
        },
        history,
        message,
      });

      const aiMsg = await prisma.comment.create({
        data: {
          ticketId,
          content: aiResult.response,
          isAi: true,
          authorName: 'TaskPulse AI Assistant',
          aiMetadata: { citations: aiResult.citations || [], provider: aiResult.provider },
        },
      });

      socketService.emitToTicket(ticketId, 'message:created', aiMsg);

      return res.status(200).json({
        success: true,
        userMessage: userMsg,
        aiMessage: aiMsg,
        citations: aiResult.citations,
        provider: aiResult.provider,
      });
    } catch (error: any) {
      console.error('[MessageController.askAi] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}
