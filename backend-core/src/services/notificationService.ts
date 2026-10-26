import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/apiError.js';
import { serializeInvitation } from './invitationService.js';

const notificationInclude = {
  project: { select: { id: true, name: true, slug: true } },
  invitation: {
    include: {
      project: { select: { id: true, name: true, slug: true } },
      inviter: { select: { id: true, username: true, avatarUrl: true } },
      invitedUser: { select: { id: true, username: true, email: true, avatarUrl: true } },
    },
  },
} satisfies Prisma.NotificationInclude;

type NotificationRecord = Prisma.NotificationGetPayload<{ include: typeof notificationInclude }>;

function safeHref(metadata: Prisma.JsonValue | null): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const href = (metadata as Record<string, unknown>).href;
  if (typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//')) return null;
  return href;
}

export function serializeNotification(notification: NotificationRecord) {
  const invitation = notification.invitation ? serializeInvitation(notification.invitation) : null;
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    projectId: notification.projectId,
    project: notification.project
      ? {
          id: notification.project.id,
          name: notification.project.name,
          slug: notification.project.slug,
        }
      : invitation?.project || null,
    invitationId: notification.invitationId,
    invitation,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
    metadata: notification.metadata,
    href: safeHref(notification.metadata),
  };
}

export class NotificationService {
  static async list(userId: string, options: { limit?: number; unreadOnly?: boolean } = {}) {
    const limit = Math.min(Math.max(options.limit || 50, 1), 100);
    const notifications = await prisma.notification.findMany({
      where: {
        recipientId: userId,
        ...(options.unreadOnly ? { readAt: null } : {}),
      },
      include: notificationInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return notifications.map(serializeNotification);
  }

  static async unreadCount(userId: string) {
    return prisma.notification.count({
      where: { recipientId: userId, readAt: null },
    });
  }

  static async markRead(userId: string, notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { id: true, recipientId: true },
    });
    if (!notification || notification.recipientId !== userId) {
      throw new ApiError(404, 'Notification not found');
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
      include: notificationInclude,
    });
    return serializeNotification(updated);
  }

  static async markAllRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  }
}
