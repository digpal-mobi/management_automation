import { Project, Board, Ticket, Message, ProjectAnalytics, User } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    cache: 'no-store',
  });

  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.error || `API request failed with status ${response.status}`);
  }
  return data;
}

export const api = {
  // Projects
  async getProjects(): Promise<{ success: boolean; projects: Project[] }> {
    return request<{ success: boolean; projects: Project[] }>('/api/projects');
  },

  async getProject(id: string): Promise<{ success: boolean; project: Project }> {
    return request<{ success: boolean; project: Project }>(`/api/projects/${id}`);
  },

  async createProject(payload: {
    name: string;
    description: string;
    prdText: string;
    techStack?: string;
    goals?: string;
    constraints?: string;
    createdById?: string;
  }): Promise<{ success: boolean; project: Project; boardId: string; tickets: Ticket[] }> {
    return request('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteProject(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/projects/${id}`, { method: 'DELETE' });
  },

  async getBoard(projectId: string): Promise<{ success: boolean; project: Project; board: Board }> {
    return request(`/api/projects/${projectId}/board`);
  },

  async getAnalytics(projectId: string): Promise<{ success: boolean } & ProjectAnalytics> {
    return request(`/api/projects/${projectId}/analytics`);
  },

  // Tickets
  async createTicket(payload: Partial<Ticket>): Promise<{ success: boolean; ticket: Ticket }> {
    return request('/api/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getTicket(id: string): Promise<{ success: boolean; ticket: Ticket }> {
    return request(`/api/tickets/${id}`);
  },

  async updateTicket(id: string, payload: Partial<Ticket>): Promise<{ success: boolean; ticket: Ticket }> {
    return request(`/api/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deleteTicket(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/tickets/${id}`, { method: 'DELETE' });
  },

  // Messages / Discussion / AI Q&A
  async getTicketMessages(ticketId: string): Promise<{ success: boolean; messages: Message[] }> {
    return request(`/api/tickets/${ticketId}/messages`);
  },

  async postTicketMessage(
    ticketId: string,
    payload: { content: string; senderId?: string; senderName?: string; senderType?: string }
  ): Promise<{ success: boolean; message: Message }> {
    return request(`/api/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async askAi(
    ticketId: string,
    payload: { message: string; senderId?: string; senderName?: string }
  ): Promise<{
    success: boolean;
    userMessage: Message;
    aiMessage: Message;
    citations?: any[];
    provider?: string;
  }> {
    return request(`/api/tickets/${ticketId}/ai-chat`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Users
  async getUsers(): Promise<{ success: boolean; users: User[] }> {
    return request('/api/users');
  },
};
