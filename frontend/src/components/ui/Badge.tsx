import React from 'react';
import {
  TicketPriority,
  TicketType,
  TicketStatus,
  ProjectMemberRole,
  FeatureReviewStatus,
  DocumentProcessingStatus,
} from '@/types';

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

  // 1. Priority Badges (Semantic with approved Brand Accents)
  if (variant === 'priority' || priority) {
    const p = priority || (children as TicketPriority);
    const styles: Record<TicketPriority, { bg: string; dot: string; text: string }> = {
      Critical: { bg: 'bg-[#FDF2F2] text-[#C1121F] border-[#FDE8E8] font-bold', dot: 'bg-[#C1121F]', text: 'text-[#C1121F]' },
      High: { bg: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A] font-semibold', dot: 'bg-[#B45309]', text: 'text-[#B45309]' },
      Medium: { bg: 'bg-[#EFF5F9] text-[#003049] border-[#669BBC]/40', dot: 'bg-[#669BBC]', text: 'text-[#003049]' },
      Low: { bg: 'bg-[#F1F4F7] text-[#526174] border-[#E2E8F0]', dot: 'bg-[#94A3B8]', text: 'text-[#526174]' },
    };

    const s = styles[p] || styles.Medium;
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${sizeClasses} ${s.bg} ${className}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        <span>{p}</span>
      </span>
    );
  }

  // 2. Type Badges
  if (variant === 'type' || type) {
    const t = type || (children as TicketType);
    const typeStyles: Record<TicketType, string> = {
      Feature: 'bg-[#EFF5F9] text-[#003049] border-[#669BBC]/40 font-medium',
      Bug: 'bg-[#FDF2F2] text-[#C1121F] border-[#FDE8E8] font-semibold',
      Task: 'bg-[#F1F4F7] text-[#17212B] border-[#E2E8F0]',
      Improvement: 'bg-[#FDF0D5] text-[#780000] border-[#F7DFAB] font-medium',
    };

    return (
      <span
        className={`inline-flex items-center font-medium rounded-md border ${sizeClasses} ${
          typeStyles[t] || 'bg-[#F1F4F7] text-[#17212B] border-[#E2E8F0]'
        } ${className}`}
      >
        {t}
      </span>
    );
  }

  // 3. Status Badges
  if (variant === 'status' || status) {
    const st = status || (children as TicketStatus);
    const statusStyles: Record<TicketStatus, string> = {
      'To Do': 'bg-[#F1F4F7] text-[#526174] border-[#CBD5E1]',
      'In Progress': 'bg-[#EFF5F9] text-[#003049] border-[#669BBC]/40 font-medium',
      Done: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0] font-semibold',
    };

    return (
      <span
        className={`inline-flex items-center font-medium rounded-md border ${sizeClasses} ${
          statusStyles[st] || 'bg-[#F1F4F7] text-[#17212B] border-[#E2E8F0]'
        } ${className}`}
      >
        {st}
      </span>
    );
  }

  // 4. Role Badges
  if (variant === 'role' || role) {
    const r = role || (children as ProjectMemberRole);
    const roleStyles: Record<ProjectMemberRole, { bg: string; label: string }> = {
      owner: { bg: 'bg-[#003049] text-white border-[#003049] font-bold shadow-xs', label: 'Owner' },
      manager: { bg: 'bg-[#EFF5F9] text-[#003049] border-[#669BBC]/40 font-semibold', label: 'Manager' },
      developer: { bg: 'bg-[#F1F4F7] text-[#17212B] border-[#E2E8F0]', label: 'Developer' },
      editor: { bg: 'bg-white text-[#526174] border-[#E2E8F0]', label: 'Editor' },
    };

    const s = roleStyles[r] || roleStyles.developer;
    return (
      <span
        className={`inline-flex items-center font-medium rounded-full border ${sizeClasses} ${s.bg} ${className}`}
      >
        {s.label}
      </span>
    );
  }

  // 5. Feature Review Status
  if (variant === 'featureStatus' || featureStatus) {
    const fs = featureStatus || (children as FeatureReviewStatus);
    const fStyles: Record<FeatureReviewStatus, { bg: string; label: string }> = {
      PROPOSED: { bg: 'bg-[#FDF0D5] text-[#780000] border-[#F7DFAB] font-medium', label: 'Proposed' },
      ACCEPTED: { bg: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0] font-semibold', label: 'Accepted' },
      DEFERRED: { bg: 'bg-[#F1F4F7] text-[#526174] border-[#E2E8F0]', label: 'Deferred' },
    };

    const s = fStyles[fs] || fStyles.PROPOSED;
    return (
      <span
        className={`inline-flex items-center font-medium rounded-md border ${sizeClasses} ${s.bg} ${className}`}
      >
        {s.label}
      </span>
    );
  }

  // 6. Document Processing Status
  if (variant === 'docStatus' || docStatus) {
    const ds = docStatus || (children as DocumentProcessingStatus);
    const dStyles: Record<DocumentProcessingStatus, { bg: string; label: string }> = {
      COMPLETED: { bg: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0] font-medium', label: 'Processed' },
      PROCESSING: { bg: 'bg-[#EFF5F9] text-[#003049] border-[#669BBC]/50 animate-pulse font-medium', label: 'Processing' },
      FAILED: { bg: 'bg-[#FDF2F2] text-[#C1121F] border-[#FDE8E8] font-bold', label: 'Failed' },
      PENDING: { bg: 'bg-[#F1F4F7] text-[#526174] border-[#E2E8F0]', label: 'Pending' },
    };

    const s = dStyles[ds] || dStyles.PENDING;
    return (
      <span
        className={`inline-flex items-center font-medium rounded-md border ${sizeClasses} ${s.bg} ${className}`}
      >
        {s.label}
      </span>
    );
  }

  // Fallback default badge
  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border border-[#E2E8F0] bg-[#F1F4F7] text-[#17212B] ${sizeClasses} ${className}`}
    >
      {children}
    </span>
  );
}
