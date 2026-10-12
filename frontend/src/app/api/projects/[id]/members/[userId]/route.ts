import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { getProjectRole, canManageMembers } from '@/lib/permissions';
import { ProjectRole } from '@prisma/client';

const roleSchema = z.object({
  role: z.enum(['manager', 'developer', 'editor']),
});

// PUT /api/projects/[id]/members/[userId] → change role
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, userId: targetUserId } = params;
    const userRole = await getProjectRole(projectId, user.id);
    if (!canManageMembers(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden. Only owners and managers can update member roles.' },
        { status: 403 }
      );
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    if (project.ownerId === targetUserId) {
      return NextResponse.json(
        { success: false, error: 'Cannot change the role of the project owner' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = roleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: (parsed.error as any).issues?.[0]?.message || parsed.error.message },
        { status: 400 }
      );
    }

    let prismaRole: ProjectRole = ProjectRole.DEVELOPER;
    if (parsed.data.role === 'manager') prismaRole = ProjectRole.MANAGER;
    if (parsed.data.role === 'editor') prismaRole = ProjectRole.EDITOR;

    const updated = await prisma.projectMember.update({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
      data: { role: prismaRole },
      include: {
        user: {
          select: { id: true, username: true, email: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json({ success: true, member: updated });
  } catch (error: any) {
    console.error('[PUT member role] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update member role' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/members/[userId] → remove member
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, userId: targetUserId } = params;
    const userRole = await getProjectRole(projectId, user.id);

    // Users can remove themselves, or owners/managers can remove members
    const isSelf = user.id === targetUserId;
    if (!isSelf && !canManageMembers(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden. Only owners and managers can remove members.' },
        { status: 403 }
      );
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    if (project.ownerId === targetUserId) {
      return NextResponse.json(
        { success: false, error: 'Cannot remove the project owner' },
        { status: 400 }
      );
    }

    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });

    return NextResponse.json({ success: true, message: 'Member removed successfully' });
  } catch (error: any) {
    console.error('[DELETE member] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to remove member' },
      { status: 500 }
    );
  }
}
