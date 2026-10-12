import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { getProjectRole, canInviteMembers } from '@/lib/permissions';
import { ProjectRole } from '@prisma/client';

const inviteSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  role: z.enum(['manager', 'developer', 'editor']),
});

// GET /api/projects/[id]/members
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

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, username: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { invitedAt: 'asc' },
    });

    return NextResponse.json({ success: true, members });
  } catch (error: any) {
    console.error('[GET members] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/members → invite by email or username
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
    if (!canInviteMembers(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden. Only owners and managers can invite members.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: (parsed.error as any).issues?.[0]?.message || parsed.error.message },
        { status: 400 }
      );
    }

    const { identifier, role } = parsed.data;
    const cleanId = identifier.toLowerCase().trim();

    // Find target user by email or username
    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: cleanId }, { username: cleanId }],
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: `User with email or username "${identifier}" does not exist` },
        { status: 404 }
      );
    }

    // Check if already a member
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUser.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { success: false, error: `${targetUser.username} is already a member of this project` },
        { status: 409 }
      );
    }

    let prismaRole: ProjectRole = ProjectRole.DEVELOPER;
    if (role === 'manager') prismaRole = ProjectRole.MANAGER;
    if (role === 'editor') prismaRole = ProjectRole.EDITOR;

    const newMember = await prisma.projectMember.create({
      data: {
        projectId,
        userId: targetUser.id,
        role: prismaRole,
        acceptedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, username: true, email: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json({ success: true, member: newMember }, { status: 201 });
  } catch (error: any) {
    console.error('[POST members] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to invite member' },
      { status: 500 }
    );
  }
}
