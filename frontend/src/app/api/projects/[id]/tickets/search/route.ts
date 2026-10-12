import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { getProjectRole } from '@/lib/permissions';
import { searchProjectTicketsSemantic } from '@/lib/embeddings';

// GET /api/projects/[id]/tickets/search?q=
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

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';

    if (!query.trim()) {
      return NextResponse.json({ success: true, tickets: [] });
    }

    const tickets = await searchProjectTicketsSemantic(projectId, query.trim(), 15);

    // Map relations if missing from raw query
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

    return NextResponse.json({ success: true, tickets: fullTickets, query });
  } catch (error: any) {
    console.error('[GET /tickets/search] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Semantic search failed' },
      { status: 500 }
    );
  }
}
