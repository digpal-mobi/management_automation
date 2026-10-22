import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { getProjectRole } from '@/lib/permissions';
import { TicketPriority, FeatureReviewStatus } from '@prisma/client';

const createFeatureSchema = z.object({
  name: z.string().min(1, 'Feature name is required').max(150),
  description: z.string().min(1, 'Feature description is required'),
  module: z.string().default('Core Architecture'),
  businessValue: z.string().optional().nullable(),
  suggestedPriority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  dependencies: z.array(z.string()).optional(),
  relatedRequirements: z.array(z.string()).optional(),
  constraints: z.string().optional().nullable(),
  status: z.enum(['PROPOSED', 'ACCEPTED', 'DEFERRED']).default('PROPOSED'),
});

const priorityEnumMap: Record<string, TicketPriority> = {
  Low: TicketPriority.LOW,
  Medium: TicketPriority.MEDIUM,
  High: TicketPriority.HIGH,
  Critical: TicketPriority.CRITICAL,
};

const statusEnumMap: Record<string, FeatureReviewStatus> = {
  PROPOSED: FeatureReviewStatus.PROPOSED,
  ACCEPTED: FeatureReviewStatus.ACCEPTED,
  DEFERRED: FeatureReviewStatus.DEFERRED,
};

// GET /api/projects/[id]/features
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

    const features = await prisma.projectFeature.findMany({
      where: { projectId },
      include: {
        tickets: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            type: true,
          },
        },
      },
      orderBy: [{ module: 'asc' }, { order: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ success: true, features });
  } catch (error: any) {
    console.error('[GET features] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch features' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/features (Manual feature creation)
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
    if (userRole !== 'owner' && userRole !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Forbidden. Only owners and managers can add features.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createFeatureSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: (parsed.error as any).issues?.[0]?.message || parsed.error.message },
        { status: 400 }
      );
    }

    const count = await prisma.projectFeature.count({ where: { projectId } });

    const feature = await prisma.projectFeature.create({
      data: {
        projectId,
        name: parsed.data.name,
        description: parsed.data.description,
        module: parsed.data.module || 'Core Architecture',
        businessValue: parsed.data.businessValue || null,
        suggestedPriority: priorityEnumMap[parsed.data.suggestedPriority],
        dependencies: parsed.data.dependencies as any,
        relatedRequirements: parsed.data.relatedRequirements as any,
        constraints: parsed.data.constraints || null,
        status: statusEnumMap[parsed.data.status],
        isAiGenerated: false,
        order: count,
      },
    });

    return NextResponse.json({ success: true, feature }, { status: 201 });
  } catch (error: any) {
    console.error('[POST feature] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create feature' },
      { status: 500 }
    );
  }
}
