import { z } from 'zod';

/**
 * Leap year verification utility.
 * Handles century rule correctly (e.g., 2000 was leap, 1900 was not, 2024 is leap, 2023 was not).
 */
export function isLeapYear(year: number): boolean {
  if (year % 400 === 0) return true;
  if (year % 100 === 0) return false;
  return year % 4 === 0;
}

/**
 * Returns the exact number of days in a given year and month (1-indexed: 1 = Jan, 12 = Dec).
 */
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

/**
 * Parses YYYY-MM-DD without UTC / local timezone shifts.
 */
export function parseDateOnly(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  return { year, month, day };
}

/**
 * Validates whether a date string is a legitimate calendar date (including leap-year checks).
 * Accepts YYYY-MM-DD or standard quarterly release strings like 'Q1 2026'.
 */
export function isValidDateString(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const trimmed = dateStr.trim();
  
  // Accept quarterly notation like "Q1 2026", "Q4 2027"
  if (/^Q[1-4]\s+\d{4}$/i.test(trimmed)) {
    const year = parseInt(trimmed.slice(3), 10);
    return year >= 2000 && year <= 2100;
  }

  const parts = parseDateOnly(trimmed);
  if (!parts) {
    // If it's a full ISO timestamp
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

/**
 * Compares two date-only strings (YYYY-MM-DD) chronologically without timezone issues.
 * Returns:
 *   negative if dateA < dateB
 *   0 if dateA === dateB
 *   positive if dateA > dateB
 */
export function compareDateStrings(dateA: string, dateB: string): number {
  const a = parseDateOnly(dateA);
  const b = parseDateOnly(dateB);

  if (!a || !b) {
    const timeA = new Date(dateA).getTime();
    const timeB = new Date(dateB).getTime();
    return timeA - timeB;
  }

  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

export interface DateRangeValidationOptions {
  allowSameDay?: boolean;
  minDays?: number;
  labelStart?: string;
  labelEnd?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a start and end date range according to application business rules.
 */
export function validateDateRange(
  startDateStr?: string | null,
  endDateStr?: string | null,
  options: DateRangeValidationOptions = {}
): ValidationResult {
  const {
    allowSameDay = true,
    minDays = 0,
    labelStart = 'Start date',
    labelEnd = 'End date',
  } = options;

  if (!startDateStr && !endDateStr) {
    return { isValid: true };
  }

  if (startDateStr && !isValidDateString(startDateStr)) {
    return {
      isValid: false,
      error: `Invalid ${labelStart.toLowerCase()} format. Use YYYY-MM-DD.`,
    };
  }

  if (endDateStr && !isValidDateString(endDateStr)) {
    return {
      isValid: false,
      error: `Invalid ${labelEnd.toLowerCase()} format. Use YYYY-MM-DD.`,
    };
  }

  if (startDateStr && endDateStr) {
    const diff = compareDateStrings(startDateStr, endDateStr);

    if (diff > 0) {
      return {
        isValid: false,
        error: `${labelEnd} cannot be earlier than ${labelStart.toLowerCase()}.`,
      };
    }

    if (!allowSameDay && diff === 0) {
      return {
        isValid: false,
        error: `${labelEnd} must be after ${labelStart.toLowerCase()}.`,
      };
    }

    if (minDays > 0) {
      const a = parseDateOnly(startDateStr);
      const b = parseDateOnly(endDateStr);
      if (a && b) {
        const utcStart = Date.UTC(a.year, a.month - 1, a.day);
        const utcEnd = Date.UTC(b.year, b.month - 1, b.day);
        const dayDifference = Math.round((utcEnd - utcStart) / (1000 * 60 * 60 * 24));
        if (dayDifference < minDays) {
          return {
            isValid: false,
            error: `Duration must be at least ${minDays} day${minDays > 1 ? 's' : ''}.`,
          };
        }
      }
    }
  }

  return { isValid: true };
}

// ── Reusable Zod Validation Schemas ──────────────────────────────────────────

export const projectNameSchema = z
  .string()
  .trim()
  .min(2, 'Project name must be at least 2 characters')
  .max(100, 'Project name cannot exceed 100 characters');

export const projectDescriptionSchema = z
  .string()
  .trim()
  .min(3, 'Project description must be at least 3 characters')
  .max(2000, 'Project description cannot exceed 2000 characters');

export const ticketTitleSchema = z
  .string()
  .trim()
  .min(2, 'Ticket title must be at least 2 characters')
  .max(250, 'Ticket title cannot exceed 250 characters');

export const storyPointsSchema = z
  .preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z
      .number()
      .int('Story points must be a whole number')
      .min(0, 'Story points cannot be negative')
      .max(100, 'Story points cannot exceed 100')
      .nullable()
      .optional()
  );

export const optionalDateSchema = z
  .string()
  .nullable()
  .optional()
  .refine(
    (val) => !val || isValidDateString(val),
    { message: 'Invalid date. Please use YYYY-MM-DD or valid quarterly format.' }
  );

export const sprintPlanOptionsSchema = z.object({
  capacityInput: z
    .number()
    .int('Capacity must be a whole number')
    .min(5, 'Sprint capacity must be at least 5 story points')
    .max(200, 'Sprint capacity cannot exceed 200 story points'),
  strictCapacity: z.boolean().default(false),
  allowCoSprint: z.boolean().default(true),
});
