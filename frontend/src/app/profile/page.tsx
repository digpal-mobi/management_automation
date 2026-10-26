'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, UserRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  React.useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login?redirect=/profile');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        backLink={{ label: 'Workspaces', href: '/' }}
        icon={<UserRound className="h-6 w-6 text-[#003049]" />}
        title="Profile"
        description="Your account details for this workspace."
        actions={
          <Link href="/notifications">
            <Button variant="outline" size="sm" leftIcon={<Bell className="h-3.5 w-3.5" />}>
              Notifications
            </Button>
          </Link>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar name={user.username} email={user.email} avatarUrl={user.avatarUrl} size="lg" />
            <div>
              <p className="text-base font-bold text-[#17212B]">{user.username}</p>
              <p className="text-xs text-[#526174]">{user.email}</p>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#526174]">Username</dt>
              <dd className="mt-1 text-sm text-[#17212B]">{user.username}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#526174]">Email</dt>
              <dd className="mt-1 text-sm text-[#17212B]">{user.email}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#526174]">Account role</dt>
              <dd className="mt-1 text-sm capitalize text-[#17212B]">{user.role || 'user'}</dd>
            </div>
            {memberSince && (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#526174]">Member since</dt>
                <dd className="mt-1 text-sm text-[#17212B]">{memberSince}</dd>
              </div>
            )}
          </dl>

          <p className="text-xs leading-relaxed text-[#526174]">
            Username and email are set when the account is created. Project roles are managed from each project team page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
