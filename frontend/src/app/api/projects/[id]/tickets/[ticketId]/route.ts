import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import {
  getProjectRole,
  canUpdateTickets,
  canDeleteTickets,
} from '@/lib/permissions';
import { syncTicketEmbedding } from '@/lib/embeddings';
import { TicketStatus, TicketPriority, TicketType } from '@prisma/client';

const updateTicketSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['To Do', 'In Progress', 'Done']).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  type: z.enum(['Feature', 'Bug', 'Task', 'Improvement']).optional(),
  assigneeId: z.string().optional().nullable(),
});

// GET /api/projects/[id]/tickets/[ticketId]
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; ticketId: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, ticketId } = params;
    const userRole = await getProjectRole(projectId, user.id);
    if (!userRole) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
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
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, ticket });
  } catch (error: any) {
    console.error('[GET ticket] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/tickets/[ticketId]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; ticketId: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, ticketId } = params;
    const userRole = await getProjectRole(projectId, user.id);
    if (!canUpdateTickets(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden. Editors cannot update tickets.' },
        { status: 403 }
      );
    }

    const existing = await prisma.ticket.findFirst({
      where: { id: ticketId, projectId },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: (parsed.error as any).issues?.[0]?.message || parsed.error.message },
        { status: 400 }
      );
    }

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

    const updateData: any = {};
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.status !== undefined) updateData.status = statusMap[parsed.data.status];
    if (parsed.data.priority !== undefined) updateData.priority = priorityMap[parsed.data.priority];
    if (parsed.data.type !== undefined) updateData.type = typeMap[parsed.data.type];
    if (parsed.data.assigneeId !== undefined) updateData.assigneeId = parsed.data.assigneeId;

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
        _count: {
          select: { comments: true },
        },
      },
    });

    // Update embedding if description changed
    if (parsed.data.description !== undefined) {
      syncTicketEmbedding(ticketId, parsed.data.description).catch((err) =>
        console.warn('Vector embedding update warning:', err)
      );
    }

    return NextResponse.json({ success: true, ticket: updated });
  } catch (error: any) {
    console.error('[PUT ticket] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update ticket' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/tickets/[ticketId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; ticketId: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, ticketId } = params;
    const userRole = await getProjectRole(projectId, user.id);

    const existing = await prisma.ticket.findFirst({
      where: { id: ticketId, projectId },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
    }

    const isReporter = existing.reporterId === user.id;
    if (!canDeleteTickets(userRole, isReporter)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden. You do not have permission to delete this ticket.' },
        { status: 403 }
      );
    }

    await prisma.ticket.delete({
      where: { id: ticketId },
    });

    return NextResponse.json({ success: true, message: 'Ticket deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE ticket] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete ticket' },
      { status: 500 }
    );
  }
}
