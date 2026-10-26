'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Project, ProjectInvitation, ProjectMember, ProjectMemberRole, User } from '@/types';
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
  Mail,
} from 'lucide-react';
import Link from 'next/link';

const inviteSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  role: z.enum(['manager', 'developer', 'editor']),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

interface MembersClientProps {
  projectId: string;
  projectSlug: string;
  project: Project;
  initialMembers: ProjectMember[];
}

export function MembersClient({
  projectId,
  projectSlug,
  project: initialProject,
  initialMembers,
}: MembersClientProps) {
  const router = useRouter();
  const { user, fetchWithAuth, isLoading: authLoading } = useAuth();

  const [project, setProject] = useState<Project | null>(initialProject);
  const [members, setMembers] = useState<ProjectMember[]>(initialMembers);
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [userRole, setUserRole] = useState<ProjectMemberRole | null>(initialProject.userRole || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Invite Modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  // Updating role / removing member
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      identifier: '',
      role: 'developer',
    },
  });

  const loadInvitations = useCallback(async () => {
    const response = await fetchWithAuth(`/api/projects/${projectId}/invitations`);
    if (!response.ok) return;
    const data = await response.json();
    if (data.success) setInvitations(data.invitations || []);
  }, [fetchWithAuth, projectId]);

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
      await loadInvitations();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, [projectId, fetchWithAuth, loadInvitations]);

  const isInitialMount = React.useRef(true);
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/login?redirect=/projects/${projectSlug}/members`);
      return;
    }
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (initialProject && initialMembers.length > 0) {
        void loadInvitations();
        return;
      }
    }
    loadData();
  }, [authLoading, user, projectId, projectSlug, router, loadData, loadInvitations, initialProject, initialMembers]);

  const identifierValue = watch('identifier');

  useEffect(() => {
    if (!isInviteOpen) {
      setSearchResults([]);
      return;
    }
    const query = identifierValue?.trim() || '';
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetchWithAuth(`/api/users/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (response.ok && data.success) setSearchResults(data.users || []);
      } catch {
        setSearchResults([]);
      }
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [identifierValue, isInviteOpen, fetchWithAuth]);

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

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm('Revoke this pending invitation? The invitee will no longer be able to accept it.')) {
      return;
    }
    try {
      setRevokingId(invitationId);
      const response = await fetchWithAuth(
        `/api/projects/${projectId}/invitations/${invitationId}/revoke`,
        { method: 'POST' }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        toast.error(data.error || 'Failed to revoke invitation');
        return;
      }
      toast.success('Invitation revoked');
      setInvitations((current) =>
        current.map((invitation) =>
          invitation.id === invitationId ? { ...invitation, ...data.invitation, actionable: false } : invitation
        )
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke invitation');
    } finally {
      setRevokingId(null);
    }
  };

  const isOwnerOrManager = userRole === 'owner' || userRole === 'manager';
  const pendingInvitations = invitations.filter((invitation) => invitation.status === 'PENDING');

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
          { label: project.name, href: `/projects/${projectSlug}` },
          { label: 'Team & Collaboration' },
        ]}
        icon={<Users className="h-6 w-6 text-[#003049]" />}
        title="Team & Collaboration"
        description="Manage workspace collaborators, assign project roles, and configure contributor permissions."
        actions={
          <div className="flex items-center gap-3">
            <ProjectNav
              projectId={projectId}
              projectSlug={projectSlug}
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

      {isOwnerOrManager && (
        <Card>
          <CardHeader>
            <CardTitle>
              <Mail className="h-4 w-4 text-[#003049]" />
              <span>Pending invitations ({pendingInvitations.length})</span>
            </CardTitle>
          </CardHeader>
          <div className="divide-y divide-[#E2E8F0]">
            {pendingInvitations.length === 0 && (
              <p className="px-5 py-8 text-center text-xs text-[#526174]">
                No pending invitations. Invited people do not get project access until they accept.
              </p>
            )}
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-[#17212B]">
                    {invitation.invitee?.username || invitation.recipientEmail}
                  </p>
                  <p className="text-xs text-[#526174]">
                    {invitation.recipientEmail} · {invitation.role} · pending
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={revokingId === invitation.id}
                  onClick={() => void handleRevokeInvitation(invitation.id)}
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

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
            {searchResults.length > 0 && (
              <ul className="max-h-40 overflow-auto rounded-xl border border-[#E2E8F0]">
                {searchResults.map((result) => (
                  <li key={result.id}>
                    <button
                      type="button"
                      className="flex w-full flex-col px-3 py-2 text-left hover:bg-[#F1F4F7]"
                      onClick={() => {
                        setValue('identifier', result.email, { shouldValidate: true });
                        setSearchResults([]);
                      }}
                    >
                      <span className="text-xs font-semibold text-[#17212B]">{result.username}</span>
                      <span className="text-[11px] text-[#526174]">{result.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

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
