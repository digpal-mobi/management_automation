export function isBoardRoute(pathname: string): boolean {
  if (!pathname) return false;
  const segments = pathname.split('/').filter(Boolean);
  return segments.length >= 3 && segments[0] === 'projects' && segments[2] === 'board';
}

export interface LayoutConfig {
  showSidebar: boolean;
  isFullWidth: boolean;
}

export function getLayoutConfig(pathname: string, isAuthenticated: boolean): LayoutConfig {
  if (!isAuthenticated) {
    return { showSidebar: false, isFullWidth: false };
  }

  const onBoard = isBoardRoute(pathname);
  return {
    showSidebar: !onBoard,
    isFullWidth: onBoard,
  };
}
