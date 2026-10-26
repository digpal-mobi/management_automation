import { Request, Response } from 'express';
import { prisma } from './prisma.js';
import { authenticateRequest } from './auth.js';
import { getProjectRole, UserRoleInProject } from './permissions.js';

const GLOBAL_ACCESS_ROLE_KEYS = ['system_admin', 'project_manager', 'developer', 'qa', 'viewer'];

/**
 * Projects the user may list. Global admin and pre-existing global role
 * assignments keep their current access. Everyone else is limited to
 * ownership, confirmed membership, or a project-scoped role.
 * Pending invitations are not membership and are intentionally excluded.
 */
export async function listAccessibleProjectIds(userId: string): Promise<string[] | 'all'> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role === 'admin') return 'all';

  const globalRole = await prisma.userRole.findFirst({
    where: {
      userId,
      projectId: null,
      role: { key: { in: GLOBAL_ACCESS_ROLE_KEYS } },
    },
    select: { id: true },
  });

  if (globalRole) return 'all';

  const [owned, memberships, scopedRoles] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: userId },
      select: { id: true },
    }),
    prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    }),
    prisma.userRole.findMany({
      where: { userId, projectId: { not: null } },
      select: { projectId: true },
    }),
  ]);

  return Array.from(
    new Set([
      ...owned.map((project) => project.id),
      ...memberships.map((membership) => membership.projectId),
      ...scopedRoles.map((assignment) => assignment.projectId).filter((id): id is string => Boolean(id)),
    ])
  );
}

export async function requireProjectAccess(
  req: Request,
  res: Response,
  projectId: string
): Promise<UserRoleInProject | null> {
  const user = await authenticateRequest(req);
  if (!user) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return null;
  }

  const role = await getProjectRole(projectId, user.id);
  if (!role) {
    res.status(403).json({ success: false, error: 'Access denied' });
    return null;
  }

  return role;
}
