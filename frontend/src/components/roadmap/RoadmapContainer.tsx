'use client';

import React, { useState, useCallback } from 'react';
import { Project, ProjectFeature } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { RoadmapView } from './RoadmapView';

interface RoadmapContainerProps {
  projectId: string;
  projectSlug: string;
  project: Project;
  initialFeatures: ProjectFeature[];
}

export function RoadmapContainer({
  projectId,
  project,
  initialFeatures,
}: RoadmapContainerProps) {
  const { user, fetchWithAuth } = useAuth();
  const [features, setFeatures] = useState<ProjectFeature[]>(initialFeatures);

  const reloadFeatures = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}/features`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.features) {
          setFeatures(data.features);
        }
      }
    } catch (err) {
      console.error('Failed to reload features:', err);
    }
  }, [projectId, fetchWithAuth]);

  const canEdit =
    project.userRole === 'owner' ||
    project.userRole === 'manager' ||
    project.userRole === 'developer' ||
    Boolean(user && (project.ownerId === user.id || (project as any).createdBy?.id === user.id)) ||
    user?.role === 'admin' ||
    !project.userRole;

  return (
    <RoadmapView
      projectId={projectId}
      features={features}
      onFeaturesChange={reloadFeatures}
      canEdit={canEdit}
    />
  );
}
