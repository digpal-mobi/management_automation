import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isBoardRoute, getLayoutConfig } from './routeUtils';

describe('Navigation & Layout Configuration', () => {
  it('correctly identifies the Kanban Board route as full-width without sidebar', () => {
    assert.equal(isBoardRoute('/projects/core-platform/board'), true);
    assert.equal(isBoardRoute('/projects/123/board'), true);
    assert.equal(isBoardRoute('/projects/alpha/board/'), true);
    assert.equal(isBoardRoute('/projects/alpha/board/settings'), true);

    const config = getLayoutConfig('/projects/core-platform/board', true);
    assert.equal(config.showSidebar, false);
    assert.equal(config.isFullWidth, true);
  });

  it('correctly identifies regular pages that must retain the left sidebar', () => {
    // Project pages
    assert.equal(isBoardRoute('/projects/core-platform'), false);
    assert.equal(isBoardRoute('/projects/core-platform/knowledge'), false);
    assert.equal(isBoardRoute('/projects/core-platform/roadmap'), false);
    assert.equal(isBoardRoute('/projects/core-platform/plan'), false);
    assert.equal(isBoardRoute('/projects/core-platform/analytics'), false);
    assert.equal(isBoardRoute('/projects/core-platform/members'), false);

    // Global workspace pages
    assert.equal(isBoardRoute('/'), false);
    assert.equal(isBoardRoute('/notifications'), false);
    assert.equal(isBoardRoute('/profile'), false);
    assert.equal(isBoardRoute('/projects/new'), false);
    assert.equal(isBoardRoute('/login'), false);
    assert.equal(isBoardRoute('/register'), false);

    // Regular authenticated page layout config
    const configKnowledge = getLayoutConfig('/projects/core-platform/knowledge', true);
    assert.equal(configKnowledge.showSidebar, true);
    assert.equal(configKnowledge.isFullWidth, false);

    const configPlan = getLayoutConfig('/projects/core-platform/plan', true);
    assert.equal(configPlan.showSidebar, true);
    assert.equal(configPlan.isFullWidth, false);

    const configHome = getLayoutConfig('/', true);
    assert.equal(configHome.showSidebar, true);
    assert.equal(configHome.isFullWidth, false);
  });

  it('handles unauthenticated state gracefully', () => {
    const unauthConfig = getLayoutConfig('/projects/core-platform/board', false);
    assert.equal(unauthConfig.showSidebar, false);
    assert.equal(unauthConfig.isFullWidth, false);
  });
});
