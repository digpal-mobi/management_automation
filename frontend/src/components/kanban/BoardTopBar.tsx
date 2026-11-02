'use client';

import React from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { Project, ProjectMember } from '@/types';

export interface BoardTopBarProps {
  project?: Project;
  members?: ProjectMember[];
  className?: string;
}

export function BoardTopBar(props: BoardTopBarProps) {
  return <AppHeader className={props.className} />;
}

export default BoardTopBar;
