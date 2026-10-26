'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Bell, Check, CheckCheck, MailX, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { UserNotification } from '@/types';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatRelativeTime, notifyNotificationsChanged } from '@/lib/notifications';

export function NotificationsClient() {
  const router = useRouter();
  const { user, fetchWithAuth, isLoading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAuth('/api/notifications');
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to load notifications');
        return;
      }
      setNotifications(data.notifications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login?redirect=/notifications');
      return;
    }
    void loadNotifications();
  }, [authLoading, user, router, loadNotifications]);

  const markRead = async (notificationId: string) => {
    const response = await fetchWithAuth(`/api/notifications/${notificationId}/read`, {
      method: 'POST',
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to mark notification as read');
    }
    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId ? { ...item, readAt: data.notification.readAt } : item
      )
    );
    notifyNotificationsChanged();
  };

  const markAllRead = async () => {
    try {
      setPendingAction('all');
      const response = await fetchWithAuth('/api/notifications/read-all', { method: 'POST' });
      const data = await response.json();
      if (!response.ok || !data.success) {
        toast.error(data.error || 'Failed to mark notifications as read');
        return;
      }
      setNotifications((current) =>
        current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() }))
      );
      notifyNotificationsChanged();
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark notifications as read');
    } finally {
      setPendingAction(null);
    }
  };

  const respond = async (notification: UserNotification, decision: 'accept' | 'decline') => {
    if (!notification.invitation?.id) return;
    const actionKey = `${notification.id}:${decision}`;
    try {
      setPendingAction(actionKey);
      const response = await fetchWithAuth(
        `/api/invitations/${notification.invitation.id}/${decision}`,
        { method: 'POST' }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        toast.error(data.error || `Failed to ${decision} invitation`);
        await loadNotifications();
        return;
      }
      toast.success(data.message || (decision === 'accept' ? 'Invitation accepted' : 'Invitation declined'));
      notifyNotificationsChanged();
      if (decision === 'accept' && data.project?.slug) {
        router.push(`/projects/${data.project.slug}`);
        router.refresh();
        return;
      }
      await loadNotifications();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${decision} invitation`);
    } finally {
      setPendingAction(null);
    }
  };

  const openNotification = async (notification: UserNotification) => {
    try {
      if (!notification.readAt) await markRead(notification.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update notification');
    }

    if (notification.type === 'PROJECT_INVITATION') return;

    const destination =
      notification.project?.slug &&
      (notification.type === 'PROJECT_INVITATION_ACCEPTED' ||
        notification.type === 'PROJECT_INVITATION_DECLINED')
        ? `/projects/${notification.project.slug}/members`
        : notification.href;

    if (destination) router.push(destination);
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        backLink={{ label: 'Workspaces', href: '/' }}
        icon={<Bell className="h-6 w-6 text-[#003049]" />}
        title="Notifications"
        description="Project invitations and updates for your account."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            isLoading={pendingAction === 'all'}
            disabled={!notifications.some((item) => !item.readAt)}
            leftIcon={<CheckCheck className="h-3.5 w-3.5" />}
          >
            Mark all read
          </Button>
        }
      />

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-[#FDE8E8] bg-[#FDF2F2] px-4 py-3 text-xs text-[#C1121F]">
          <span>{error}</span>
          <Button variant="outline" size="xs" onClick={() => void loadNotifications()}>
            Retry
          </Button>
        </div>
      )}

      {!error && notifications.length === 0 && (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="No notifications"
          description="Invitations and account updates will show up here."
        />
      )}

      <div className="space-y-3">
        {notifications.map((notification) => {
          const actionable = Boolean(notification.invitation?.actionable);
          const invitationStatus = notification.invitation?.status;
          return (
            <article
              key={notification.id}
              className={`rounded-2xl border bg-white p-4 shadow-card ${
                notification.readAt ? 'border-[#E2E8F0]' : 'border-[#669BBC]/50'
              }`}
            >
              <button
                type="button"
                className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003049] rounded-xl"
                onClick={() => void openNotification(notification)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[#17212B]">{notification.title}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-[#526174]">{notification.message}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <time className="block text-[11px] text-[#526174]" dateTime={notification.createdAt}>
                      {formatRelativeTime(notification.createdAt)}
                    </time>
                    <span className="mt-1 inline-flex text-[10px] font-semibold uppercase tracking-wide text-[#526174]">
                      {notification.readAt ? 'Read' : 'Unread'}
                    </span>
                  </div>
                </div>
                {notification.project?.name && (
                  <p className="mt-2 text-[11px] font-medium text-[#003049]">
                    Project: {notification.project.name}
                  </p>
                )}
              </button>

              {notification.type === 'PROJECT_INVITATION' && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {actionable ? (
                    <>
                      <Button
                        size="sm"
                        variant="primary"
                        leftIcon={<Check className="h-3.5 w-3.5" />}
                        isLoading={pendingAction === `${notification.id}:accept`}
                        disabled={pendingAction !== null}
                        onClick={() => void respond(notification, 'accept')}
                      >
                        Accept Invitation
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<XCircle className="h-3.5 w-3.5" />}
                        isLoading={pendingAction === `${notification.id}:decline`}
                        disabled={pendingAction !== null}
                        onClick={() => void respond(notification, 'decline')}
                      >
                        Decline Invitation
                      </Button>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-[#F1F4F7] px-2.5 py-1 text-[11px] font-medium text-[#526174]">
                      <MailX className="h-3.5 w-3.5" aria-hidden="true" />
                      {invitationStatus === 'ACCEPTED'
                        ? 'Accepted'
                        : invitationStatus === 'DECLINED'
                          ? 'Declined'
                          : invitationStatus === 'REVOKED'
                            ? 'Revoked'
                            : invitationStatus === 'EXPIRED'
                              ? 'Expired'
                              : 'No longer available'}
                    </span>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
