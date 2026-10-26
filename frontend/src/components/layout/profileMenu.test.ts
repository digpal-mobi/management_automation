import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROFILE_MENU_ITEMS,
  PROFILE_MENU_TRIGGER_LABEL,
  initialProfileMenuState,
  profileMenuReducer,
  resolveProfileMenuAction,
} from './profileMenu';

describe('Profile dropdown menu', () => {
  it('lists Profile, Notifications, and Logout with the correct destinations', () => {
    assert.deepEqual(
      PROFILE_MENU_ITEMS.map((item) => item.label),
      ['Profile', 'Notifications', 'Logout']
    );
    assert.equal(PROFILE_MENU_ITEMS[0].href, '/profile');
    assert.equal(PROFILE_MENU_ITEMS[1].href, '/notifications');
    assert.equal(resolveProfileMenuAction(PROFILE_MENU_ITEMS[0]).type, 'navigate');
    assert.equal(resolveProfileMenuAction(PROFILE_MENU_ITEMS[1]).type, 'navigate');
    assert.deepEqual(resolveProfileMenuAction(PROFILE_MENU_ITEMS[2]), { type: 'logout' });
    assert.equal(PROFILE_MENU_TRIGGER_LABEL, 'Open account menu');
  });

  it('opens and closes from toggle, Escape, outside click, and item selection', () => {
    const opened = profileMenuReducer(initialProfileMenuState, { type: 'toggle' });
    assert.equal(opened.open, true);

    assert.equal(profileMenuReducer(opened, { type: 'toggle' }).open, false);
    assert.equal(profileMenuReducer(opened, { type: 'escape' }).open, false);
    assert.equal(profileMenuReducer(opened, { type: 'outside' }).open, false);
    assert.equal(profileMenuReducer(opened, { type: 'select' }).open, false);
  });

  it('supports keyboard navigation and wraps the shared desktop and mobile menu', () => {
    const opened = profileMenuReducer(initialProfileMenuState, { type: 'arrow', direction: 1 });
    assert.equal(opened.open, true);
    assert.equal(opened.activeIndex, 0);

    const next = profileMenuReducer(opened, { type: 'arrow', direction: 1 });
    assert.equal(next.activeIndex, 1);
    const wrapped = profileMenuReducer(
      { open: true, activeIndex: PROFILE_MENU_ITEMS.length - 1 },
      { type: 'arrow', direction: 1 }
    );
    assert.equal(wrapped.activeIndex, 0);

    assert.equal(profileMenuReducer(opened, { type: 'end' }).activeIndex, PROFILE_MENU_ITEMS.length - 1);
    assert.equal(profileMenuReducer(opened, { type: 'home' }).activeIndex, 0);
  });
});
