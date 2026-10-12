export type ProjectMemberRole = 'owner' | 'manager' | 'developer' | 'editor';

export type TicketStatus = 'To Do' | 'In Progress' | 'Done';

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type Priority = TicketPriority;

export type TicketType = 'Feature' | 'Bug' | 'Task' | 'Improvement';

export interface User {
  id: string;
  email: string;
  username: string;
  role?: string;
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  user: User;
  role: ProjectMemberRole;
  invitedAt: string;
  acceptedAt?: string | null;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  owner?: User;
  userRole?: ProjectMemberRole;
  createdAt: string;
  updatedAt: string;
  members?: ProjectMember[];
  ticketCount?: number;
  memberCount?: number;
  boardId?: string | null;
}

export interface Board {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  columns?: Column[];
}

export interface Column {
  id: string;
  name: string;
  tickets: Ticket[];
}

export interface Comment {
  id: string;
  ticketId: string;
  userId: string;
  user: User;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  boardId: string;
  projectId: string;
  title: string;
  description?: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  assigneeId?: string | null;
  assignee?: User | null;
  reporterId?: string | null;
  reporter?: User | null;
  createdAt: string;
  updatedAt: string;
  comments?: Comment[];
  _count?: {
    comments: number;
  };
}

export interface Message {
  id: string;
  ticketId: string;
  senderId?: string;
  senderName?: string;
  senderType?: 'user' | 'ai';
  content: string;
  createdAt: string;
}

export interface ProjectAnalytics {
  totalTickets: number;
  completedTickets: number;
  inProgressTickets: number;
  todoTickets: number;
  completionRate: number;
  priorityBreakdown: Record<string, number>;
  typeBreakdown: Record<string, number>;
}
