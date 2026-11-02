import React from 'react';
import {
  TicketPriority,
  TicketType,
  TicketStatus,
  ProjectMemberRole,
  FeatureReviewStatus,
  DocumentProcessingStatus,
} from '@/types';
import { cn } from '@/lib/cn';

interface BadgeProps {
  children?: React.ReactNode;
  variant?:
    | 'default'
    | 'outline'
    | 'secondary'
    | 'priority'
    | 'type'
    | 'status'
    | 'role'
    | 'featureStatus'
    | 'docStatus';
  priority?: TicketPriority;
  type?: TicketType;
  status?: TicketStatus;
  role?: ProjectMemberRole;
  featureStatus?: FeatureReviewStatus;
  docStatus?: DocumentProcessingStatus;
  className?: string;
  size?: 'sm' | 'md';
}

export function Badge({
  children,
  variant = 'default',
  priority,
  type,
  status,
  role,
  featureStatus,
  docStatus,
  className = '',
  size = 'md',
}: BadgeProps) {
  const sizeClasses =
    size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  if (variant === 'priority' || priority) {
    const p = priority || (children as TicketPriority);
    const styles: Record<TicketPriority, { bg: string; dot: string }> = {
      Critical: { bg: 'bg-danger-subtle text-danger border-danger/30 font-bold', dot: 'bg-danger' },
      High: { bg: 'bg-warning-subtle text-warning border-warning/30 font-semibold', dot: 'bg-warning' },
      Medium: { bg: 'bg-accent-subtle text-accent border-accent/30 font-semibold', dot: 'bg-accent' },
      Low: { bg: 'bg-elevated text-ts border-border', dot: 'bg-tm' },
    };

    const s = styles[p] || styles.Medium;
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 font-medium rounded-full border',
          sizeClasses,
          s.bg,
          className
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
        <span>{p}</span>
      </span>
    );
  }

  if (variant === 'type' || type) {
    const t = type || (children as TicketType);
    const typeStyles: Record<TicketType, string> = {
      Feature: 'bg-accent-subtle text-accent border-accent/30 font-medium',
      Bug: 'bg-danger-subtle text-danger border-danger/30 font-semibold',
      Task: 'bg-elevated text-tp border-border',
      Improvement: 'bg-warning-subtle text-warning border-warning/30 font-medium',
    };

    return (
      <span
        className={cn(
          'inline-flex items-center font-medium rounded-md border',
          sizeClasses,
          typeStyles[t] || 'bg-elevated text-tp border-border',
          className
        )}
      >
        {t}
      </span>
    );
  }

  if (variant === 'status' || status) {
    const st = status || (children as TicketStatus);
    const statusStyles: Record<TicketStatus, string> = {
      'To Do': 'bg-elevated text-ts border-border',
      'In Progress': 'bg-accent-subtle text-accent border-accent/30 font-medium',
      Done: 'bg-success-subtle text-success border-success/30 font-semibold',
    };

    return (
      <span
        className={cn(
          'inline-flex items-center font-medium rounded-md border',
          sizeClasses,
          statusStyles[st] || 'bg-elevated text-tp border-border',
          className
        )}
      >
        {st}
      </span>
    );
  }

  if (variant === 'role' || role) {
    const r = role || (children as ProjectMemberRole);
    const roleStyles: Record<ProjectMemberRole, { bg: string; label: string }> = {
      owner: { bg: 'bg-accent text-canvas border-accent font-bold', label: 'Owner' },
      manager: { bg: 'bg-accent-subtle text-accent border-accent/30 font-semibold', label: 'Manager' },
      developer: { bg: 'bg-elevated text-tp border-border', label: 'Developer' },
      editor: { bg: 'bg-surface text-ts border-border', label: 'Editor' },
    };

    const s = roleStyles[r] || roleStyles.developer;
    return (
      <span
        className={cn(
          'inline-flex items-center font-medium rounded-full border',
          sizeClasses,
          s.bg,
          className
        )}
      >
        {s.label}
      </span>
    );
  }

  if (variant === 'featureStatus' || featureStatus) {
    const fs = featureStatus || (children as FeatureReviewStatus);
    const fStyles: Record<FeatureReviewStatus, { bg: string; label: string }> = {
      PROPOSED: { bg: 'bg-warning-subtle text-warning border-warning/30 font-medium', label: 'Proposed' },
      ACCEPTED: { bg: 'bg-success-subtle text-success border-success/30 font-semibold', label: 'Accepted' },
      DEFERRED: { bg: 'bg-elevated text-ts border-border', label: 'Deferred' },
    };

    const s = fStyles[fs] || fStyles.PROPOSED;
    return (
      <span
        className={cn(
          'inline-flex items-center font-medium rounded-md border',
          sizeClasses,
          s.bg,
          className
        )}
      >
        {s.label}
      </span>
    );
  }

  if (variant === 'docStatus' || docStatus) {
    const ds = docStatus || (children as DocumentProcessingStatus);
    const dStyles: Record<DocumentProcessingStatus, { bg: string; label: string }> = {
      COMPLETED: { bg: 'bg-success-subtle text-success border-success/30 font-medium', label: 'Processed' },
      PROCESSING: {
        bg: 'bg-accent-subtle text-accent border-accent/40 animate-pulse font-medium',
        label: 'Processing',
      },
      FAILED: { bg: 'bg-danger-subtle text-danger border-danger/30 font-bold', label: 'Failed' },
      PENDING: { bg: 'bg-elevated text-ts border-border', label: 'Pending' },
    };

    const s = dStyles[ds] || dStyles.PENDING;
    return (
      <span
        className={cn(
          'inline-flex items-center font-medium rounded-md border',
          sizeClasses,
          s.bg,
          className
        )}
      >
        {s.label}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-md border border-border bg-elevated text-tp',
        sizeClasses,
        className
      )}
    >
      {children}
    </span>
  );
}
