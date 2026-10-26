export const PROFILE_MENU_TRIGGER_LABEL = 'Open account menu';

export const PROFILE_MENU_ITEMS = [
  { id: 'profile', label: 'Profile', href: '/profile' },
  { id: 'notifications', label: 'Notifications', href: '/notifications' },
  { id: 'logout', label: 'Logout', href: null },
] as const;

export type ProfileMenuItem = (typeof PROFILE_MENU_ITEMS)[number];

export interface ProfileMenuState {
  open: boolean;
  activeIndex: number;
}

export const initialProfileMenuState: ProfileMenuState = {
  open: false,
  activeIndex: 0,
};

export type ProfileMenuAction =
  | { type: 'toggle' }
  | { type: 'open' }
  | { type: 'close' }
  | { type: 'escape' }
  | { type: 'outside' }
  | { type: 'select' }
  | { type: 'arrow'; direction: 1 | -1 }
  | { type: 'home' }
  | { type: 'end' };

export function profileMenuReducer(
  state: ProfileMenuState,
  action: ProfileMenuAction
): ProfileMenuState {
  const count = PROFILE_MENU_ITEMS.length;

  switch (action.type) {
    case 'toggle':
      return { open: !state.open, activeIndex: 0 };
    case 'open':
      return { open: true, activeIndex: 0 };
    case 'close':
    case 'escape':
    case 'outside':
    case 'select':
      return { open: false, activeIndex: 0 };
    case 'arrow': {
      if (!state.open) return { open: true, activeIndex: 0 };
      return {
        open: true,
        activeIndex: (state.activeIndex + action.direction + count) % count,
      };
    }
    case 'home':
      return { open: true, activeIndex: 0 };
    case 'end':
      return { open: true, activeIndex: count - 1 };
    default:
      return state;
  }
}

export function resolveProfileMenuAction(
  item: ProfileMenuItem
): { type: 'navigate'; href: string } | { type: 'logout' } {
  if (item.id === 'logout' || !item.href) return { type: 'logout' };
  return { type: 'navigate', href: item.href };
}
