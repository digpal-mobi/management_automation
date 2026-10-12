import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { getProjectRole } from '@/lib/permissions';

const updateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100).optional(),
  description: z.string().optional().nullable(),
  goals: z.string().optional().nullable(),
  targetUsers: z.string().optional().nullable(),
  techStack: z.string().optional().nullable(),
  businessRequirements: z.string().optional().nullable(),
  technicalConstraints: z.string().optional().nullable(),
  knownDependencies: z.string().optional().nullable(),
  targetReleaseDate: z.string().optional().nullable(),
  additionalNotes: z.string().optional().nullable(),
});

// GET /api/projects/[id]
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
      return NextResponse.json(
        { success: false, error: 'Access denied. You are not a member of this project.' },
        { status: 403 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: {
          select: { id: true, username: true, email: true, avatarUrl: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, email: true, avatarUrl: true },
            },
          },
        },
        boards: true,
        _count: {
          select: {
            tickets: true,
            members: true,
            documents: true,
            features: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      project: {
        ...project,
        ticketCount: project._count.tickets,
        memberCount: project._count.members,
        documentCount: project._count.documents,
        featureCount: project._count.features,
        userRole,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/projects/[id]] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]
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
        { success: false, error: 'Forbidden. Only owners and managers can update project settings.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: (parsed.error as any).issues?.[0]?.message || parsed.error.message },
        { status: 400 }
      );
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, project: updated });
  } catch (error: any) {
    console.error('[PUT /api/projects/[id]] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]
export async function DELETE(
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
    if (userRole !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Forbidden. Only the project owner can delete this project.' },
        { status: 403 }
      );
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    return NextResponse.json({ success: true, message: 'Project deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE /api/projects/[id]] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete project' },
      { status: 500 }
    );
  }
}
