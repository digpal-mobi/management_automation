export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

export type Role = 'ADMIN' | 'PM' | 'TECH_LEAD' | 'DEVELOPER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string | null;
  createdAt?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Ticket {
  id: string;
  projectId: string;
  columnId: string;
  title: string;
  description: string;
  acceptanceCriteria: ChecklistItem[];
  technicalNotes?: string | null;
  prChecklist: ChecklistItem[];
  priority: Priority;
  storyPoints: number;
  labels: string[];
  dependencies: string[];
  position: number;
  assigneeId?: string | null;
  assignee?: User | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    messages: number;
  };
}

export interface Column {
  id: string;
  boardId: string;
  name: string; // 'Backlog' | 'To Do' | 'In Progress' | 'In Review' | 'Done'
  position: number;
  tickets: Ticket[];
}

export interface Board {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  columns: Column[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  prdText: string;
  techStack?: string;
  goals?: string;
  constraints?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: User | null;
  totalTickets?: number;
  doneTickets?: number;
  totalPoints?: number;
  completionRate?: number;
  boardId?: string | null;
}

export interface MessageCitation {
  section: string;
  snippet: string;
  distance: number;
}

export interface Message {
  id: string;
  ticketId: string;
  senderType: 'USER' | 'AI';
  senderId?: string | null;
  senderName: string;
  sender?: User | null;
  content: string;
  citations?: MessageCitation[];
  createdAt: string;
}

export interface ProjectAnalytics {
  totalTickets: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
  completionPercentage: number;
  statusCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  labelCounts: Record<string, number>;
}
