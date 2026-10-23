import {
  Project,
  Board,
  Ticket,
  Message,
  ProjectAnalytics,
  User,
  ProjectDocument,
  ProjectFeature,
  ProjectMember,
  ProjectMemberRole,
} from '@/types';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // If endpoint is relative, let browser fetch handle it via Next.js routes
  const response = await fetch(endpoint, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new ApiError(
      data.error || `API request failed with status ${response.status}`,
      response.status
    );
  }

  return data;
}

// ── Service Modules ──────────────────────────────────────────────────────────

export const projectsApi = {
  async getAll(): Promise<{ success: boolean; projects: Project[] }> {
    return request('/api/projects');
  },

  async getById(id: string): Promise<{ success: boolean; project: Project }> {
    return request(`/api/projects/${id}`);
  },

  async create(payload: Partial<Project>): Promise<{ success: boolean; project: Project }> {
    return request('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async update(id: string, payload: Partial<Project>): Promise<{ success: boolean; project: Project }> {
    return request(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/projects/${id}`, { method: 'DELETE' });
  },

  async getAnalytics(projectId: string): Promise<{ success: boolean } & ProjectAnalytics> {
    return request(`/api/projects/${projectId}/analytics`);
  },
};

export const ticketsApi = {
  async getByProject(projectId: string): Promise<{ success: boolean; tickets: Ticket[] }> {
    return request(`/api/projects/${projectId}/tickets`);
  },

  async create(projectId: string, payload: Partial<Ticket>): Promise<{ success: boolean; ticket: Ticket }> {
    return request(`/api/projects/${projectId}/tickets`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getById(projectId: string, ticketId: string): Promise<{ success: boolean; ticket: Ticket }> {
    return request(`/api/projects/${projectId}/tickets/${ticketId}`);
  },

  async update(
    projectId: string,
    ticketId: string,
    payload: Partial<Ticket>
  ): Promise<{ success: boolean; ticket: Ticket }> {
    return request(`/api/projects/${projectId}/tickets/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async delete(projectId: string, ticketId: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/projects/${projectId}/tickets/${ticketId}`, {
      method: 'DELETE',
    });
  },

  async search(projectId: string, query: string): Promise<{ success: boolean; tickets: Ticket[] }> {
    return request(`/api/projects/${projectId}/tickets/search?q=${encodeURIComponent(query)}`);
  },

  async getComments(projectId: string, ticketId: string): Promise<{ success: boolean; comments: any[] }> {
    return request(`/api/projects/${projectId}/tickets/${ticketId}/comments`);
  },

  async addComment(
    projectId: string,
    ticketId: string,
    content: string
  ): Promise<{ success: boolean; comment: any }> {
    return request(`/api/projects/${projectId}/tickets/${ticketId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },
};

export const documentsApi = {
  async getByProject(projectId: string): Promise<{ success: boolean; documents: ProjectDocument[] }> {
    return request(`/api/projects/${projectId}/documents`);
  },

  async retry(projectId: string, docId: string): Promise<{ success: boolean }> {
    return request(`/api/projects/${projectId}/documents/${docId}/retry`, {
      method: 'POST',
    });
  },

  async delete(projectId: string, docId: string): Promise<{ success: boolean }> {
    return request(`/api/projects/${projectId}/documents/${docId}`, {
      method: 'DELETE',
    });
  },
};

export const featuresApi = {
  async getByProject(projectId: string): Promise<{ success: boolean; features: ProjectFeature[] }> {
    return request(`/api/projects/${projectId}/features`);
  },

  async create(
    projectId: string,
    payload: Partial<ProjectFeature>
  ): Promise<{ success: boolean; feature: ProjectFeature }> {
    return request(`/api/projects/${projectId}/features`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async update(
    projectId: string,
    featureId: string,
    payload: Partial<ProjectFeature>
  ): Promise<{ success: boolean; feature: ProjectFeature }> {
    return request(`/api/projects/${projectId}/features/${featureId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async delete(projectId: string, featureId: string): Promise<{ success: boolean }> {
    return request(`/api/projects/${projectId}/features/${featureId}`, {
      method: 'DELETE',
    });
  },

  async generateTickets(
    projectId: string,
    featureId: string
  ): Promise<{ success: boolean; tickets: Ticket[] }> {
    return request(`/api/projects/${projectId}/features/${featureId}/generate-tickets`, {
      method: 'POST',
    });
  },
};

export const membersApi = {
  async getByProject(projectId: string): Promise<{ success: boolean; members: ProjectMember[] }> {
    return request(`/api/projects/${projectId}/members`);
  },

  async invite(
    projectId: string,
    payload: { identifier: string; role: ProjectMemberRole }
  ): Promise<{ success: boolean; message: string }> {
    return request(`/api/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateRole(
    projectId: string,
    userId: string,
    role: ProjectMemberRole
  ): Promise<{ success: boolean }> {
    return request(`/api/projects/${projectId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  async remove(projectId: string, userId: string): Promise<{ success: boolean }> {
    return request(`/api/projects/${projectId}/members/${userId}`, {
      method: 'DELETE',
    });
  },
};

export const analysisApi = {
  async get(projectId: string): Promise<{ success: boolean; analysis: any }> {
    return request(`/api/projects/${projectId}/analysis`);
  },

  async run(projectId: string): Promise<{ success: boolean }> {
    return request(`/api/projects/${projectId}/analysis/run`, {
      method: 'POST',
    });
  },
};

// Backwards-compatible consolidated `api` export
export const api = {
  ...projectsApi,
  getBoard: async (projectId: string): Promise<{ success: boolean; project: Project; board: Board }> => {
    return request(`/api/projects/${projectId}/board`);
  },
  getTicket: async (id: string): Promise<{ success: boolean; ticket: Ticket }> => {
    return request(`/api/tickets/${id}`);
  },
  getUsers: async (): Promise<{ success: boolean; users: User[] }> => {
    return request('/api/users');
  },
};
