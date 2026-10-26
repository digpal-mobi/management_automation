import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import {
  Project,
  ProjectMember,
  ProjectFeature,
  BoardColumn,
  Ticket,
  ProjectDocument,
  ProjectAnalysis,
  SprintPlan,
  ProjectAnalytics,
} from '@/types';

const BACKEND_URL =
  process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function getServerCookieHeader(): string {
  try {
    const cookieStore = cookies();
    return cookieStore.toString();
  } catch {
    return '';
  }
}

interface FetchProjectResult {
  project: Project;
  canonicalSlug?: string;
  isRedirect?: boolean;
}

/**
 * Fetch project from backend-core using SSR cookies for authentication.
 * Handles 401 (redirects to login) and 404/403 (notFound).
 */
export async function fetchServerProject(slugOrId: string): Promise<FetchProjectResult | null> {
  const cookieHeader = getServerCookieHeader();

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/projects/${encodeURIComponent(slugOrId)}`, {
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Private authenticated data must never be cached across requests
    });
  } catch (err) {
    console.error(`[SSR] Error connecting to backend-core for project "${slugOrId}":`, err);
    return null;
  }

  if (res.status === 401) {
    redirect(`/login?redirect=/projects/${encodeURIComponent(slugOrId)}`);
  }

  if (res.status === 404 || res.status === 403) {
    return null;
  }

  if (!res.ok) {
    return null;
  }

  try {
    const data = await res.json();
    if (!data.success || !data.project) {
      return null;
    }
    return {
      project: data.project,
      canonicalSlug: data.canonicalSlug || data.project.slug,
      isRedirect: Boolean(data.isRedirect),
    };
  } catch (err) {
    console.error(`[SSR] Failed to parse JSON response for project "${slugOrId}":`, err);
    return null;
  }
}

/**
 * Validates the project, handles legacy UUID or old slug redirects,
 * and returns the authenticated Project and internal UUID.
 */
export async function getCanonicalProjectOrRedirect(
  slugOrId: string,
  subpath: string = ''
): Promise<{ project: Project; internalId: string }> {
  const result = await fetchServerProject(slugOrId);
  if (!result || !result.project) {
    notFound();
  }

  const { project, isRedirect, canonicalSlug } = result;
  const canonical = canonicalSlug || project.slug || project.id;

  // If accessed via legacy UUID or historical renamed slug, redirect to canonical slug URL
  if (isRedirect || slugOrId !== canonical) {
    const cleanSubpath = subpath ? (subpath.startsWith('/') ? subpath : `/${subpath}`) : '';
    redirect(`/projects/${canonical}${cleanSubpath}`);
  }

  return { project, internalId: project.id };
}

/**
 * SSR fetch for Project Members
 */
export async function fetchServerMembers(internalIdOrSlug: string): Promise<ProjectMember[]> {
  const cookieHeader = getServerCookieHeader();
  try {
    const res = await fetch(`${BACKEND_URL}/api/projects/${encodeURIComponent(internalIdOrSlug)}/members`, {
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.members || [];
  } catch {
    return [];
  }
}

/**
 * SSR fetch for Board (columns & tickets)
 */
export async function fetchServerBoard(
  internalIdOrSlug: string
): Promise<{ columns: BoardColumn[]; tickets: Ticket[] }> {
  const cookieHeader = getServerCookieHeader();
  try {
    const res = await fetch(`${BACKEND_URL}/api/projects/${encodeURIComponent(internalIdOrSlug)}/board`, {
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      cache: 'no-store',
    });
    if (!res.ok) return { columns: [], tickets: [] };
    const data = await res.json();
    const columns = data.board?.columns ? [...data.board.columns].sort((a: any, b: any) => a.position - b.position) : [];
    return {
      columns,
      tickets: data.tickets || [],
    };
  } catch {
    return { columns: [], tickets: [] };
  }
}

/**
 * SSR fetch for Roadmap features
 */
export async function fetchServerFeatures(internalIdOrSlug: string): Promise<ProjectFeature[]> {
  const cookieHeader = getServerCookieHeader();
  try {
    const res = await fetch(`${BACKEND_URL}/api/projects/${encodeURIComponent(internalIdOrSlug)}/features`, {
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.features || [];
  } catch {
    return [];
  }
}

/**
 * SSR fetch for Knowledge Documents
 */
export async function fetchServerDocuments(internalIdOrSlug: string): Promise<ProjectDocument[]> {
  const cookieHeader = getServerCookieHeader();
  try {
    const res = await fetch(`${BACKEND_URL}/api/projects/${encodeURIComponent(internalIdOrSlug)}/documents`, {
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.documents || [];
  } catch {
    return [];
  }
}

/**
 * SSR fetch for Knowledge Analysis
 */
export async function fetchServerAnalysis(internalIdOrSlug: string): Promise<ProjectAnalysis | null> {
  const cookieHeader = getServerCookieHeader();
  try {
    const res = await fetch(`${BACKEND_URL}/api/projects/${encodeURIComponent(internalIdOrSlug)}/analysis`, {
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.analysis || null;
  } catch {
    return null;
  }
}

/**
 * SSR fetch for Sprint Plan
 */
export async function fetchServerPlan(
  internalIdOrSlug: string
): Promise<{ latestPlan: SprintPlan | null; planHistory: any[] }> {
  const cookieHeader = getServerCookieHeader();
  try {
    const [latestRes, historyRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/projects/${encodeURIComponent(internalIdOrSlug)}/plan/latest`, {
        headers: { ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
        cache: 'no-store',
      }),
      fetch(`${BACKEND_URL}/api/projects/${encodeURIComponent(internalIdOrSlug)}/plan/history`, {
        headers: { ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
        cache: 'no-store',
      }),
    ]);

    let latestPlan: SprintPlan | null = null;
    let planHistory: any[] = [];

    if (latestRes.ok) {
      const lData = await latestRes.json();
      latestPlan = lData.plan || null;
    }
    if (historyRes.ok) {
      const hData = await historyRes.json();
      planHistory = hData.history || [];
    }

    return { latestPlan, planHistory };
  } catch {
    return { latestPlan: null, planHistory: [] };
  }
}

