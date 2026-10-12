import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { getProjectRole, canCreateTickets } from '@/lib/permissions';
import { syncTicketEmbedding } from '@/lib/embeddings';
import { TicketStatus, TicketPriority, TicketType } from '@prisma/client';

const createTicketSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional().nullable(),
  status: z.enum(['To Do', 'In Progress', 'Done']).default('To Do'),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  type: z.enum(['Feature', 'Bug', 'Task', 'Improvement']).default('Task'),
  assigneeId: z.string().optional().nullable(),
  boardId: z.string().optional(),
});

// GET /api/projects/[id]/tickets
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
    const userRole = await getProjectRole(projectId, user.id);
    if (!userRole) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
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
        _count: {
          select: { comments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, tickets });
  } catch (error: any) {
    console.error('[GET tickets] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/tickets
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
    const userRole = await getProjectRole(projectId, user.id);
    if (!canCreateTickets(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden. Editors cannot create tickets.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: (parsed.error as any).issues?.[0]?.message || parsed.error.message },
        { status: 400 }
      );
    }

    // Resolve Board
    let boardId = parsed.data.boardId;
    if (!boardId) {
      const defaultBoard = await prisma.board.findFirst({
        where: { projectId },
      });
      if (defaultBoard) {
        boardId = defaultBoard.id;
      } else {
        const createdBoard = await prisma.board.create({
          data: { projectId, name: 'Main Board' },
        });
        boardId = createdBoard.id;
      }
    }

    // Map Prisma Enums
    const statusMap: Record<string, TicketStatus> = {
      'To Do': TicketStatus.TODO,
      'In Progress': TicketStatus.IN_PROGRESS,
      'Done': TicketStatus.DONE,
    };

    const priorityMap: Record<string, TicketPriority> = {
      Low: TicketPriority.LOW,
      Medium: TicketPriority.MEDIUM,
      High: TicketPriority.HIGH,
      Critical: TicketPriority.CRITICAL,
    };

    const typeMap: Record<string, TicketType> = {
      Feature: TicketType.FEATURE,
      Bug: TicketType.BUG,
      Task: TicketType.TASK,
      Improvement: TicketType.IMPROVEMENT,
    };

    const ticket = await prisma.ticket.create({
      data: {
        projectId,
        boardId,
        title: parsed.data.title,
        description: parsed.data.description || null,
        status: statusMap[parsed.data.status],
        priority: priorityMap[parsed.data.priority],
        type: typeMap[parsed.data.type],
        assigneeId: parsed.data.assigneeId || null,
        reporterId: user.id,
      },
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

    // Synchronize vector embedding in pgvector if meaningful description exists
    if (parsed.data.description && parsed.data.description.length >= 10) {
      syncTicketEmbedding(ticket.id, parsed.data.description).catch((err) =>
        console.warn('Vector embedding async warning:', err)
      );
    }

    return NextResponse.json({ success: true, ticket }, { status: 201 });
  } catch (error: any) {
    console.error('[POST tickets] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create ticket' },
      { status: 500 }
    );
  }
}
