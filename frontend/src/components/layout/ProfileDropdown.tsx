'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, LogOut, UserRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { NOTIFICATIONS_UPDATED_EVENT } from '@/lib/notifications';
import {
  PROFILE_MENU_ITEMS,
  PROFILE_MENU_TRIGGER_LABEL,
  ProfileMenuItem,
  initialProfileMenuState,
  profileMenuReducer,
  resolveProfileMenuAction,
} from './profileMenu';

const ICONS = {
  profile: UserRound,
  notifications: Bell,
  logout: LogOut,
} as const;

interface ProfileDropdownProps {
  onOpen?: () => void;
}

export function ProfileDropdown({ onOpen }: ProfileDropdownProps) {
  const { user, logout, fetchWithAuth } = useAuth();
  const router = useRouter();
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [menu, setMenu] = useState(initialProfileMenuState);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetchWithAuth('/api/notifications/unread-count');
      const data = await response.json();
      if (response.ok && data.success) {
        setUnreadCount(Number(data.count) || 0);
      }
    } catch {
      setUnreadCount(0);
    }
  }, [fetchWithAuth, user]);

  useEffect(() => {
    void loadUnreadCount();
    const onUpdate = () => {
      void loadUnreadCount();
    };
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, onUpdate);
    const interval = window.setInterval(() => {
      void loadUnreadCount();
    }, 60_000);
    return () => {
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, onUpdate);
      window.clearInterval(interval);
    };
  }, [loadUnreadCount]);

  useEffect(() => {
    if (!menu.open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setMenu((current) => profileMenuReducer(current, { type: 'outside' }));
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenu((current) => profileMenuReducer(current, { type: 'escape' }));
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menu.open]);

  useEffect(() => {
    if (!menu.open) return;
    itemRefs.current[menu.activeIndex]?.focus();
  }, [menu.open, menu.activeIndex]);

  if (!user) return null;

  const activate = (item: ProfileMenuItem) => {
    const action = resolveProfileMenuAction(item);
    setMenu((current) => profileMenuReducer(current, { type: 'select' }));
    if (action.type === 'logout') {
      void logout();
      return;
    }
    router.push(action.href);
  };

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setMenu((current) =>
        current.open ? current : profileMenuReducer(current, { type: 'open' })
      );
      onOpen?.();
    }
  };

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setMenu((current) => profileMenuReducer(current, { type: 'arrow', direction: 1 }));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setMenu((current) => profileMenuReducer(current, { type: 'arrow', direction: -1 }));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setMenu((current) => profileMenuReducer(current, { type: 'home' }));
    } else if (event.key === 'End') {
      event.preventDefault();
      setMenu((current) => profileMenuReducer(current, { type: 'end' }));
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate(PROFILE_MENU_ITEMS[menu.activeIndex]);
    }
  };

  const unreadLabel = unreadCount === 1 ? '1 unread notification' : `${unreadCount} unread notifications`;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 text-left hover:bg-[#F1F4F7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003049]"
        aria-label={
          unreadCount > 0
            ? `${PROFILE_MENU_TRIGGER_LABEL}. ${unreadLabel}`
            : PROFILE_MENU_TRIGGER_LABEL
        }
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-controls={menuId}
        data-testid="profile-menu-trigger"
        onClick={() => {
          setMenu((current) => profileMenuReducer(current, { type: 'toggle' }));
          onOpen?.();
        }}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="relative">
          <Avatar name={user.username} email={user.email} avatarUrl={user.avatarUrl} size="sm" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-[#C1121F] px-1 text-[9px] font-bold leading-4 text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </span>
        <span className="hidden sm:block">
          <span className="block text-xs font-semibold leading-none text-[#17212B]">{user.username}</span>
          <span className="mt-1 block max-w-[140px] truncate text-[10px] leading-none text-[#526174]">
            {user.email}
          </span>
        </span>
      </button>

      {menu.open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          data-testid="profile-menu"
          className="absolute right-0 z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-[#E2E8F0] bg-white p-1.5 shadow-dropdown"
          onKeyDown={onMenuKeyDown}
        >
          <div className="border-b border-[#E2E8F0] px-3 py-2.5 sm:hidden">
            <p className="truncate text-xs font-semibold text-[#17212B]">{user.username}</p>
            <p className="truncate text-[11px] text-[#526174]">{user.email}</p>
          </div>
          {PROFILE_MENU_ITEMS.map((item, index) => {
            const Icon = ICONS[item.id];
            const isLogout = item.id === 'logout';
            return (
              <button
                key={item.id}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                type="button"
                role="menuitem"
                tabIndex={menu.activeIndex === index ? 0 : -1}
                data-testid={`profile-menu-${item.id}`}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003049] ${
                  isLogout
                    ? 'text-[#C1121F] hover:bg-[#FDF2F2]'
                    : 'text-[#17212B] hover:bg-[#F1F4F7]'
                }`}
                onClick={() => activate(item)}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                {item.id === 'notifications' && unreadCount > 0 && (
                  <span
                    className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#C1121F] px-1.5 text-[10px] font-bold text-white"
                    aria-label={unreadLabel}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
