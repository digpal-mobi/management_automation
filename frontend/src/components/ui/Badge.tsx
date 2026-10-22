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

  // 1. Priority Badges (Monochrome)
  if (variant === 'priority' || priority) {
    const p = priority || (children as TicketPriority);
    const styles: Record<TicketPriority, { bg: string; dot: string; text: string }> = {
      Critical: { bg: 'bg-white text-black border-white font-bold', dot: 'bg-black', text: 'text-black' },
      High: { bg: 'bg-[#1E1E1E] text-white border-[#404040] font-semibold', dot: 'bg-white', text: 'text-white' },
      Medium: { bg: 'bg-[#141414] text-neutral-300 border-[#2A2A2A]', dot: 'bg-neutral-400', text: 'text-neutral-300' },
      Low: { bg: 'bg-transparent text-neutral-400 border-[#2A2A2A]', dot: 'bg-neutral-600', text: 'text-neutral-400' },
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

  // 2. Type Badges (Monochrome)
  if (variant === 'type' || type) {
    const t = type || (children as TicketType);
    const typeStyles: Record<TicketType, string> = {
      Feature: 'bg-[#141414] text-white border-[#333333]',
      Bug: 'bg-white text-black border-white font-semibold',
      Task: 'bg-[#0A0A0A] text-neutral-300 border-[#2A2A2A]',
      Improvement: 'bg-[#1E1E1E] text-neutral-200 border-[#333333]',
    };

    return (
      <span
        className={`inline-flex items-center font-medium rounded-md border ${sizeClasses} ${
          typeStyles[t] || 'bg-[#141414] text-white border-[#2A2A2A]'
        } ${className}`}
      >
        {t}
      </span>
    );
  }

  // 3. Status Badges (Monochrome)
  if (variant === 'status' || status) {
    const st = status || (children as TicketStatus);
    const statusStyles: Record<TicketStatus, string> = {
      'To Do': 'bg-transparent text-neutral-400 border-[#2A2A2A]',
      'In Progress': 'bg-[#1E1E1E] text-white border-[#404040] font-medium',
      Done: 'bg-white text-black border-white font-bold',
    };

    return (
      <span
        className={`inline-flex items-center font-medium rounded-md border ${sizeClasses} ${
          statusStyles[st] || 'bg-[#141414] text-white border-[#2A2A2A]'
        } ${className}`}
      >
        {st}
      </span>
    );
  }

  // 4. Role Badges (Monochrome)
  if (variant === 'role' || role) {
    const r = role || (children as ProjectMemberRole);
    const roleStyles: Record<ProjectMemberRole, { bg: string; label: string }> = {
      owner: { bg: 'bg-white text-black border-white font-bold', label: 'Owner' },
      manager: { bg: 'bg-[#1E1E1E] text-white border-[#404040] font-semibold', label: 'Manager' },
      developer: { bg: 'bg-[#141414] text-neutral-200 border-[#2A2A2A]', label: 'Developer' },
      editor: { bg: 'bg-transparent text-neutral-400 border-[#2A2A2A]', label: 'Editor' },
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

  // 5. Feature Review Status (Monochrome)
  if (variant === 'featureStatus' || featureStatus) {
    const fs = featureStatus || (children as FeatureReviewStatus);
    const fStyles: Record<FeatureReviewStatus, { bg: string; label: string }> = {
      PROPOSED: { bg: 'bg-transparent text-neutral-400 border-[#2A2A2A]', label: 'Proposed' },
      ACCEPTED: { bg: 'bg-white text-black border-white font-bold', label: 'Accepted' },
      DEFERRED: { bg: 'bg-[#141414] text-neutral-500 border-[#2A2A2A]', label: 'Deferred' },
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

  // 6. Document Processing Status (Monochrome)
  if (variant === 'docStatus' || docStatus) {
    const ds = docStatus || (children as DocumentProcessingStatus);
    const dStyles: Record<DocumentProcessingStatus, { bg: string; label: string }> = {
      COMPLETED: { bg: 'bg-[#141414] text-white border-[#404040]', label: 'Processed' },
      PROCESSING: { bg: 'bg-[#1E1E1E] text-neutral-200 border-[#333333] animate-pulse', label: 'Processing' },
      FAILED: { bg: 'bg-white text-black border-white font-bold', label: 'Failed' },
      PENDING: { bg: 'bg-transparent text-neutral-400 border-[#2A2A2A]', label: 'Pending' },
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
      className={`inline-flex items-center font-medium rounded-md border border-[#2A2A2A] bg-[#141414] text-neutral-300 ${sizeClasses} ${className}`}
    >
      {children}
    </span>
  );
}
