'use client';

import React from 'react';
import { AppHeader, AppHeaderProps } from './AppHeader';

export interface NavbarProps extends AppHeaderProps {
  focusedWorkspace?: boolean;
  onOpenSidebar?: () => void;
  sidebarToggle?: React.ReactNode;
}

export function Navbar(props: NavbarProps) {
  return <AppHeader {...props} />;
}

export default Navbar;
