import {
  InvitationStatus,
  NotificationType,
  Prisma,
  ProjectRole,
} from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/apiError.js';
import { assertRateLimit } from '../lib/rateLimit.js';
import { deliverInvitationEmail } from '../lib/invitationEmail.js';
import { canInviteMembers, canManageMembers, getProjectRole } from '../lib/permissions.js';

export const INVITATION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export type InviteRole = 'manager' | 'developer' | 'editor';

const invitationInclude = {
  project: { select: { id: true, name: true, slug: true } },
  inviter: { select: { id: true, username: true, avatarUrl: true } },
  invitedUser: { select: { id: true, username: true, email: true, avatarUrl: true } },
} satisfies Prisma.ProjectInvitationInclude;

type InvitationRecord = Prisma.ProjectInvitationGetPayload<{ include: typeof invitationInclude }>;

const ROLE_LABEL: Record<InviteRole, string> = {
  manager: 'Manager',
  developer: 'Developer',
  editor: 'Editor',
};

export function toProjectRole(role: InviteRole): ProjectRole {
  if (role === 'manager') return ProjectRole.MANAGER;
  if (role === 'editor') return ProjectRole.EDITOR;
  return ProjectRole.DEVELOPER;
}

export function effectiveInvitationStatus(invitation: {
  status: InvitationStatus;
  expiresAt: Date;
}): InvitationStatus {
  if (invitation.status === InvitationStatus.PENDING && invitation.expiresAt.getTime() <= Date.now()) {
    return InvitationStatus.EXPIRED;
  }
  return invitation.status;
}

export function serializeInvitation(invitation: InvitationRecord) {
  const status = effectiveInvitationStatus(invitation);
  return {
    id: invitation.id,
    projectId: invitation.projectId,
    project: invitation.project
      ? {
          id: invitation.project.id,
          name: invitation.project.name,
          slug: invitation.project.slug,
        }
      : undefined,
    invitedUserId: invitation.invitedUserId,
    recipientEmail: invitation.recipientEmail,
    invitee: invitation.invitedUser
      ? {
          id: invitation.invitedUser.id,
          username: invitation.invitedUser.username,
          email: invitation.invitedUser.email,
          avatarUrl: invitation.invitedUser.avatarUrl,
        }
      : null,
    inviterId: invitation.inviterId,
    inviter: invitation.inviter
      ? {
          id: invitation.inviter.id,
          username: invitation.inviter.username,
          avatarUrl: invitation.inviter.avatarUrl,
        }
      : null,
    role: invitation.role.toLowerCase(),
    status,
    actionable: status === InvitationStatus.PENDING,
    expiresAt: invitation.expiresAt,
    respondedAt: invitation.respondedAt,
    createdAt: invitation.createdAt,
  };
}

