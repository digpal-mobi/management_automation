import { prisma } from './prisma.js';

export const RESERVED_SLUGS = new Set([
  'new',
  'api',
  'admin',
  'settings',
  'projects',
  'login',
  'register',
  'auth',
  'authorization',
  'roles',
  'board',
  'roadmap',
  'plan',
  'knowledge',
  'analytics',
  'members',
  'user',
  'users',
  'null',
  'undefined',
  'dashboard',
  'public',
  'static',
  '_next',
  'favicon',
]);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | undefined | null): boolean {
  if (!value) return false;
  return UUID_REGEX.test(value.trim());
}

/**
 * Normalizes a raw project name into a clean, lowercased, hyphen-separated base slug.
 * Strips special characters, removes consecutive/leading/trailing hyphens,
 * and guards against reserved route names.
 */
export function generateBaseSlug(name: string): string {
  if (!name || typeof name !== 'string') {
    return 'project';
  }

  let slug = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accent diacritics
    .replace(/[^a-z0-9]+/g, '-') // convert spaces & special chars to hyphens
    .replace(/-{2,}/g, '-') // collapse consecutive hyphens
    .replace(/^-+|-+$/g, ''); // strip leading/trailing hyphens

  if (!slug) {
    slug = 'project';
  }

  // Prevent reserved route names from ever being used directly as slugs
  if (RESERVED_SLUGS.has(slug)) {
    slug = `${slug}-project`;
  }

  return slug;
}

/**
 * Finds a guaranteed unique project slug in PostgreSQL.
 * Iterates through `<baseSlug>`, `<baseSlug>-2`, `<baseSlug>-3`, etc.,
 * ensuring no conflict exists in either `projects` or `project_slug_redirects`.
 */
export async function generateUniqueProjectSlug(
  name: string,
  excludeProjectId?: string
): Promise<string> {
  const baseSlug = generateBaseSlug(name);
  let candidate = baseSlug;
  let counter = 1;

  while (true) {
    const [existingProject, existingRedirect] = await Promise.all([
      prisma.project.findFirst({
        where: {
          slug: candidate,
          ...(excludeProjectId ? { id: { not: excludeProjectId } } : {}),
        },
        select: { id: true },
      }),
      prisma.projectSlugRedirect.findFirst({
        where: {
          slug: candidate,
          ...(excludeProjectId ? { projectId: { not: excludeProjectId } } : {}),
        },
        select: { id: true },
      }),
    ]);

    if (!existingProject && !existingRedirect) {
      return candidate;
    }

    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }
}

/**
 * Migrates all projects currently lacking a slug by populating them with unique slugs.
 */
export async function migrateMissingProjectSlugs(): Promise<number> {
  const unmigrated = await prisma.project.findMany({
    where: {
      OR: [{ slug: '' }, { slug: { equals: '' } }],
    },
    select: { id: true, name: true },
  });

  let migratedCount = 0;
  for (const proj of unmigrated) {
    const slug = await generateUniqueProjectSlug(proj.name, proj.id);
    await prisma.project.update({
      where: { id: proj.id },
      data: { slug },
    });
    migratedCount += 1;
  }

  return migratedCount;
}
