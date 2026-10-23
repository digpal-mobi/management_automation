import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateRequest, AuthenticatedRequest } from '../lib/auth.js';
import { PERMISSIONS } from './permissions.js';
import { SYSTEM_ROLE_KEYS } from './roles.js';
import { PermissionRegistry } from './permission-registry.js';
import { UserEffectivePermissions, AuthCheckResult } from './authorization.types.js';

export class AuthorizationService {
  /**
   * Computes effective permissions for a user globally and optionally scoped to a project.
   */
  static async getUserEffectivePermissions(
    userId: string,
    projectId?: string
  ): Promise<UserEffectivePermissions> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      return {
        userId,
        isSystemAdmin: false,
        systemRoles: [],
        projectRoles: [],
        permissions: [],
      };
    }

    // 1. Check Global System Admin Status
    const isLegacyAdmin = user.role === 'admin';
    const globalUserRoles = await prisma.userRole.findMany({
      where: { userId, projectId: null },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    const systemRoleKeys = globalUserRoles.map((ur) => ur.role.key);
    const hasSystemAdminRole = systemRoleKeys.includes(SYSTEM_ROLE_KEYS.SYSTEM_ADMIN);

    const isSystemAdmin = isLegacyAdmin || hasSystemAdminRole;

    if (isSystemAdmin) {
      // System admin possesses all permissions across all resources
      const allPerms = PermissionRegistry.getAll().map((p) => p.key);
      return {
        userId,
        isSystemAdmin: true,
        systemRoles: Array.from(new Set([SYSTEM_ROLE_KEYS.SYSTEM_ADMIN, ...systemRoleKeys])),
        projectRoles: [],
        permissions: allPerms,
      };
    }

    const permissionSet = new Set<string>();

    // 2. Add permissions from global roles
    for (const ur of globalUserRoles) {
      for (const rp of ur.role.permissions) {
        permissionSet.add(rp.permission.key);
      }
    }

    const projectRoleKeys: string[] = [];

    // 3. Project-scoped permissions
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, ownerId: true },
      });

      if (project) {
        // Project Owner automatically receives all project manager permissions
        if (project.ownerId === userId) {
          projectRoleKeys.push('owner');
          const pmRole = await prisma.role.findUnique({
            where: { key: SYSTEM_ROLE_KEYS.PROJECT_MANAGER },
            include: { permissions: { include: { permission: true } } },
          });
          if (pmRole) {
            for (const rp of pmRole.permissions) {
              permissionSet.add(rp.permission.key);
            }
          }
          // Owner can also delete the project
          permissionSet.add(PERMISSIONS.PROJECT_DELETE);
        }

        // Project-scoped explicit UserRole assignments
        const projectUserRoles = await prisma.userRole.findMany({
          where: { userId, projectId },
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        });

        for (const pur of projectUserRoles) {
          projectRoleKeys.push(pur.role.key);
          for (const rp of pur.role.permissions) {
            permissionSet.add(rp.permission.key);
          }
        }

        // ProjectMember legacy fallback
        const member = await prisma.projectMember.findUnique({
          where: {
            projectId_userId: { projectId, userId },
          },
          select: { role: true },
        });

        if (member) {
          projectRoleKeys.push(member.role.toLowerCase());
          let mappedRoleKey: string = SYSTEM_ROLE_KEYS.DEVELOPER;

          if (member.role === 'OWNER' || member.role === 'MANAGER') {
            mappedRoleKey = SYSTEM_ROLE_KEYS.PROJECT_MANAGER;
          } else if (member.role === 'DEVELOPER') {
            mappedRoleKey = SYSTEM_ROLE_KEYS.DEVELOPER;
          } else if (member.role === 'EDITOR') {
            mappedRoleKey = SYSTEM_ROLE_KEYS.VIEWER;
            permissionSet.add(PERMISSIONS.TICKET_COMMENT);
          }

          const fallbackRole = await prisma.role.findUnique({
            where: { key: mappedRoleKey },
            include: { permissions: { include: { permission: true } } },
          });

          if (fallbackRole) {
            for (const rp of fallbackRole.permissions) {
              permissionSet.add(rp.permission.key);
            }
          }
        }
      }
    }

    return {
      userId,
      isSystemAdmin: false,
      systemRoles: systemRoleKeys,
      projectRoles: projectRoleKeys,
      permissions: Array.from(permissionSet),
    };
  }

  /**
   * Evaluates if an incoming Express request has permission to perform an action.
   */
  static async authorize(
    req: Request,
    permissionKey: string,
    projectId?: string
  ): Promise<AuthCheckResult & { user?: any }> {
    const user = (req as AuthenticatedRequest).user || (await authenticateRequest(req));
    if (!user) {
      return { authorized: false, reason: 'Authentication required', status: 401 };
    }

    const effective = await this.getUserEffectivePermissions(user.id, projectId);

    if (effective.isSystemAdmin) {
      return { authorized: true, user };
    }

    if (effective.permissions.includes(permissionKey)) {
      return { authorized: true, user };
    }

    return {
      authorized: false,
      reason: `Missing required permission: ${permissionKey}`,
      status: 403,
      user,
    };
  }

  /**
   * Express middleware factory for enforcing required permissions.
   */
  static requirePermission(
    permissionKey: string,
    projectIdExtractor?: (req: Request) => string | undefined
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const projectId = projectIdExtractor ? projectIdExtractor(req) : (req.params.id || (req.params as any).projectId || req.body?.projectId);
      const result = await AuthorizationService.authorize(req, permissionKey, projectId);

      if (!result.authorized) {
        return res.status(result.status || 403).json({
          success: false,
          error: result.reason || 'Forbidden: Insufficient permissions',
        });
      }

      (req as AuthenticatedRequest).user = result.user;
      next();
    };
  }
}