/**
 * SSR fetch for Project Analytics
 */
export async function fetchServerAnalytics(internalIdOrSlug: string): Promise<ProjectAnalytics | null> {
  const cookieHeader = getServerCookieHeader();
  try {
    const [tRes, fRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/projects/${encodeURIComponent(internalIdOrSlug)}/tickets`, {
        headers: { ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
        cache: 'no-store',
      }),
      fetch(`${BACKEND_URL}/api/projects/${encodeURIComponent(internalIdOrSlug)}/features`, {
        headers: { ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
        cache: 'no-store',
      }),
    ]);

    if (!tRes.ok) return null;
    const tData = await tRes.json();
    const tickets = tData.tickets || [];
    const features = fRes.ok ? (await fRes.json()).features || [] : [];

    const total = tickets.length;
    const todo = tickets.filter((t: any) => t.status === 'To Do').length;
    const inProgress = tickets.filter((t: any) => t.status === 'In Progress').length;
    const completed = tickets.filter((t: any) => t.status === 'Done').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const priorityCounts: Record<string, number> = {
      Low: tickets.filter((t: any) => t.priority === 'Low').length,
      Medium: tickets.filter((t: any) => t.priority === 'Medium').length,
      High: tickets.filter((t: any) => t.priority === 'High').length,
      Critical: tickets.filter((t: any) => t.priority === 'Critical').length,
    };

    const typeCounts: Record<string, number> = {
      Feature: tickets.filter((t: any) => t.type === 'Feature').length,
      Bug: tickets.filter((t: any) => t.type === 'Bug').length,
      Task: tickets.filter((t: any) => t.type === 'Task').length,
      Improvement: tickets.filter((t: any) => t.type === 'Improvement').length,
    };

    return {
      totalTickets: total,
      completedTickets: completed,
      inProgressTickets: inProgress,
      todoTickets: todo,
      completionRate: rate,
      priorityBreakdown: priorityCounts,
      typeBreakdown: typeCounts,
    };
  } catch {
    return null;
  }
}
