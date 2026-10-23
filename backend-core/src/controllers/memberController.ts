import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateRequest } from '../lib/auth.js';
import { getProjectRole, canInviteMembers, canManageMembers } from '../lib/permissions.js';
import { ProjectRole } from '@prisma/client';

const inviteSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  role: z.enum(['manager', 'developer', 'editor']),
});

const roleSchema = z.object({
  role: z.enum(['manager', 'developer', 'editor']),
});

export class MemberController {
  static async getMembers(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id: projectId } = req.params;
      const userRole = await getProjectRole(projectId, user.id);
      if (!userRole) {
        return res.status(403).json({ success: false, error: 'Access denied' });
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

      return res.status(200).json({ success: true, members });
    } catch (error: any) {
      console.error('[MemberController.getMembers] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch members' });
    }
  }

  static async inviteMember(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id: projectId } = req.params;
      const userRole = await getProjectRole(projectId, user.id);
      if (!canInviteMembers(userRole)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden. Only owners and managers can invite project members.',
        });
      }

      const parsed = inviteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: (parsed.error as any).issues?.[0]?.message || parsed.error.message,
        });
      }

      const { identifier, role } = parsed.data;
      const cleanIdentifier = identifier.trim().toLowerCase();

      const targetUser = await prisma.user.findFirst({
        where: {
          OR: [{ email: cleanIdentifier }, { username: cleanIdentifier }],
        },
      });

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: `User "${identifier}" not found. Please ensure they have registered an account.`,
        });
      }

      const existingMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId, userId: targetUser.id },
        },
      });

      if (existingMember) {
        return res.status(409).json({
          success: false,
          error: `User "${targetUser.username}" is already a member of this project.`,
        });
      }

      let prismaRole: ProjectRole = ProjectRole.DEVELOPER;
      if (role === 'manager') prismaRole = ProjectRole.MANAGER;
      if (role === 'editor') prismaRole = ProjectRole.EDITOR;

      const member = await prisma.projectMember.create({
        data: {
          projectId,
          userId: targetUser.id,
          role: prismaRole,
        },
        include: {
          user: {
            select: { id: true, username: true, email: true, avatarUrl: true },
          },
        },
      });

      return res.status(201).json({
        success: true,
        message: `${targetUser.username} has been added to the project as a ${role}.`,
        member,
      });
    } catch (error: any) {
      console.error('[MemberController.inviteMember] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to invite member' });
    }
  }

  static async updateMemberRole(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id: projectId, userId: targetUserId } = req.params;
      const userRole = await getProjectRole(projectId, user.id);
      if (!canManageMembers(userRole)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden. Only owners and managers can update member roles.',
        });
      }

      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      if (project.ownerId === targetUserId) {
        return res.status(400).json({
          success: false,
          error: 'Cannot change the role of the project owner',
        });
      }

      const parsed = roleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: (parsed.error as any).issues?.[0]?.message || parsed.error.message,
        });
      }

      let prismaRole: ProjectRole = ProjectRole.DEVELOPER;
      if (parsed.data.role === 'manager') prismaRole = ProjectRole.MANAGER;
      if (parsed.data.role === 'editor') prismaRole = ProjectRole.EDITOR;

      const updated = await prisma.projectMember.update({
        where: {
          projectId_userId: { projectId, userId: targetUserId },
        },
        data: { role: prismaRole },
        include: {
          user: {
            select: { id: true, username: true, email: true, avatarUrl: true },
          },
        },
      });

      return res.status(200).json({ success: true, member: updated });
    } catch (error: any) {
      console.error('[MemberController.updateMemberRole] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to update member role' });
    }
  }

  static async removeMember(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id: projectId, userId: targetUserId } = req.params;
      const userRole = await getProjectRole(projectId, user.id);
      if (!canManageMembers(userRole)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden. Only owners and managers can remove members.',
        });
      }

      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      if (project.ownerId === targetUserId) {
        return res.status(400).json({
          success: false,
          error: 'Cannot remove the project owner from the project',
        });
      }

      await prisma.projectMember.delete({
        where: {
          projectId_userId: { projectId, userId: targetUserId },
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Member removed from project successfully',
      });
    } catch (error: any) {
      console.error('[MemberController.removeMember] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to remove member' });
    }
  }
}
