import { prisma } from './prisma';
import { ProjectRole } from '@prisma/client';

export type UserRoleInProject = 'owner' | 'manager' | 'developer' | 'editor';

export async function getProjectRole(
  projectId: string,
  userId: string
): Promise<UserRoleInProject | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role === 'admin') {
    return 'owner';
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  if (!project) return null;
  if (!project.ownerId || project.ownerId === userId) return 'owner';

  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
    select: { role: true },
  });

  if (!member) {
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId,
        OR: [{ projectId }, { projectId: null }],
      },
      include: { role: true },
    });
    if (userRole) {
      if (userRole.role.key === 'system_admin' || userRole.role.key === 'project_manager') {
        return 'owner';
      }
      if (userRole.role.key === 'developer') {
        return 'developer';
      }
      if (userRole.role.key === 'qa' || userRole.role.key === 'viewer') {
        return 'editor';
      }
    }
    return null;
  }

  switch (member.role) {
    case ProjectRole.OWNER:
      return 'owner';
    case ProjectRole.MANAGER:
      return 'manager';
    case ProjectRole.DEVELOPER:
      return 'developer';
    case ProjectRole.EDITOR:
      return 'editor';
    default:
      return 'developer';
  }
}

export function canManageProject(role: UserRoleInProject | null): boolean {
  return role === 'owner';
}

export function canInviteMembers(role: UserRoleInProject | null): boolean {
  return role === 'owner' || role === 'manager';
}

export function canManageMembers(role: UserRoleInProject | null): boolean {
  return role === 'owner' || role === 'manager';
}

export function canCreateTickets(role: UserRoleInProject | null): boolean {
  return role === 'owner' || role === 'manager' || role === 'developer';
}

export function canUpdateTickets(role: UserRoleInProject | null): boolean {
  return role === 'owner' || role === 'manager' || role === 'developer';
}

export function canDeleteTickets(
  role: UserRoleInProject | null,
  isReporter: boolean = false
): boolean {
  return role === 'owner' || role === 'manager' || isReporter;
}

export function canComment(role: UserRoleInProject | null): boolean {
  return role === 'owner' || role === 'manager' || role === 'developer' || role === 'editor';
}
