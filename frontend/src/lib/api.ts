import {
  Project,
  Board,
  BoardColumn,
  Ticket,
  Message,
  ProjectAnalytics,
  User,
  ProjectDocument,
  ProjectFeature,
  ProjectMember,
  ProjectMemberRole,
  Role,
  Permission,
  UserRole,
  UserEffectivePermissions,
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

export const boardApi = {
  async getBoard(projectId: string): Promise<{ success: boolean; project: Project; board: Board; tickets: Ticket[] }> {
    return request(`/api/projects/${projectId}/board`);
  },

  async createColumn(
    projectId: string,
    payload: { name: string; description?: string | null; category?: string; color?: string | null }
  ): Promise<{ success: boolean; column: BoardColumn }> {
    return request(`/api/projects/${projectId}/board/columns`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateColumn(
    projectId: string,
    columnId: string,
    payload: Partial<BoardColumn>
  ): Promise<{ success: boolean; column: BoardColumn }> {
    return request(`/api/projects/${projectId}/board/columns/${columnId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deleteColumn(
    projectId: string,
    columnId: string,
    fallbackColumnId?: string
  ): Promise<{ success: boolean; message: string; hasTickets?: boolean; ticketCount?: number; availableColumns?: any[] }> {
    const url = fallbackColumnId
      ? `/api/projects/${projectId}/board/columns/${columnId}?fallbackColumnId=${fallbackColumnId}`
      : `/api/projects/${projectId}/board/columns/${columnId}`;
    return request(url, {
      method: 'DELETE',
      body: fallbackColumnId ? JSON.stringify({ fallbackColumnId }) : undefined,
    });
  },

  async reorderColumns(
    projectId: string,
    columnIds: string[]
  ): Promise<{ success: boolean; columns: BoardColumn[] }> {
    return request(`/api/projects/${projectId}/board/columns/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ columnIds }),
    });
  },
};

export const authorizationApi = {
  async getPermissions(): Promise<{
    success: boolean;
    permissions: Permission[];
    byCategory: Record<string, Permission[]>;
    dbPermissions: Permission[];
  }> {
    return request('/api/authorization/permissions');
  },

  async getRoles(): Promise<{ success: boolean; roles: Role[] }> {
    return request('/api/authorization/roles');
  },

  async getRole(id: string): Promise<{ success: boolean; role: Role }> {
    return request(`/api/authorization/roles/${id}`);
  },

  async createRole(payload: {
    key: string;
    name: string;
    description?: string | null;
    permissionKeys: string[];
  }): Promise<{ success: boolean; role: Role }> {
    return request('/api/authorization/roles', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateRole(
    id: string,
    payload: {
      name?: string;
      description?: string | null;
      permissionKeys?: string[];
    }
  ): Promise<{ success: boolean; role: Role }> {
    return request(`/api/authorization/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteRole(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/authorization/roles/${id}`, {
      method: 'DELETE',
    });
  },

  async getUserPermissions(projectId?: string): Promise<{
    success: boolean;
    effective: UserEffectivePermissions;
  }> {
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    return request(`/api/authorization/user-permissions${query}`);
  },

  async assignRole(payload: {
    userId: string;
    roleId: string;
    projectId?: string | null;
  }): Promise<{ success: boolean; assignment: UserRole }> {
    return request('/api/authorization/assign', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async unassignRole(payload: {
    userRoleId?: string;
    userId?: string;
    roleId?: string;
    projectId?: string | null;
  }): Promise<{ success: boolean; message: string }> {
    return request('/api/authorization/unassign', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// Backwards-compatible consolidated `api` export
export const api = {
  ...projectsApi,
  ...boardApi,
  getTicket: async (id: string): Promise<{ success: boolean; ticket: Ticket }> => {
    return request(`/api/tickets/${id}`);
  },
  getUsers: async (): Promise<{ success: boolean; users: User[] }> => {
    return request('/api/users');
  },
};
