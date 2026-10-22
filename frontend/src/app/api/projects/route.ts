import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { ProjectRole } from '@prisma/client';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  description: z.string().min(1, 'Short description is required'),
  goals: z.string().optional().nullable(),
  targetUsers: z.string().optional().nullable(),
  techStack: z.string().optional().nullable(),
  businessRequirements: z.string().optional().nullable(),
  technicalConstraints: z.string().optional().nullable(),
  knownDependencies: z.string().optional().nullable(),
  targetReleaseDate: z.string().optional().nullable(),
  additionalNotes: z.string().optional().nullable(),
});

// GET /api/projects → projects user owns or is member of
export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
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
        boards: {
          select: { id: true, name: true },
        },
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

    const formatted = projects.map((p) => {
      const isOwner = p.ownerId === user.id;
      const membership = p.members.find((m) => m.userId === user.id);
      const userRole = isOwner ? 'owner' : membership?.role.toLowerCase() || 'developer';

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        goals: p.goals,
        targetUsers: p.targetUsers,
        techStack: p.techStack,
        businessRequirements: p.businessRequirements,
        technicalConstraints: p.technicalConstraints,
        knownDependencies: p.knownDependencies,
        targetReleaseDate: p.targetReleaseDate,
        additionalNotes: p.additionalNotes,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        ownerId: p.ownerId,
        owner: p.owner,
        userRole,
        ticketCount: p._count.tickets,
        memberCount: p._count.members,
        documentCount: p._count.documents,
        featureCount: p._count.features,
        boardId: p.boards[0]?.id || null,
      };
    });

    return NextResponse.json({ success: true, projects: formatted });
  } catch (error: any) {
    console.error('[GET /api/projects] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects → create project
export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: (parsed.error as any).issues?.[0]?.message || parsed.error.message },
        { status: 400 }
      );
    }

    const {
      name,
      description,
      goals,
      targetUsers,
      techStack,
      businessRequirements,
      technicalConstraints,
      knownDependencies,
      targetReleaseDate,
      additionalNotes,
    } = parsed.data;

    // Create Project, Default Board, and Owner membership in a transaction
    const project = await prisma.$transaction(async (tx) => {
      const newProj = await tx.project.create({
        data: {
          name,
          description: description || null,
          goals: goals || null,
          targetUsers: targetUsers || null,
          techStack: techStack || null,
          businessRequirements: businessRequirements || null,
          technicalConstraints: technicalConstraints || null,
          knownDependencies: knownDependencies || null,
          targetReleaseDate: targetReleaseDate || null,
          additionalNotes: additionalNotes || null,
          ownerId: user.id,
        },
      });

      // Default Kanban board
      const board = await tx.board.create({
        data: {
          projectId: newProj.id,
          name: 'Main Board',
        },
      });

      // Add owner as a member
      await tx.projectMember.create({
        data: {
          projectId: newProj.id,
          userId: user.id,
          role: ProjectRole.OWNER,
          acceptedAt: new Date(),
        },
      });

      return {
        ...newProj,
        boardId: board.id,
      };
    });

    return NextResponse.json({ success: true, project }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/projects] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create project' },
      { status: 500 }
    );
  }
}
