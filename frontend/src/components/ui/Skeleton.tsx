'use client';

import React from 'react';
import { cn } from '@/lib/cn';

export function Skeleton({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-button bg-elevated/80', className)}
      {...props}
    />
  );
}
