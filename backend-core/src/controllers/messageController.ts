import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AiService } from '../services/aiService.js';
import { socketService } from '../services/socketService.js';
import { SenderType } from '@prisma/client';

export class MessageController {
  static async getTicketMessages(req: Request, res: Response) {
    try {
      const { id: ticketId } = req.params;

      const messages = await prisma.message.findMany({
        where: { ticketId },
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { id: true, name: true, avatar: true, email: true } },
        },
      });

      return res.status(200).json({ success: true, messages });
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

      // 1. Create Human Message
      const message = await prisma.message.create({
        data: {
          ticketId,
          content,
          senderType: senderType === 'AI' ? SenderType.AI : SenderType.USER,
          senderId: senderId || null,
          senderName: senderName || 'Team Member',
        },
        include: {
          sender: { select: { id: true, name: true, avatar: true } },
        },
      });

      // Emit immediately
      socketService.emitToTicket(ticketId, 'message:created', message);

      return res.status(201).json({ success: true, message });
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
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!ticket) {
        return res.status(404).json({ success: false, error: 'Ticket not found' });
      }

      // 1. Save user prompt first if sent as a question
      const userMsg = await prisma.message.create({
        data: {
          ticketId,
          content: message,
          senderType: SenderType.USER,
          senderId: senderId || null,
          senderName: senderName || 'Developer',
        },
      });
      socketService.emitToTicket(ticketId, 'message:created', userMsg);

      // 2. Prepare history
      const history = ticket.messages.reverse().map((m) => ({
        senderType: m.senderType === SenderType.AI ? 'ai' : 'user',
        content: m.content,
      }));

      // 3. Call AI Service RAG Chat
      const aiResult = await AiService.chatWithTicket({
        projectId: ticket.projectId,
        project: {
          name: ticket.project.name,
          description: ticket.project.description,
          techStack: ticket.project.techStack,
        },
        ticket: {
          id: ticket.id,
          title: ticket.title,
          description: ticket.description,
          acceptanceCriteria: ticket.acceptanceCriteria,
          technicalNotes: ticket.technicalNotes,
          priority: ticket.priority,
          storyPoints: ticket.storyPoints,
          labels: ticket.labels,
        },
        history,
        message,
      });

      // 4. Save AI response
      const aiMsg = await prisma.message.create({
        data: {
          ticketId,
          content: aiResult.response,
          senderType: SenderType.AI,
          senderName: 'Antigravity AI Assistant',
          citations: aiResult.citations || [],
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
