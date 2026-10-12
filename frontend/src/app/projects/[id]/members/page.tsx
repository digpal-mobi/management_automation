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
  Shield,
  ArrowLeft,
  Kanban,
  Loader2,
  AlertCircle,
  Mail,
  User,
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
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
        <p className="text-xs text-slate-400">Loading team members...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3 text-center">
        <AlertCircle className="h-8 w-8 text-rose-400" />
        <h3 className="text-sm font-semibold text-slate-200">Unable to view members</h3>
        <p className="text-xs text-slate-400 max-w-sm">{error}</p>
        <Link
          href="/"
          className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-200 hover:bg-slate-700"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
            <Link href="/" className="hover:text-slate-200 flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              <span>Projects</span>
            </Link>
            <span>/</span>
            <span className="text-indigo-400 font-medium truncate max-w-xs">{project.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
            <Users className="h-6 w-6 text-indigo-400" />
            <span>Team & Collaboration</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage who has access to this project and their permissions.
          </p>
        </div>

        {/* Tab links & Invite Button */}
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}/board`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
          >
            <Kanban className="h-3.5 w-3.5 text-slate-400" />
            <span>Kanban Board</span>
          </Link>

          {isOwnerOrManager && (
            <Button
              onClick={() => setIsInviteOpen(true)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg shadow-indigo-500/20"
            >
              <UserPlus className="h-4 w-4" />
              <span>Invite Member</span>
            </Button>
          )}
        </div>
      </div>

      {/* Permissions Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <Badge variant="role" role="owner" size="sm" className="mb-1.5" />
          <p className="text-[11px] text-slate-400">
            Full control: delete project, manage team, all CRUD.
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <Badge variant="role" role="manager" size="sm" className="mb-1.5" />
          <p className="text-[11px] text-slate-400">
            Manage tickets & boards, invite and manage team members.
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <Badge variant="role" role="developer" size="sm" className="mb-1.5" />
          <p className="text-[11px] text-slate-400">
            Create, update and move tickets, add comments.
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <Badge variant="role" role="editor" size="sm" className="mb-1.5" />
          <p className="text-[11px] text-slate-400">
            View-only access and comment on tickets.
          </p>
        </div>
      </div>

      {/* Members List Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">
            Project Members ({members.length})
          </h3>
          <span className="text-xs text-slate-500">
            Your role: <strong className="text-slate-300 capitalize">{userRole}</strong>
          </span>
        </div>

        <div className="divide-y divide-slate-800/80">
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
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/30 transition-colors"
              >
                {/* User Info */}
                <div className="flex items-center gap-3">
                  {member.user.avatarUrl ? (
                    <img
                      src={member.user.avatarUrl}
                      alt={member.user.username}
                      className="w-10 h-10 rounded-full object-cover border border-slate-700"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-bold text-sm flex items-center justify-center">
                      {(member.user.username || member.user.email)[0].toUpperCase()}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-100">
                        {member.user.username}
                      </span>
                      {isSelf && (
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                          You
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 block">
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
                      className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-medium text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
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
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
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
            <div className="py-12 text-center text-slate-500 text-xs">
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
              <UserPlus className="h-5 w-5 text-indigo-400" />
              <span>Invite Team Member</span>
            </DialogTitle>
            <DialogDescription>
              Invite an existing user by email or username to collaborate on{' '}
              <strong>{project.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onInviteSubmit)} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Email or Username *
              </label>
              <input
                type="text"
                {...register('identifier')}
                placeholder="e.g. dev@example.com or techlead"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                  errors.identifier ? 'border-rose-500' : 'border-slate-800'
                }`}
              />
              {errors.identifier && (
                <span className="text-[11px] text-rose-400 mt-1 block">
                  {errors.identifier.message}
                </span>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Role *
              </label>
              <select
                {...register('role')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="developer">Developer (Create/edit tickets & comments)</option>
                <option value="manager">Manager (Manage tickets, board & members)</option>
                <option value="editor">Editor (View-only & comments)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsInviteOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isInviting}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl"
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
