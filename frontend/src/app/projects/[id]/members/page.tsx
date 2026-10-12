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
  ArrowLeft,
  Kanban,
  Loader2,
  AlertCircle,
  FileText,
  Compass,
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
          method: 'PUT',
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
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-7 w-7 text-white animate-spin" />
        <p className="text-xs text-[#A3A3A3]">Loading team members...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3 text-center">
        <AlertCircle className="h-7 w-7 text-white" />
        <h3 className="text-sm font-semibold text-white">Unable to view members</h3>
        <p className="text-xs text-[#A3A3A3] max-w-sm">{error}</p>
        <Link
          href="/"
          className="px-4 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white hover:bg-[#2A2A2A]"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2A2A2A]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#525252] mb-1.5">
            <Link href="/" className="hover:text-white flex items-center gap-1 transition-colors">
              <ArrowLeft className="h-3 w-3" />
              <span>Projects</span>
            </Link>
            <span>/</span>
            <span className="text-white font-medium truncate max-w-xs">{project.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Users className="h-6 w-6 text-white" />
            <span>Team & Collaboration</span>
          </h1>
          <p className="text-xs text-[#A3A3A3] mt-1">
            Manage members, assign project roles, and configure contributor permissions.
          </p>
        </div>

        {/* Tab links & Invite Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#0A0A0A] p-1 rounded-xl border border-[#2A2A2A]">
            <Link
              href={`/projects/${projectId}/knowledge`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#A3A3A3] hover:text-white hover:bg-[#141414] transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Knowledge</span>
            </Link>
            <Link
              href={`/projects/${projectId}/roadmap`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#A3A3A3] hover:text-white hover:bg-[#141414] transition-colors"
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Roadmap</span>
            </Link>
            <Link
              href={`/projects/${projectId}/board`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#A3A3A3] hover:text-white hover:bg-[#141414] transition-colors"
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Board</span>
            </Link>
            <Link
              href={`/projects/${projectId}/members`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-black shadow-sm"
            >
              <Users className="h-3.5 w-3.5" />
              <span>Team</span>
            </Link>
          </div>

          {isOwnerOrManager && (
            <Button
              onClick={() => setIsInviteOpen(true)}
              variant="primary"
              size="sm"
              className="flex items-center gap-1.5"
            >
              <UserPlus className="h-4 w-4" />
              <span>Invite Member</span>
            </Button>
          )}
        </div>
      </div>

      {/* Permissions Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A]">
          <Badge variant="role" role="owner" size="sm" className="mb-1.5" />
          <p className="text-[11px] text-[#A3A3A3]">
            Full control: delete project, manage team, all CRUD.
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A]">
          <Badge variant="role" role="manager" size="sm" className="mb-1.5" />
          <p className="text-[11px] text-[#A3A3A3]">
            Manage tickets & boards, invite and manage team members.
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A]">
          <Badge variant="role" role="developer" size="sm" className="mb-1.5" />
          <p className="text-[11px] text-[#A3A3A3]">
            Create, update and move tickets, add comments.
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A]">
          <Badge variant="role" role="editor" size="sm" className="mb-1.5" />
          <p className="text-[11px] text-[#A3A3A3]">
            View-only access and comment on tickets.
          </p>
        </div>
      </div>

      {/* Members List Table */}
      <div className="rounded-2xl border border-[#2A2A2A] bg-[#0A0A0A] overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-[#2A2A2A] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            Project Members ({members.length})
          </h3>
          <span className="text-xs text-[#525252]">
            Your role: <strong className="text-white capitalize">{userRole}</strong>
          </span>
        </div>

        <div className="divide-y divide-[#2A2A2A]">
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
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#141414] transition-colors"
              >
                {/* User Info */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#141414] border border-[#2A2A2A] text-white font-bold text-sm flex items-center justify-center">
                    {(member.user.username || member.user.email)[0].toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {member.user.username}
                      </span>
                      {isSelf && (
                        <span className="text-[10px] bg-[#141414] text-[#A3A3A3] px-1.5 py-0.5 rounded border border-[#2A2A2A]">
                          You
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#A3A3A3] block">
                      {member.user.email}
                    </span>
                  </div>
                </div>

                {/* Role & Actions */}
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {/* Role Selector or Badge */}
                  {canModifyThisMember ? (
                    <select
                      value={member.role}
                      disabled={updatingUserId === member.userId}
                      onChange={(e) =>
                        handleRoleChange(
                          member.userId,
                          e.target.value as ProjectMemberRole
                        )
                      }
                      className="px-3 py-1.5 rounded-xl bg-[#000000] border border-[#2A2A2A] text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-white cursor-pointer disabled:opacity-50"
                    >
                      <option value="manager">Manager</option>
                      <option value="developer">Developer</option>
                      <option value="editor">Editor</option>
                    </select>
                  ) : (
                    <Badge variant="role" role={member.role} size="md" />
                  )}

                  {/* Remove Button */}
                  {canModifyThisMember && (
                    <button
                      type="button"
                      disabled={updatingUserId === member.userId}
                      onClick={() =>
                        handleRemoveMember(member.userId, member.user.username)
                      }
                      className="p-1.5 rounded-lg text-[#525252] hover:text-white hover:bg-[#2A2A2A] transition-colors disabled:opacity-50"
                      title="Remove member from project"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {members.length === 0 && (
            <div className="py-12 text-center text-[#525252] text-xs">
              No members found in this project.
            </div>
          )}
        </div>
      </div>

      {/* Invite Member Modal */}
      <Dialog open={isInviteOpen} onOpenChange={(open) => !open && setIsInviteOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-white" />
              <span>Invite Team Member</span>
            </DialogTitle>
            <DialogDescription>
              Invite an existing user by email or username to collaborate on{' '}
              <strong className="text-white">{project.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onInviteSubmit)} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-[#A3A3A3] block mb-1">
                Email or Username *
              </label>
              <input
                type="text"
                {...register('identifier')}
                placeholder="e.g. dev@example.com or techlead"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-[#000000] border text-xs text-white placeholder-[#525252] focus:outline-none focus:ring-1 focus:ring-white ${
                  errors.identifier ? 'border-white' : 'border-[#2A2A2A]'
                }`}
              />
              {errors.identifier && (
                <span className="text-[11px] text-[#A3A3A3] mt-1 block">
                  {errors.identifier.message}
                </span>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-[#A3A3A3] block mb-1">
                Role *
              </label>
              <select
                {...register('role')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#000000] border border-[#2A2A2A] text-xs text-white focus:outline-none focus:ring-1 focus:ring-white cursor-pointer"
              >
                <option value="developer">Developer (Create/edit tickets & comments)</option>
                <option value="manager">Manager (Manage tickets, board & members)</option>
                <option value="editor">Editor (View-only & comments)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#2A2A2A]">
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
                disabled={isInviting}
              >
                {isInviting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Sending Invite...
                  </>
                ) : (
                  'Send Invite'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
