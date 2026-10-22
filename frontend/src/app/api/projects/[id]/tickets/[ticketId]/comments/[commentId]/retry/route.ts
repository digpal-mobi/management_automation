import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { getProjectRole, canComment } from '@/lib/permissions';
import { processAiTicketDiscussion } from '@/lib/ticketAiAssistant';

// POST /api/projects/[id]/tickets/[ticketId]/comments/[commentId]/retry
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; ticketId: string; commentId: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, ticketId, commentId } = params;
    const userRole = await getProjectRole(projectId, user.id);
    if (!canComment(userRole)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Find the targeted comment
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.ticketId !== ticketId) {
      return NextResponse.json({ success: false, error: 'Comment not found on this ticket' }, { status: 404 });
    }

    // Determine the original human comment ID
    const originalCommentId = comment.isAi && comment.parentCommentId ? comment.parentCommentId : comment.id;

    // Trigger AI discussion workflow with forceRetry: true
    void processAiTicketDiscussion({
      projectId,
      ticketId,
      originalCommentId,
      forceRetry: true,
    }).catch((err) => {
      console.error('[POST retry comment] Error during background AI discussion processing:', err);
    });

    return NextResponse.json({
      success: true,
      message: 'AI response retry scheduled successfully',
    });
  } catch (error: any) {
    console.error('[POST retry comment] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retry AI response' },
      { status: 500 }
    );
  }
}
