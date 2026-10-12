import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { getProjectRole } from '@/lib/permissions';

const updateCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(3000),
});

// PUT /api/projects/[id]/tickets/[ticketId]/comments/[commentId]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; ticketId: string; commentId: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { commentId } = params;
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      return NextResponse.json({ success: false, error: 'Comment not found' }, { status: 404 });
    }

    if (comment.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden. You can only edit your own comments.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: (parsed.error as any).issues?.[0]?.message || parsed.error.message },
        { status: 400 }
      );
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { content: parsed.data.content },
      include: {
        user: {
          select: { id: true, username: true, email: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json({ success: true, comment: updated });
  } catch (error: any) {
    console.error('[PUT comment] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update comment' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/tickets/[ticketId]/comments/[commentId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; ticketId: string; commentId: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, commentId } = params;
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      return NextResponse.json({ success: false, error: 'Comment not found' }, { status: 404 });
    }

    const userRole = await getProjectRole(projectId, user.id);
    const isAuthor = comment.userId === user.id;
    const isOwnerOrManager = userRole === 'owner' || userRole === 'manager';

    if (!isAuthor && !isOwnerOrManager) {
      return NextResponse.json(
        { success: false, error: 'Forbidden. You cannot delete this comment.' },
        { status: 403 }
      );
    }

    await prisma.comment.delete({ where: { id: commentId } });

    return NextResponse.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE comment] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
