import type { Metadata } from 'next';
import { NotificationsClient } from '@/components/notifications/NotificationsClient';

export const metadata: Metadata = {
  title: 'Notifications | TaskPulse AI',
  robots: { index: false, follow: false },
};

export default function NotificationsPage() {
  return <NotificationsClient />;
}
