import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { getProjectRole } from '@/lib/permissions';

// GET /api/projects/[id]/analysis
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

    const analysis = await prisma.projectAnalysis.findUnique({
      where: { projectId },
    });

    return NextResponse.json({ success: true, analysis });
  } catch (error: any) {
    console.error('[GET analysis] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch analysis' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/analysis (edit reviewed analysis)
export async function PUT(
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
        { success: false, error: 'Forbidden. Only owners and managers can edit analysis.' },
        { status: 403 }
      );
    }

    const body = await req.json();

    const updated = await prisma.projectAnalysis.upsert({
      where: { projectId },
      create: {
        projectId,
        overview: body.overview,
        functionalRequirements: body.functionalRequirements,
        nonFunctionalRequirements: body.nonFunctionalRequirements,
        businessRules: body.businessRules,
        technicalRequirements: body.technicalRequirements,
        milestones: body.milestones,
        openQuestions: body.openQuestions,
        status: 'COMPLETED',
      },
      update: {
        overview: body.overview,
        functionalRequirements: body.functionalRequirements,
        nonFunctionalRequirements: body.nonFunctionalRequirements,
        businessRules: body.businessRules,
        technicalRequirements: body.technicalRequirements,
        milestones: body.milestones,
        openQuestions: body.openQuestions,
        status: 'COMPLETED',
      },
    });

    return NextResponse.json({ success: true, analysis: updated });
  } catch (error: any) {
    console.error('[PUT analysis] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update analysis' },
      { status: 500 }
    );
  }
}
