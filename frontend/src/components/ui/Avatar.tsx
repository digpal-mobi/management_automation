'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/cn';

export interface AvatarProps {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base font-semibold',
};

export function Avatar({
  name,
  email,
  avatarUrl,
  size = 'sm',
  className = '',
}: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const identifier = name || email || '?';
  const initial = identifier[0].toUpperCase();

  if (avatarUrl && !imageFailed) {
    return (
      <div
        className={cn(
          'relative inline-flex items-center justify-center rounded-full overflow-hidden border border-border bg-elevated flex-shrink-0',
          sizeMap[size],
          className
        )}
        title={identifier}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={identifier}
          className="w-full h-full object-cover"
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full border border-accent/30 bg-accent-subtle text-accent font-bold flex-shrink-0 select-none',
        sizeMap[size],
        className
      )}
      title={identifier}
    >
      <span>{initial}</span>
    </div>
  );
}
