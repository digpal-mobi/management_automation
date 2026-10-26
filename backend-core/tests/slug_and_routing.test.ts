import { describe, it } from 'node:test';
import assert from 'node:assert';
import { prisma } from '../src/lib/prisma.js';
import {
  generateBaseSlug,
  generateUniqueProjectSlug,
  isUuid,
  RESERVED_SLUGS,
} from '../src/lib/slug.js';

describe('Project Slugs & Routing System Test Suite', () => {
  it('1. should generate a clean, lowercased, hyphenated base slug', () => {
    assert.strictEqual(generateBaseSlug('Ecommerce Website'), 'ecommerce-website');
    assert.strictEqual(generateBaseSlug('AI Project Management System'), 'ai-project-management-system');
    assert.strictEqual(generateBaseSlug('My Project 2027'), 'my-project-2027');
    assert.strictEqual(generateBaseSlug('  Special &*# Chars!!  '), 'special-chars');
    assert.strictEqual(generateBaseSlug('Café & Restaurant App'), 'cafe-restaurant-app');
  });

  it('2. should append a suffix to reserved route slugs', () => {
    for (const reserved of Array.from(RESERVED_SLUGS).slice(0, 5)) {
      const slug = generateBaseSlug(reserved);
      assert.notStrictEqual(slug, reserved);
      assert.strictEqual(slug, `${reserved}-project`);
    }
  });

  it('3. should correctly detect UUIDs vs slugs', () => {
    assert.strictEqual(isUuid('550e8400-e29b-41d4-a716-446655440000'), true);
    assert.strictEqual(isUuid('3bcf8275-6f58-4572-9dcc-379548d616f3'), true);
    assert.strictEqual(isUuid('ecommerce-website'), false);
    assert.strictEqual(isUuid('project-123'), false);
    assert.strictEqual(isUuid(''), false);
    assert.strictEqual(isUuid(undefined), false);
  });

  it('4. should handle duplicate project names by appending incrementing numeric suffixes', async () => {
    const testName = `Test Unique Proj ${Date.now()}`;
    const slug1 = await generateUniqueProjectSlug(testName);

    // Create a temporary project with slug1
    const defaultUser = await prisma.user.findFirst();
    const tempProj = await prisma.project.create({
      data: {
        name: testName,
        slug: slug1,
        description: 'Testing duplicate slug generation',
        ownerId: defaultUser?.id || 'dummy',
      },
    });

    try {
      // Generating a slug with the same name should now yield suffix -2
      const slug2 = await generateUniqueProjectSlug(testName);
      assert.strictEqual(slug2, `${slug1}-2`);

      // Mock an existing -2 in redirects
      await prisma.projectSlugRedirect.create({
        data: {
          slug: `${slug1}-2`,
          projectId: tempProj.id,
        },
      });

      // Next candidate should jump to -3
      const slug3 = await generateUniqueProjectSlug(testName);
      assert.strictEqual(slug3, `${slug1}-3`);
    } finally {
      // Cleanup
      await prisma.project.delete({ where: { id: tempProj.id } });
    }
  });

  it('5. should handle project renaming by updating slug and recording legacy redirect', async () => {
    const defaultUser = await prisma.user.findFirst();
    const initialName = `Old Brand ${Date.now()}`;
    const initialSlug = await generateUniqueProjectSlug(initialName);

    const proj = await prisma.project.create({
      data: {
        name: initialName,
        slug: initialSlug,
        description: 'Test rename flow',
        ownerId: defaultUser?.id || 'dummy',
      },
    });

    try {
      const newName = `New Brand ${Date.now()}`;
      const newSlug = await generateUniqueProjectSlug(newName, proj.id);

      // Record old slug in redirects
      await prisma.projectSlugRedirect.create({
        data: {
          slug: proj.slug,
          projectId: proj.id,
        },
      });

      // Update project with new slug
      const updated = await prisma.project.update({
        where: { id: proj.id },
        data: { name: newName, slug: newSlug },
      });

      assert.strictEqual(updated.slug, newSlug);

      // Check that querying the old slug finds the redirect to the project
      const redirectRecord = await prisma.projectSlugRedirect.findUnique({
        where: { slug: initialSlug },
        include: { project: true },
      });

      assert.ok(redirectRecord);
      assert.strictEqual(redirectRecord.projectId, proj.id);
      assert.strictEqual(redirectRecord.project.slug, newSlug);
    } finally {
      await prisma.project.delete({ where: { id: proj.id } });
    }
  });
});
