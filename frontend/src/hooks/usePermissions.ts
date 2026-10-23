'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { UserEffectivePermissions } from '@/types';

export function usePermissions(projectId?: string) {
  const { fetchWithAuth, user, isLoading: authLoading } = useAuth();
  const [effective, setEffective] = useState<UserEffectivePermissions | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setEffective(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
      const res = await fetchWithAuth(`/api/authorization/user-permissions${query}`);
      const data = await res.json();

      if (res.ok && data.success && data.effective) {
        setEffective(data.effective);
      } else {
        throw new Error(data.error || 'Failed to resolve user permissions');
      }
    } catch (err: any) {
      console.error('[usePermissions] Error:', err);
      setError(err.message || 'Error loading permissions');
    } finally {
      setLoading(false);
    }
  }, [user, projectId, fetchWithAuth]);

  useEffect(() => {
    if (!authLoading) {
      fetchPermissions();
    }
  }, [authLoading, fetchPermissions]);

  const permissionsSet = useMemo(() => {
    return new Set(effective?.permissions || []);
  }, [effective]);

  const can = useCallback(
    (permissionKey: string): boolean => {
      if (!user) return false;
      if (effective?.isSystemAdmin) return true;
      return permissionsSet.has(permissionKey);
    },
    [user, effective, permissionsSet]
  );

  return {
    permissions: effective?.permissions || [],
    systemRoles: effective?.systemRoles || [],
    projectRoles: effective?.projectRoles || [],
    isSystemAdmin: effective?.isSystemAdmin || false,
    can,
    loading: loading || authLoading,
    error,
    refetch: fetchPermissions,
  };
}
