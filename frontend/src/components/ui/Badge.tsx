import React from 'react';
import { TicketPriority, TicketType, TicketStatus, ProjectMemberRole } from '@/types';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary' | 'priority' | 'type' | 'status' | 'role';
  priority?: TicketPriority;
  type?: TicketType;
  status?: TicketStatus;
  role?: ProjectMemberRole;
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
  className = '',
  size = 'md',
}: BadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  // 1. Priority Badges
  if (variant === 'priority' || priority) {
    const p = priority || (children as TicketPriority);
    const styles: Record<TicketPriority, { bg: string; dot: string; text: string }> = {
      Low: { bg: 'bg-blue-500/10 border-blue-500/20', dot: 'bg-blue-500', text: 'text-blue-400' },
      Medium: { bg: 'bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-500', text: 'text-amber-400' },
      High: { bg: 'bg-orange-500/10 border-orange-500/20', dot: 'bg-orange-500', text: 'text-orange-400' },
      Critical: { bg: 'bg-rose-500/15 border-rose-500/30', dot: 'bg-rose-500 animate-pulse', text: 'text-rose-400' },
    };

    const s = styles[p] || styles.Medium;
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${sizeClasses} ${s.bg} ${s.text} ${className}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {p}
      </span>
    );
  }

  // 2. Type Badges
  if (variant === 'type' || type) {
    const t = type || (children as TicketType);
    const typeStyles: Record<TicketType, string> = {
      Feature: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      Bug: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      Task: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      Improvement: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    };

    return (
      <span
        className={`inline-flex items-center font-medium rounded-md border ${sizeClasses} ${
          typeStyles[t] || 'bg-slate-800 text-slate-300 border-slate-700'
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
      'To Do': 'bg-slate-800 text-slate-300 border-slate-700',
      'In Progress': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'Done': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    };

    return (
      <span
        className={`inline-flex items-center font-medium rounded-md border ${sizeClasses} ${
          statusStyles[st] || 'bg-slate-800 text-slate-300 border-slate-700'
        } ${className}`}
      >
        {st}
      </span>
    );
  }

  // 4. Role Badges
  if (variant === 'role' || role) {
    const r = role || (children as ProjectMemberRole);
    const roleStyles: Record<ProjectMemberRole, { bg: string; text: string; label: string }> = {
      owner: { bg: 'bg-purple-500/10 border-purple-500/30', text: 'text-purple-400', label: 'Owner' },
      manager: { bg: 'bg-indigo-500/10 border-indigo-500/30', text: 'text-indigo-400', label: 'Manager' },
      developer: { bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400', label: 'Developer' },
      editor: { bg: 'bg-slate-800 border-slate-700', text: 'text-slate-300', label: 'Editor' },
    };

    const s = roleStyles[r] || roleStyles.developer;
    return (
      <span
        className={`inline-flex items-center font-semibold uppercase tracking-wider rounded-md border ${sizeClasses} ${s.bg} ${s.text} ${className}`}
      >
        {s.label}
      </span>
    );
  }

  const variantMap = {
    default: 'bg-slate-800 text-slate-200 border-slate-700',
    secondary: 'bg-slate-900 text-slate-400 border-slate-800',
    outline: 'bg-transparent text-slate-400 border-slate-700',
    priority: '',
    type: '',
    status: '',
    role: '',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border ${sizeClasses} ${variantMap[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
