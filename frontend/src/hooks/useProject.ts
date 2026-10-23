'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Project, ProjectMember, ProjectMemberRole } from '@/types';

export function useProject(projectId: string | undefined) {
  const { fetchWithAuth, isLoading: authLoading, user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProject = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch project details
      const pRes = await fetchWithAuth(`/api/projects/${projectId}`);
      const pData = await pRes.json();

      if (!pRes.ok || !pData.success) {
        throw new Error(pData.error || 'Failed to load project');
      }

      setProject(pData.project);

      // Fetch members
      const mRes = await fetchWithAuth(`/api/projects/${projectId}/members`);
      const mData = await mRes.json();
      if (mRes.ok && mData.success) {
        setMembers(mData.members || []);
      }
    } catch (err: any) {
      console.error('useProject error:', err);
      setError(err.message || 'An error occurred while loading project');
    } finally {
      setLoading(false);
    }
  }, [projectId, fetchWithAuth]);

  useEffect(() => {
    if (!authLoading && user && projectId) {
      loadProject();
    }
  }, [authLoading, user, projectId, loadProject]);

  const userRole: ProjectMemberRole | null = project?.userRole || null;
  const isOwner = userRole === 'owner';
  const isManager = userRole === 'manager';
  const canEdit = isOwner || isManager;

  return {
    project,
    members,
    userRole,
    canEdit,
    isOwner,
    isManager,
    loading: loading || authLoading,
    error,
    reload: loadProject,
  };
}