export async function ensureInvitationConstraints() {
    await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS project_invitations_one_pending
    ON project_invitations (project_id, recipient_email)
    WHERE status = 'pending'
  `);
}

async function expireStaleInvitations(where: Prisma.ProjectInvitationWhereInput = {}) {
  await prisma.projectInvitation.updateMany({
    where: {
      ...where,
      status: InvitationStatus.PENDING,
      expiresAt: { lte: new Date() },
    },
    data: { status: InvitationStatus.EXPIRED },
  });
}

function assertInvitationRecipient(
  invitation: { invitedUserId: string | null; recipientEmail: string },
  user: { id: string; email: string }
) {
  const ownsInvitation =
    invitation.invitedUserId === user.id ||
    invitation.recipientEmail.toLowerCase() === user.email.toLowerCase();
  if (!ownsInvitation) {
    throw new ApiError(404, 'Invitation not found');
  }
}

async function findInvitationOrThrow(invitationId: string) {
  const invitation = await prisma.projectInvitation.findUnique({
    where: { id: invitationId },
    include: invitationInclude,
  });
  if (!invitation) {
    throw new ApiError(404, 'Invitation not found');
  }
  return invitation;
}

export class InvitationService {
  static async createInvitation(input: {
    projectId: string;
    inviterId: string;
    identifier: string;
    role: InviteRole;
  }) {
    assertRateLimit(`invite:${input.inviterId}`, 20, 60_000);

    const inviterRole = await getProjectRole(input.projectId, input.inviterId);
    if (!canInviteMembers(inviterRole)) {
      throw new ApiError(403, 'Forbidden. Only owners and managers can invite project members.');
    }

    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { id: true, name: true, slug: true },
    });
    if (!project) {
      throw new ApiError(404, 'Project not found');
    }

    const cleanIdentifier = input.identifier.trim().toLowerCase();
    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: cleanIdentifier }, { username: cleanIdentifier }],
      },
      select: { id: true, email: true, username: true, avatarUrl: true },
    });

    if (!targetUser) {
      throw new ApiError(
        404,
        `User "${input.identifier.trim()}" not found. Please ensure they have registered an account.`
      );
    }

    if (targetUser.id === input.inviterId) {
      throw new ApiError(400, 'You cannot invite yourself to this project.');
    }

    const existingMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId: targetUser.id } },
      select: { id: true },
    });
    if (existingMember || project && (await prisma.project.findFirst({
      where: { id: project.id, ownerId: targetUser.id },
      select: { id: true },
    }))) {
      throw new ApiError(409, `User "${targetUser.username}" is already a member of this project.`);
    }

    await expireStaleInvitations({ projectId: project.id, recipientEmail: targetUser.email });

    const inviter = await prisma.user.findUnique({
      where: { id: input.inviterId },
      select: { id: true, username: true },
    });
    if (!inviter) {
      throw new ApiError(401, 'Unauthorized');
    }

    const role = toProjectRole(input.role);
    const roleLabel = ROLE_LABEL[input.role];
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

    let invitation: InvitationRecord;
    try {
      invitation = await prisma.$transaction(async (tx) => {
        const pending = await tx.projectInvitation.findFirst({
          where: {
            projectId: project.id,
            recipientEmail: targetUser.email,
            status: InvitationStatus.PENDING,
            expiresAt: { gt: new Date() },
          },
          select: { id: true },
        });
        if (pending) {
          throw new ApiError(
            409,
            `A pending invitation already exists for ${targetUser.username}.`
          );
        }

        const created = await tx.projectInvitation.create({
          data: {
            projectId: project.id,
            invitedUserId: targetUser.id,
            recipientEmail: targetUser.email,
            inviterId: inviter.id,
            role,
            status: InvitationStatus.PENDING,
            expiresAt,
          },
          include: invitationInclude,
        });

        await tx.notification.create({
          data: {
            recipientId: targetUser.id,
            type: NotificationType.PROJECT_INVITATION,
            title: `Invitation to ${project.name}`,
            message: `${inviter.username} invited you to join ${project.name} as a ${roleLabel}.`,
            projectId: project.id,
            invitationId: created.id,
            metadata: {
              role: input.role,
              inviterUsername: inviter.username,
              projectName: project.name,
            },
          },
        });

        return created;
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApiError(
          409,
          `A pending invitation already exists for ${targetUser.username}.`
        );
      }
      throw error;
    }

    const emailResult = await deliverInvitationEmail({
      invitationId: invitation.id,
      recipientEmail: targetUser.email,
      projectName: project.name,
      inviterUsername: inviter.username,
      roleLabel,
    });

    return {
      message: `Invitation sent to ${targetUser.username}. They will not have access until they accept.`,
      invitation: serializeInvitation(invitation),
      emailDelivered: emailResult.delivered,
      emailError: emailResult.delivered ? undefined : emailResult.error,
    };
  }

  static async listProjectInvitations(projectId: string, actorId: string) {
    const role = await getProjectRole(projectId, actorId);
    if (!canManageMembers(role)) {
      throw new ApiError(403, 'Forbidden. Only owners and managers can view invitations.');
    }

    await expireStaleInvitations({ projectId });

    const invitations = await prisma.projectInvitation.findMany({
      where: { projectId },
      include: invitationInclude,
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map(serializeInvitation);
  }

  static async listPendingForUser(userId: string, email: string) {
    await expireStaleInvitations({
      OR: [{ invitedUserId: userId }, { recipientEmail: email.toLowerCase() }],
    });

    const invitations = await prisma.projectInvitation.findMany({
      where: {
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
        OR: [{ invitedUserId: userId }, { recipientEmail: email.toLowerCase() }],
      },
      include: invitationInclude,
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map(serializeInvitation);
  }

  static async acceptInvitation(invitationId: string, user: { id: string; email: string; username: string }) {
    assertRateLimit(`invitation-respond:${user.id}`, 30, 60_000);

    const result = await prisma.$transaction(async (tx) => {
      const invitation = await tx.projectInvitation.findUnique({
        where: { id: invitationId },
        include: invitationInclude,
      });
      if (!invitation) {
        throw new ApiError(404, 'Invitation not found');
      }
      assertInvitationRecipient(invitation, user);

      if (invitation.status === InvitationStatus.ACCEPTED) {
        const member = await tx.projectMember.findUnique({
          where: { projectId_userId: { projectId: invitation.projectId, userId: user.id } },
        });
        return { invitation, member, alreadyAccepted: true };
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        throw new ApiError(409, `This invitation is ${invitation.status.toLowerCase()} and cannot be accepted.`);
      }

      if (invitation.expiresAt.getTime() <= Date.now()) {
        await tx.projectInvitation.update({
          where: { id: invitation.id },
          data: { status: InvitationStatus.EXPIRED },
        });
        throw new ApiError(409, 'This invitation has expired.');
      }

      const updated = await tx.projectInvitation.updateMany({
        where: {
          id: invitation.id,
          status: InvitationStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
        data: {
          status: InvitationStatus.ACCEPTED,
          respondedAt: new Date(),
          invitedUserId: user.id,
        },
      });

      if (updated.count === 0) {
        const current = await tx.projectInvitation.findUnique({
          where: { id: invitation.id },
          include: invitationInclude,
        });
        if (current?.status === InvitationStatus.ACCEPTED) {
          const member = await tx.projectMember.findUnique({
            where: { projectId_userId: { projectId: current.projectId, userId: user.id } },
          });
          return { invitation: current, member, alreadyAccepted: true };
        }
        throw new ApiError(409, 'This invitation is no longer pending and cannot be accepted.');
      }

      const member = await tx.projectMember.upsert({
        where: { projectId_userId: { projectId: invitation.projectId, userId: user.id } },
        create: {
          projectId: invitation.projectId,
          userId: user.id,
          role: invitation.role,
          acceptedAt: new Date(),
        },
        update: {
          role: invitation.role,
          acceptedAt: new Date(),
        },
      });

      await tx.notification.updateMany({
        where: {
          invitationId: invitation.id,
          recipientId: user.id,
          readAt: null,
        },
        data: { readAt: new Date() },
      });

      const existingNotice = await tx.notification.findFirst({
        where: {
          invitationId: invitation.id,
          type: NotificationType.PROJECT_INVITATION_ACCEPTED,
          recipientId: invitation.inviterId,
        },
        select: { id: true },
      });

      if (!existingNotice) {
        await tx.notification.create({
          data: {
            recipientId: invitation.inviterId,
            type: NotificationType.PROJECT_INVITATION_ACCEPTED,
            title: `${user.username} joined ${invitation.project.name}`,
            message: `${user.username} accepted your invitation to ${invitation.project.name}.`,
            projectId: invitation.projectId,
            invitationId: invitation.id,
            metadata: {
              projectName: invitation.project.name,
              inviteeUsername: user.username,
            },
          },
        });
      }

      const fresh = await tx.projectInvitation.findUnique({
        where: { id: invitation.id },
        include: invitationInclude,
      });

      return { invitation: fresh || invitation, member, alreadyAccepted: false };
    });

    return {
      alreadyAccepted: result.alreadyAccepted,
      invitation: serializeInvitation(result.invitation),
      project: result.invitation.project
        ? {
            id: result.invitation.project.id,
            name: result.invitation.project.name,
            slug: result.invitation.project.slug,
          }
        : undefined,
    };
  }

  static async declineInvitation(invitationId: string, user: { id: string; email: string; username: string }) {
    assertRateLimit(`invitation-respond:${user.id}`, 30, 60_000);

    const invitation = await prisma.$transaction(async (tx) => {
      const current = await tx.projectInvitation.findUnique({
        where: { id: invitationId },
        include: invitationInclude,
      });
      if (!current) throw new ApiError(404, 'Invitation not found');
      assertInvitationRecipient(current, user);

      if (current.status === InvitationStatus.DECLINED) {
        return current;
      }
      if (current.status !== InvitationStatus.PENDING) {
        throw new ApiError(409, `This invitation is ${current.status.toLowerCase()} and cannot be declined.`);
      }
      if (current.expiresAt.getTime() <= Date.now()) {
        await tx.projectInvitation.update({
          where: { id: current.id },
          data: { status: InvitationStatus.EXPIRED },
        });
        throw new ApiError(409, 'This invitation has expired.');
      }

      const updated = await tx.projectInvitation.updateMany({
        where: { id: current.id, status: InvitationStatus.PENDING },
        data: { status: InvitationStatus.DECLINED, respondedAt: new Date(), invitedUserId: user.id },
      });
      if (updated.count === 0) {
        const latest = await tx.projectInvitation.findUnique({
          where: { id: current.id },
          include: invitationInclude,
        });
        if (latest?.status === InvitationStatus.DECLINED) return latest;
        throw new ApiError(409, 'This invitation is no longer pending and cannot be declined.');
      }

      await tx.notification.updateMany({
        where: { invitationId: current.id, recipientId: user.id, readAt: null },
        data: { readAt: new Date() },
      });

      const existingNotice = await tx.notification.findFirst({
        where: {
          invitationId: current.id,
          type: NotificationType.PROJECT_INVITATION_DECLINED,
          recipientId: current.inviterId,
        },
        select: { id: true },
      });
      if (!existingNotice) {
        await tx.notification.create({
          data: {
            recipientId: current.inviterId,
            type: NotificationType.PROJECT_INVITATION_DECLINED,
            title: `${user.username} declined an invitation`,
            message: `${user.username} declined your invitation to ${current.project.name}.`,
            projectId: current.projectId,
            invitationId: current.id,
            metadata: {
              projectName: current.project.name,
              inviteeUsername: user.username,
            },
          },
        });
      }

      const fresh = await tx.projectInvitation.findUnique({
        where: { id: current.id },
        include: invitationInclude,
      });
      return fresh || current;
    });

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: invitation.projectId, userId: user.id } },
      select: { id: true },
    });

    return {
      invitation: serializeInvitation(invitation),
      membershipCreated: Boolean(membership),
    };
  }

  static async revokeInvitation(projectId: string, invitationId: string, actorId: string) {
    assertRateLimit(`invite-revoke:${actorId}`, 20, 60_000);

    const role = await getProjectRole(projectId, actorId);
    if (!canManageMembers(role)) {
      throw new ApiError(403, 'Forbidden. Only owners and managers can revoke invitations.');
    }

    const invitation = await findInvitationOrThrow(invitationId);
    if (invitation.projectId !== projectId) {
      throw new ApiError(404, 'Invitation not found');
    }
    if (invitation.status === InvitationStatus.REVOKED) {
      return serializeInvitation(invitation);
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new ApiError(409, `This invitation is ${invitation.status.toLowerCase()} and cannot be revoked.`);
    }

    const updated = await prisma.projectInvitation.updateMany({
      where: { id: invitation.id, projectId, status: InvitationStatus.PENDING },
      data: { status: InvitationStatus.REVOKED, respondedAt: new Date() },
    });

    if (updated.count === 0) {
      const latest = await findInvitationOrThrow(invitationId);
      if (latest.status === InvitationStatus.REVOKED) return serializeInvitation(latest);
      throw new ApiError(409, 'This invitation is no longer pending and cannot be revoked.');
    }

    await prisma.notification.updateMany({
      where: {
        invitationId: invitation.id,
        type: NotificationType.PROJECT_INVITATION,
      },
      data: {
        message: `The invitation to ${invitation.project.name} is no longer available.`,
      },
    });

    const fresh = await findInvitationOrThrow(invitation.id);
    return serializeInvitation(fresh);
  }
}
