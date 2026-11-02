import { z } from 'zod';

export function isLeapYear(year: number): boolean {
  if (year % 400 === 0) return true;
  if (year % 100 === 0) return false;
  return year % 4 === 0;
}

export function getDaysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) return 0;
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if ([4, 6, 9, 11].includes(month)) {
    return 30;
  }
  return 31;
}

export function parseDateOnly(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  return { year, month, day };
}

export function isValidDateString(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const trimmed = dateStr.trim();
  
  if (/^Q[1-4]\s+\d{4}$/i.test(trimmed)) {
    const year = parseInt(trimmed.slice(3), 10);
    return year >= 2000 && year <= 2100;
  }

  const parts = parseDateOnly(trimmed);
  if (!parts) {
    const ts = Date.parse(trimmed);
    return !Number.isNaN(ts);
  }

  const { year, month, day } = parts;
  if (year < 1970 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  const maxDays = getDaysInMonth(year, month);
  if (day < 1 || day > maxDays) return false;

  return true;
}

export const createProjectSchema = z.object({
  name: z.string().trim().min(2, 'Project name must be at least 2 characters').max(100, 'Project name cannot exceed 100 characters'),
  description: z.string().trim().min(3, 'Project description must be at least 3 characters').max(2000, 'Project description cannot exceed 2000 characters'),
  targetReleaseDate: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || isValidDateString(val), {
      message: 'Invalid target release date. Use YYYY-MM-DD or quarterly format (e.g. Q4 2026).',
    }),
  goals: z.string().max(3000).nullable().optional(),
  targetUsers: z.string().max(1000).nullable().optional(),
  techStack: z.string().max(1000).nullable().optional(),
  businessRequirements: z.string().max(3000).nullable().optional(),
  technicalConstraints: z.string().max(3000).nullable().optional(),
  knownDependencies: z.string().max(2000).nullable().optional(),
  additionalNotes: z.string().max(3000).nullable().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().min(3).max(2000).optional(),
  slug: z.string().trim().min(2).max(100).optional(),
  targetReleaseDate: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || isValidDateString(val), {
      message: 'Invalid target release date. Use YYYY-MM-DD or quarterly format.',
    }),
  goals: z.string().max(3000).nullable().optional(),
  targetUsers: z.string().max(1000).nullable().optional(),
  techStack: z.string().max(1000).nullable().optional(),
  businessRequirements: z.string().max(3000).nullable().optional(),
  technicalConstraints: z.string().max(3000).nullable().optional(),
  knownDependencies: z.string().max(2000).nullable().optional(),
  additionalNotes: z.string().max(3000).nullable().optional(),
});

export const createTicketSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  title: z.string().trim().min(2, 'Ticket title must be at least 2 characters').max(250, 'Ticket title cannot exceed 250 characters'),
  description: z.string().nullable().optional(),
  priority: z.enum(['Low', 'LOW', 'Medium', 'MEDIUM', 'High', 'HIGH', 'Critical', 'CRITICAL']).optional(),
  storyPoints: z
    .preprocess(
      (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
      z.number().int().min(0, 'Story points cannot be negative').max(100, 'Story points cannot exceed 100').nullable().optional()
    ),
  columnId: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  assigneeIds: z.array(z.string()).optional(),
});

export const updateTicketSchema = z.object({
  title: z.string().trim().min(2, 'Ticket title must be at least 2 characters').max(250, 'Ticket title cannot exceed 250 characters').optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['To Do', 'TODO', 'In Progress', 'IN_PROGRESS', 'Done', 'DONE']).optional(),
  priority: z.enum(['Low', 'LOW', 'Medium', 'MEDIUM', 'High', 'HIGH', 'Critical', 'CRITICAL']).optional(),
  storyPoints: z
    .preprocess(
      (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
      z.number().int().min(0, 'Story points cannot be negative').max(100, 'Story points cannot exceed 100').nullable().optional()
    ),
  columnId: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  assigneeIds: z.array(z.string()).optional(),
  technicalNotes: z.string().nullable().optional(),
});
