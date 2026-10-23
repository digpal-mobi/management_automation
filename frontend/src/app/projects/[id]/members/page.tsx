'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Project, ProjectMember, ProjectMemberRole } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProjectNav } from '@/components/layout/ProjectNav';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog';
import {
  Users,
  UserPlus,
  Trash2,
  AlertCircle,
  Shield,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';

const inviteSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  role: z.enum(['manager', 'developer', 'editor']),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

export default function ProjectMembersPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { user, fetchWithAuth, isLoading: authLoading } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [userRole, setUserRole] = useState<ProjectMemberRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite Modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  // Updating role / removing member
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      identifier: '',
      role: 'developer',
    },
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // 1. Fetch project
      const pRes = await fetchWithAuth(`/api/projects/${projectId}`);
      const pData = await pRes.json();
      if (!pRes.ok || !pData.success) {
        setError(pData.error || 'Failed to load project');
        return;
      }
      setProject(pData.project);
      setUserRole(pData.project.userRole || null);

      // 2. Fetch members
      const mRes = await fetchWithAuth(`/api/projects/${projectId}/members`);
      const mData = await mRes.json();
      if (mRes.ok && mData.success) {
        setMembers(mData.members || []);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, [projectId, fetchWithAuth]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/login?redirect=/projects/${projectId}/members`);
      return;
    }
    loadData();
  }, [authLoading, user, projectId, router, loadData]);

  // Invite Member Handler
  const onInviteSubmit = async (values: InviteFormValues) => {
    try {
      setIsInviting(true);
      const res = await fetchWithAuth(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Failed to invite member');
        return;
      }

      toast.success(data.message || 'Member invited successfully!');
      reset();
      setIsInviteOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error sending invite');
    } finally {
      setIsInviting(false);
    }
  };

  // Change Role Handler
  const handleRoleChange = async (targetUserId: string, newRole: ProjectMemberRole) => {
    try {
      setUpdatingUserId(targetUserId);
      const res = await fetchWithAuth(
        `/api/projects/${projectId}/members/${targetUserId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Failed to change role');
        return;
      }

      toast.success('Role updated successfully');
      setMembers((prev) =>
        prev.map((m) => (m.userId === targetUserId ? { ...m, role: newRole } : m))
      );
    } catch (err: any) {
      toast.error(err.message || 'Error updating role');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Remove Member Handler
  const handleRemoveMember = async (targetUserId: string, username: string) => {
    if (!confirm(`Are you sure you want to remove ${username} from this project?`)) {
      return;
    }

    try {
      setUpdatingUserId(targetUserId);
      const res = await fetchWithAuth(
        `/api/projects/${projectId}/members/${targetUserId}`,
        {
          method: 'DELETE',
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Failed to remove member');
        return;
      }

      toast.success('Member removed');
      setMembers((prev) => prev.filter((m) => m.userId !== targetUserId));
    } catch (err: any) {
      toast.error(err.message || 'Error removing member');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const isOwnerOrManager = userRole === 'owner' || userRole === 'manager';

  if (loading || authLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-10 w-96 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-6 w-6 text-[#526174]" />}
        title="Unable to view members"
        description={error || 'Project not found or you lack permission to view this workspace.'}
        action={
          <Link href="/">
            <Button variant="outline" size="sm">
              Return to Workspaces
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        backLink={{ label: 'All Projects', href: '/' }}
        breadcrumbs={[
          { label: 'Projects', href: '/' },
          { label: project.name },
          { label: 'Team & Collaboration' },
        ]}
        icon={<Users className="h-6 w-6 text-[#003049]" />}
        title="Team & Collaboration"
        description="Manage workspace collaborators, assign project roles, and configure contributor permissions."
        actions={
          <div className="flex items-center gap-3">
            <ProjectNav
              projectId={projectId}
              memberCount={members.length}
              ticketCount={project.ticketCount}
            />
            {isOwnerOrManager && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                onClick={() => setIsInviteOpen(true)}
              >
                Invite
              </Button>
            )}
          </div>
        }
      />

      {/* Permissions Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm space-y-1">
          <Badge variant="role" role="owner" size="sm" />
          <p className="text-[11px] text-[#526174]">
            Full control: delete project, manage team, all CRUD.
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm space-y-1">
          <Badge variant="role" role="manager" size="sm" />
          <p className="text-[11px] text-[#526174]">
            Manage tickets & boards, invite and manage team members.
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm space-y-1">
          <Badge variant="role" role="developer" size="sm" />
          <p className="text-[11px] text-[#526174]">
            Create, update and move tickets, add comments.
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm space-y-1">
          <Badge variant="role" role="editor" size="sm" />
          <p className="text-[11px] text-[#526174]">
            View-only access and comment on tickets.
          </p>
        </div>
      </div>

      {/* Members List Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>
              <span>Project Members ({members.length})</span>
            </CardTitle>
            <span className="text-xs text-[#526174]">
              Your role: <strong className="text-[#17212B] capitalize">{userRole}</strong>
            </span>
          </div>
        </CardHeader>

        <div className="divide-y divide-[#E2E8F0]">
          {members.map((member) => {
            const isSelf = member.userId === user?.id;
            const isOwner = member.role === 'owner';
            const canModifyThisMember =
              isOwnerOrManager &&
              !isSelf &&
              !isOwner &&
              (userRole === 'owner' || member.role !== 'manager');

            return (
              <div
                key={member.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F7F8FA] transition-colors"
              >
                {/* User Info */}
                <div className="flex items-center gap-3">
                  <Avatar
                    name={member.user.username}
                    email={member.user.email}
                    size="md"
                  />

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#17212B]">
                        {member.user.username}
                      </span>
                      {isSelf && (
                        <span className="text-[10px] bg-[#EFF5F9] text-[#003049] px-1.5 py-0.5 rounded border border-[#669BBC]/30 font-medium">
                          You
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#526174] block">
                      {member.user.email}
                    </span>
                  </div>
                </div>

                {/* Role & Actions */}
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {/* Role Selector or Badge */}
                  {canModifyThisMember ? (
                    <div className="relative">
                      <select
                        value={member.role}
                        disabled={updatingUserId === member.userId}
                        onChange={(e) =>
                          handleRoleChange(
                            member.userId,
                            e.target.value as ProjectMemberRole
                          )
                        }
                        className="py-1 pl-3 pr-7 rounded-lg bg-white border border-[#E2E8F0] hover:border-[#669BBC] text-xs font-medium text-[#17212B] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#003049] cursor-pointer appearance-none disabled:opacity-50 transition-colors shadow-sm"
                      >
                        <option value="manager">Manager</option>
                        <option value="developer">Developer</option>
                        <option value="editor">Editor</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#526174] pointer-events-none" />
                    </div>
                  ) : (
                    <Badge variant="role" role={member.role} size="sm" />
                  )}

                  {/* Remove Button if authorized */}
                  {canModifyThisMember && (
                    <button
                      onClick={() =>
                        handleRemoveMember(member.userId, member.user.username)
                      }
                      disabled={updatingUserId === member.userId}
                      className="p-1.5 rounded-lg text-[#526174] hover:text-[#C1121F] hover:bg-[#FDF2F2] border border-transparent hover:border-[#C1121F]/20 transition-colors disabled:opacity-50"
                      title="Remove member from project"
                      aria-label={`Remove ${member.user.username} from project`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {members.length === 0 && (
            <div className="py-12 text-center text-[#526174] text-xs">
              No members found in this project.
            </div>
          )}
        </div>
      </Card>

      {/* Invite Member Modal */}
      <Dialog open={isInviteOpen} onOpenChange={(open) => !open && setIsInviteOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#003049]" />
              <span>Invite Team Member</span>
            </DialogTitle>
            <DialogDescription>
              Invite an existing user by email or username to collaborate on{' '}
              <strong className="text-[#17212B]">{project.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onInviteSubmit)} className="space-y-4 pt-2">
            <Input
              label="Email or Username *"
              placeholder="e.g. dev@example.com or techlead"
              error={errors.identifier?.message}
              {...register('identifier')}
            />

            <Select label="Role *" {...register('role')}>
              <option value="developer">Developer (Create/edit tickets & comments)</option>
              <option value="manager">Manager (Manage tickets, board & members)</option>
              <option value="editor">Editor (View-only & comments)</option>
            </Select>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8F0]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsInviteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isInviting}
                leftIcon={<UserPlus className="h-3.5 w-3.5" />}
              >
                Send Invite
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
