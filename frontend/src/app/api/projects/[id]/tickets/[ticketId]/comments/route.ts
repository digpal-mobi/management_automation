import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { getProjectRole, canComment } from '@/lib/permissions';
import { processAiTicketDiscussion } from '@/lib/ticketAiAssistant';

const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(3000),
});

// GET /api/projects/[id]/tickets/[ticketId]/comments
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

    const comments = await prisma.comment.findMany({
      where: {
        ticketId,
        OR: [
          { aiProcessingStatus: null },
          { aiProcessingStatus: { not: 'SKIPPED' } },
        ],
      },
      include: {
        user: {
          select: { id: true, username: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, comments });
  } catch (error: any) {
    console.error('[GET comments] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/tickets/[ticketId]/comments
export async function POST(
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
    if (!canComment(userRole)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: (parsed.error as any).issues?.[0]?.message || parsed.error.message },
        { status: 400 }
      );
    }

    // 1. Persist the human comment
    const comment = await prisma.comment.create({
      data: {
        ticketId,
        userId: user.id,
        content: parsed.data.content,
        isAi: false,
      },
      include: {
        user: {
          select: { id: true, username: true, email: true, avatarUrl: true },
        },
      },
    });

    // 2. Automatically trigger AI discussion processing asynchronously (non-blocking)
    void processAiTicketDiscussion({
      projectId,
      ticketId,
      originalCommentId: comment.id,
    }).catch((err) => {
      console.error('[POST comments] Error during background AI discussion processing:', err);
    });

    // 3. Return original comment response immediately
    return NextResponse.json({ success: true, comment }, { status: 201 });
  } catch (error: any) {
    console.error('[POST comments] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create comment' },
      { status: 500 }
    );
  }
}
