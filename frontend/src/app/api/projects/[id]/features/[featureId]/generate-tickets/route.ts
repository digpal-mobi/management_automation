import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { getProjectRole } from '@/lib/permissions';
import { generateTicketsForSelectedFeature } from '@/lib/ai';
import { syncTicketEmbedding } from '@/lib/embeddings';
import { TicketPriority, TicketType, TicketStatus } from '@prisma/client';

const priorityEnumMap: Record<string, TicketPriority> = {
  Low: TicketPriority.LOW,
  Medium: TicketPriority.MEDIUM,
  High: TicketPriority.HIGH,
  Critical: TicketPriority.CRITICAL,
};

const typeEnumMap: Record<string, TicketType> = {
  Feature: TicketType.FEATURE,
  Task: TicketType.TASK,
  Bug: TicketType.BUG,
  Improvement: TicketType.IMPROVEMENT,
};

// POST /api/projects/[id]/features/[featureId]/generate-tickets
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; featureId: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, featureId } = params;
    const userRole = await getProjectRole(projectId, user.id);
    if (userRole !== 'owner' && userRole !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Forbidden. Only owners and managers can generate tickets.' },
        { status: 403 }
      );
    }

    const feature = await prisma.projectFeature.findFirst({
      where: { id: featureId, projectId },
    });
    if (!feature) {
      return NextResponse.json({ success: false, error: 'Feature not found' }, { status: 404 });
    }

    // Resolve Board
    let board = await prisma.board.findFirst({ where: { projectId } });
    if (!board) {
      board = await prisma.board.create({
        data: { projectId, name: 'Main Board' },
      });
    }

    // 1. Generate tickets scoped specifically to this feature
    const generatedTicketSpecs = await generateTicketsForSelectedFeature(featureId);

    const createdTickets = [];

    // 2. Insert generated tickets linked to this feature
    for (const spec of generatedTicketSpecs) {
      const ticket = await prisma.ticket.create({
        data: {
          projectId,
          boardId: board.id,
          featureId: feature.id,
          title: spec.title,
          description: spec.description,
          status: TicketStatus.TODO,
          priority: priorityEnumMap[spec.priority] || TicketPriority.MEDIUM,
          type: typeEnumMap[spec.type] || TicketType.FEATURE,
          acceptanceCriteria: spec.acceptanceCriteria as any,
          technicalNotes: spec.technicalNotes,
          prChecklist: spec.prChecklist as any,
          storyPoints: spec.storyPoints,
          reporterId: user.id,
        },
        include: {
          feature: true,
          reporter: {
            select: { id: true, username: true, email: true },
          },
        },
      });

      // 3. Sync pgvector embedding for semantic retrieval
      try {
        await syncTicketEmbedding(ticket.id, `${ticket.title}\n\n${ticket.description || ''}`);
      } catch (embErr) {
        console.warn('Embedding sync warning:', embErr);
      }

      createdTickets.push(ticket);
    }

    // Mark feature as ACCEPTED if it was PROPOSED
    if (feature.status === 'PROPOSED') {
      await prisma.projectFeature.update({
        where: { id: featureId },
        data: { status: 'ACCEPTED' },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${createdTickets.length} tickets for "${feature.name}".`,
      tickets: createdTickets,
    });
  } catch (error: any) {
    console.error('[POST generate-tickets] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate tickets for feature' },
      { status: 500 }
    );
  }
}
