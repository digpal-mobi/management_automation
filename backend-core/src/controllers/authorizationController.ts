import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateRequest, AuthenticatedRequest } from '../lib/auth.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { PermissionRegistry } from '../authorization/permission-registry.js';
import { PERMISSIONS } from '../authorization/permissions.js';
import { SYSTEM_ROLE_KEYS } from '../authorization/roles.js';

const roleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters').max(50),
  key: z
    .string()
    .min(2, 'Role key must be at least 2 characters')
    .max(50)
    .regex(/^[a-z0-9_-]+$/, 'Role key must contain only lowercase letters, numbers, hyphens, and underscores')
    .optional(),
  description: z.string().max(255).optional(),
  permissions: z.array(z.string()).default([]),
});

const assignRoleSchema = z.object({
  userId: z.string().min(1, 'Target userId is required'),
  roleId: z.string().min(1, 'roleId is required'),
  projectId: z.string().optional().nullable(),
});

const unassignRoleSchema = z.object({
  userId: z.string().min(1, 'Target userId is required'),
  roleId: z.string().min(1, 'roleId is required'),
  projectId: z.string().optional().nullable(),
});

export class AuthorizationController {
  static async getPermissions(req: Request, res: Response) {
    try {
      const auth = await AuthorizationService.authorize(req, PERMISSIONS.PERMISSION_VIEW);
      if (!auth.authorized) {
        return res.status(auth.status || 403).json({ success: false, error: auth.reason });
      }

      const grouped = PermissionRegistry.getByCategory();
      const all = PermissionRegistry.getAll();

      return res.status(200).json({
        success: true,
        permissions: all,
        categories: grouped,
      });
    } catch (error: any) {
      console.error('[AuthorizationController.getPermissions] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getRoles(req: Request, res: Response) {
    try {
      const auth = await AuthorizationService.authorize(req, PERMISSIONS.ROLE_VIEW);
      if (!auth.authorized) {
        return res.status(auth.status || 403).json({ success: false, error: auth.reason });
      }

      const roles = await prisma.role.findMany({
        orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
        include: {
          permissions: {
            include: { permission: true },
          },
          userRoles: {
            select: { id: true, userId: true },
          },
        },
      });

      const formatted = roles.map((r) => ({
        id: r.id,
        key: r.key,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        userCount: r.userRoles.length,
        permissions: r.permissions.map((rp) => rp.permission.key),
      }));

      return res.status(200).json({ success: true, roles: formatted });
    } catch (error: any) {
      console.error('[AuthorizationController.getRoles] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async createRole(req: Request, res: Response) {
    try {
      const auth = await AuthorizationService.authorize(req, PERMISSIONS.ROLE_CREATE);
      if (!auth.authorized) {
        return res.status(auth.status || 403).json({ success: false, error: auth.reason });
      }

      const parsed = roleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: (parsed.error as any).issues?.[0]?.message || parsed.error.message,
        });
      }

      const { name, description, permissions } = parsed.data;
      const key = parsed.data.key || name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

      const existingRole = await prisma.role.findFirst({
        where: {
          OR: [{ key }, { name: { equals: name, mode: 'insensitive' } }],
        },
      });

      if (existingRole) {
        return res.status(409).json({
          success: false,
          error: `A role with this name or key "${key}" already exists`,
        });
      }

      const role = await prisma.role.create({
        data: {
          key,
          name,
          description: description || null,
          isSystem: false,
        },
      });

      if (permissions && permissions.length > 0) {
        const dbPerms = await prisma.permission.findMany({
          where: { key: { in: permissions } },
        });

        for (const p of dbPerms) {
          await prisma.rolePermission.create({
            data: {
              roleId: role.id,
              permissionId: p.id,
            },
          });
        }
      }

      const created = await prisma.role.findUnique({
        where: { id: role.id },
        include: { permissions: { include: { permission: true } } },
      });

      return res.status(201).json({
        success: true,
        role: {
          id: created!.id,
          key: created!.key,
          name: created!.name,
          description: created!.description,
          isSystem: created!.isSystem,
          permissions: created!.permissions.map((rp) => rp.permission.key),
        },
      });
    } catch (error: any) {
      console.error('[AuthorizationController.createRole] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getRoleById(req: Request, res: Response) {
    try {
      const auth = await AuthorizationService.authorize(req, PERMISSIONS.ROLE_VIEW);
      if (!auth.authorized) {
        return res.status(auth.status || 403).json({ success: false, error: auth.reason });
      }

      const { id } = req.params;
      const role = await prisma.role.findUnique({
        where: { id },
        include: {
          permissions: { include: { permission: true } },
          userRoles: {
            include: {
              user: { select: { id: true, username: true, email: true, avatarUrl: true } },
              project: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!role) {
        return res.status(404).json({ success: false, error: 'Role not found' });
      }

      return res.status(200).json({
        success: true,
        role: {
          id: role.id,
          key: role.key,
          name: role.name,
          description: role.description,
          isSystem: role.isSystem,
          createdAt: role.createdAt,
          updatedAt: role.updatedAt,
          permissions: role.permissions.map((p) => p.permission.key),
          assignments: role.userRoles.map((ur) => ({
            id: ur.id,
            user: ur.user,
            project: ur.project,
            assignedAt: ur.createdAt,
          })),
        },
      });
    } catch (error: any) {
      console.error('[AuthorizationController.getRoleById] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async updateRole(req: Request, res: Response) {
    try {
      const auth = await AuthorizationService.authorize(req, PERMISSIONS.ROLE_UPDATE);
      if (!auth.authorized) {
        return res.status(auth.status || 403).json({ success: false, error: auth.reason });
      }

      const { id } = req.params;
      const role = await prisma.role.findUnique({ where: { id } });
      if (!role) {
        return res.status(404).json({ success: false, error: 'Role not found' });
      }

      const parsed = roleSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: (parsed.error as any).issues?.[0]?.message || parsed.error.message,
        });
      }

      const { name, description, permissions } = parsed.data;

      if (role.isSystem && name && name !== role.name) {
        return res.status(403).json({
          success: false,
          error: 'System role names cannot be renamed to protect workflow invariants',
        });
      }

      if (role.key === SYSTEM_ROLE_KEYS.SYSTEM_ADMIN && permissions) {
        const allSystemKeys = PermissionRegistry.getAll().map((p) => p.key);
        const hasAll = allSystemKeys.every((k) => permissions.includes(k));
        if (!hasAll) {
          return res.status(403).json({
            success: false,
            error: 'System Administrator role permissions cannot be demoted or removed',
          });
        }
      }

      const updated = await prisma.role.update({
        where: { id },
        data: {
          name: role.isSystem ? role.name : name || role.name,
          description: description !== undefined ? description : role.description,
        },
      });

      if (permissions !== undefined) {
        await prisma.rolePermission.deleteMany({ where: { roleId: id } });

        if (permissions.length > 0) {
          const dbPerms = await prisma.permission.findMany({
            where: { key: { in: permissions } },
          });

          for (const p of dbPerms) {
            await prisma.rolePermission.create({
              data: {
                roleId: id,
                permissionId: p.id,
              },
            });
          }
        }
      }

      const finalRole = await prisma.role.findUnique({
        where: { id },
        include: { permissions: { include: { permission: true } } },
      });

      return res.status(200).json({
        success: true,
        role: {
          id: finalRole!.id,
          key: finalRole!.key,
          name: finalRole!.name,
          description: finalRole!.description,
          isSystem: finalRole!.isSystem,
          permissions: finalRole!.permissions.map((rp) => rp.permission.key),
        },
      });
    } catch (error: any) {
      console.error('[AuthorizationController.updateRole] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async deleteRole(req: Request, res: Response) {
    try {
      const auth = await AuthorizationService.authorize(req, PERMISSIONS.ROLE_DELETE);
      if (!auth.authorized) {
        return res.status(auth.status || 403).json({ success: false, error: auth.reason });
      }

      const { id } = req.params;
      const role = await prisma.role.findUnique({
        where: { id },
        include: { userRoles: true },
      });

      if (!role) {
        return res.status(404).json({ success: false, error: 'Role not found' });
      }

      if (role.isSystem) {
        return res.status(403).json({
          success: false,
          error: 'Protected system roles cannot be deleted',
        });
      }

      if (role.userRoles.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot delete role "${role.name}" because it is currently assigned to ${role.userRoles.length} user(s). Reassign them first.`,
        });
      }

      await prisma.rolePermission.deleteMany({ where: { roleId: id } });
      await prisma.role.delete({ where: { id } });

      return res.status(200).json({
        success: true,
        message: `Role "${role.name}" deleted successfully`,
      });
    } catch (error: any) {
      console.error('[AuthorizationController.deleteRole] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getUserPermissions(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
      }

      const projectId = req.query.projectId as string | undefined;
      const effective = await AuthorizationService.getUserEffectivePermissions(user.id, projectId);

      return res.status(200).json({
        success: true,
        effective,
      });
    } catch (error: any) {
      console.error('[AuthorizationController.getUserPermissions] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async assignRole(req: Request, res: Response) {
    try {
      const auth = await AuthorizationService.authorize(req, PERMISSIONS.USER_MANAGE_ROLES);
      if (!auth.authorized) {
        return res.status(auth.status || 403).json({ success: false, error: auth.reason });
      }

      const parsed = assignRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: (parsed.error as any).issues?.[0]?.message || parsed.error.message,
        });
      }

      const { userId, roleId, projectId } = parsed.data;

      const targetUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!targetUser) {
        return res.status(404).json({ success: false, error: 'Target user not found' });
      }

      const role = await prisma.role.findUnique({ where: { id: roleId } });
      if (!role) {
        return res.status(404).json({ success: false, error: 'Role not found' });
      }

      if (projectId) {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
          return res.status(404).json({ success: false, error: 'Project not found' });
        }
      }

      if (role.key === SYSTEM_ROLE_KEYS.SYSTEM_ADMIN && !auth.user.isSystemAdmin && auth.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Only active System Administrators can grant System Administrator privileges',
        });
      }

      const existing = await prisma.userRole.findFirst({
        where: {
          userId,
          roleId,
          projectId: projectId || null,
        },
      });

      if (existing) {
        return res.status(200).json({
          success: true,
          message: 'User already holds this role assignment',
          assignment: existing,
        });
      }

      const assignment = await prisma.userRole.create({
        data: {
          userId,
          roleId,
          projectId: projectId || null,
        },
        include: {
          role: true,
          user: { select: { id: true, username: true, email: true } },
          project: { select: { id: true, name: true } },
        },
      });

      return res.status(201).json({
        success: true,
        message: `Role "${role.name}" assigned successfully to ${targetUser.username}`,
        assignment,
      });
    } catch (error: any) {
      console.error('[AuthorizationController.assignRole] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async unassignRole(req: Request, res: Response) {
    try {
      const auth = await AuthorizationService.authorize(req, PERMISSIONS.USER_MANAGE_ROLES);
      if (!auth.authorized) {
        return res.status(auth.status || 403).json({ success: false, error: auth.reason });
      }

      const parsed = unassignRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: (parsed.error as any).issues?.[0]?.message || parsed.error.message,
        });
      }

      const { userId, roleId, projectId } = parsed.data;

      const role = await prisma.role.findUnique({ where: { id: roleId } });
      if (!role) {
        return res.status(404).json({ success: false, error: 'Role not found' });
      }

      if (role.key === SYSTEM_ROLE_KEYS.SYSTEM_ADMIN) {
        const adminAssignments = await prisma.userRole.count({
          where: { roleId, projectId: null },
        });

        if (adminAssignments <= 1) {
          return res.status(403).json({
            success: false,
            error: 'Cannot remove the last active System Administrator from the system',
          });
        }
      }

      const result = await prisma.userRole.deleteMany({
        where: {
          userId,
          roleId,
          projectId: projectId || null,
        },
      });

      if (result.count === 0) {
        return res.status(404).json({
          success: false,
          error: 'Role assignment not found for this user/scope',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Role assignment revoked successfully',
      });
    } catch (error: any) {
      console.error('[AuthorizationController.unassignRole] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}
