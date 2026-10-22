import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { getProjectRole } from '@/lib/permissions';
import { TicketPriority, FeatureReviewStatus } from '@prisma/client';

const updateFeatureSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().min(1).optional(),
  module: z.string().optional(),
  businessValue: z.string().optional().nullable(),
  suggestedPriority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  dependencies: z.array(z.string()).optional(),
  relatedRequirements: z.array(z.string()).optional(),
  constraints: z.string().optional().nullable(),
  status: z.enum(['PROPOSED', 'ACCEPTED', 'DEFERRED']).optional(),
  order: z.number().optional(),
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

// GET /api/projects/[id]/features/[featureId]
export async function GET(
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
    if (!userRole) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const feature = await prisma.projectFeature.findFirst({
      where: { id: featureId, projectId },
      include: {
        tickets: true,
      },
    });

    if (!feature) {
      return NextResponse.json({ success: false, error: 'Feature not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, feature });
  } catch (error: any) {
    console.error('[GET feature] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch feature' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/features/[featureId]
export async function PUT(
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
        { success: false, error: 'Forbidden. Only owners and managers can edit features.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateFeatureSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: (parsed.error as any).issues?.[0]?.message || parsed.error.message },
        { status: 400 }
      );
    }

    const dataToUpdate: any = {};
    if (parsed.data.name !== undefined) dataToUpdate.name = parsed.data.name;
    if (parsed.data.description !== undefined) dataToUpdate.description = parsed.data.description;
    if (parsed.data.module !== undefined) dataToUpdate.module = parsed.data.module;
    if (parsed.data.businessValue !== undefined) dataToUpdate.businessValue = parsed.data.businessValue;
    if (parsed.data.constraints !== undefined) dataToUpdate.constraints = parsed.data.constraints;
    if (parsed.data.dependencies !== undefined) dataToUpdate.dependencies = parsed.data.dependencies;
    if (parsed.data.relatedRequirements !== undefined) dataToUpdate.relatedRequirements = parsed.data.relatedRequirements;
    if (parsed.data.order !== undefined) dataToUpdate.order = parsed.data.order;
    if (parsed.data.suggestedPriority) dataToUpdate.suggestedPriority = priorityEnumMap[parsed.data.suggestedPriority];
    if (parsed.data.status) dataToUpdate.status = statusEnumMap[parsed.data.status];

    const updated = await prisma.projectFeature.update({
      where: { id: featureId },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, feature: updated });
  } catch (error: any) {
    console.error('[PUT feature] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update feature' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/features/[featureId]
export async function DELETE(
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
        { success: false, error: 'Forbidden. Only owners and managers can delete features.' },
        { status: 403 }
      );
    }

    await prisma.projectFeature.delete({
      where: { id: featureId },
    });

    return NextResponse.json({ success: true, message: 'Feature removed successfully' });
  } catch (error: any) {
    console.error('[DELETE feature] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete feature' },
      { status: 500 }
    );
  }
}
