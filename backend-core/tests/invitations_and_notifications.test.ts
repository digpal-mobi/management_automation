import '../src/config/index.js';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cookieParser from 'cookie-parser';
import type { Server } from 'http';
import { prisma } from '../src/lib/prisma.js';
import { ensureInvitationConstraints } from '../src/services/invitationService.js';
import authRoutes from '../src/routes/authRoutes.js';
import projectRoutes from '../src/routes/projectRoutes.js';
import notificationRoutes from '../src/routes/notificationRoutes.js';
import invitationRoutes from '../src/routes/invitationRoutes.js';

const stamp = `${Date.now()}`;
const password = 'test-pass-123';

interface Session {
  token: string;
  cookie: string;
  user: { id: string; email: string; username: string };
}

let server: Server;
let baseUrl = '';
const userIds: string[] = [];
let owner: Session;
let manager: Session;
let developer: Session;
let outsider: Session;
let invitee: Session;
let decliner: Session;
let projectId = '';
let projectSlug = '';

function cookieHeader(response: Response) {
  const cookies =
    typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
  return cookies.map((cookie) => cookie.split(';')[0]).join('; ');
}

async function register(username: string, email: string): Promise<Session> {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await response.json();
  assert.equal(response.status, 201, data.error || 'register failed');
  userIds.push(data.user.id);
  return { token: data.accessToken, cookie: cookieHeader(response), user: data.user };
}

async function api(session: Session | null, path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json');
  if (session) headers.set('Authorization', `Bearer ${session.token}`);
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function invite(session: Session, identifier: string, role = 'developer') {
  return api(session, `/api/projects/${projectId}/members`, {
    method: 'POST',
    body: JSON.stringify({ identifier, role }),
  });
}

describe('Invitations, notifications, and project access', { concurrency: 1 }, () => {
  before(async () => {
    await ensureInvitationConstraints();
    const app = express();
    app.use(cookieParser());
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use('/api/projects', projectRoutes);
    app.use('/api/notifications', notificationRoutes);
    app.use('/api/invitations', invitationRoutes);

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server failed to bind');
    baseUrl = `http://127.0.0.1:${address.port}`;

    owner = await register(`own${stamp}`, `own${stamp}@example.com`);
    manager = await register(`mgr${stamp}`, `mgr${stamp}@example.com`);
    developer = await register(`dev${stamp}`, `dev${stamp}@example.com`);
    outsider = await register(`out${stamp}`, `out${stamp}@example.com`);
    invitee = await register(`inv${stamp}`, `inv${stamp}@example.com`);
    decliner = await register(`dec${stamp}`, `dec${stamp}@example.com`);

    const created = await api(owner, '/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: `Invite Workspace ${stamp}`,
        description: 'Private project used to verify invitation access.',
      }),
    });
    assert.equal(created.response.status, 201, created.data.error);
    projectId = created.data.project.id;
    projectSlug = created.data.project.slug;
  });

  after(async () => {
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    if (userIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.$disconnect();
  });

  it('lets owners and managers invite, and rejects developers, outsiders, and duplicates', async () => {
    const managerInvite = await invite(owner, manager.user.email, 'manager');
    assert.equal(managerInvite.response.status, 201, managerInvite.data.error);
    assert.equal(managerInvite.data.invitation.status, 'PENDING');
    assert.equal(managerInvite.data.emailDelivered, false);

    const managerMembership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: manager.user.id } },
    });
    assert.equal(managerMembership, null);

    const accepted = await api(manager, `/api/invitations/${managerInvite.data.invitation.id}/accept`, {
      method: 'POST',
    });
    assert.equal(accepted.response.status, 200, accepted.data.error);

    const managerCanInvite = await invite(manager, developer.user.username, 'developer');
    assert.equal(managerCanInvite.response.status, 201, managerCanInvite.data.error);

    const developerAccept = await api(
      developer,
      `/api/invitations/${managerCanInvite.data.invitation.id}/accept`,
      { method: 'POST' }
    );
    assert.equal(developerAccept.response.status, 200, developerAccept.data.error);

    const developerInvite = await invite(developer, outsider.user.email);
    assert.equal(developerInvite.response.status, 403);

    const outsiderInvite = await invite(outsider, invitee.user.email);
    assert.equal(outsiderInvite.response.status, 403);
    assert.equal(
      await prisma.projectInvitation.count({
        where: { projectId, recipientEmail: outsider.user.email },
      }),
      0
    );

    const first = await invite(owner, invitee.user.email, 'developer');
    assert.equal(first.response.status, 201, first.data.error);
    const duplicate = await invite(owner, invitee.user.username, 'editor');
    assert.equal(duplicate.response.status, 409);
  });

  it('persists an invitation notification for the recipient only', async () => {
    const inviteeNotes = await api(invitee, '/api/notifications');
    assert.equal(inviteeNotes.response.status, 200);
    const invitationNote = inviteeNotes.data.notifications.find(
      (item: { type: string }) => item.type === 'PROJECT_INVITATION'
    );
    assert.ok(invitationNote);
    assert.equal(invitationNote.project.name, `Invite Workspace ${stamp}`);
    assert.equal(invitationNote.readAt, null);
    assert.equal(invitationNote.invitation.actionable, true);

    const outsiderNotes = await api(outsider, '/api/notifications');
    assert.equal(
      outsiderNotes.data.notifications.some((item: { id: string }) => item.id === invitationNote.id),
      false
    );

    const unread = await api(invitee, '/api/notifications/unread-count');
    assert.ok(unread.data.count >= 1);

    const marked = await api(invitee, `/api/notifications/${invitationNote.id}/read`, { method: 'POST' });
    assert.equal(marked.response.status, 200);
    assert.ok(marked.data.notification.readAt);

    const persisted = await prisma.notification.findUnique({ where: { id: invitationNote.id } });
    assert.ok(persisted?.readAt);

    const stolen = await api(outsider, `/api/notifications/${invitationNote.id}/read`, { method: 'POST' });
    assert.equal(stolen.response.status, 404);

    const stolenAccept = await api(outsider, `/api/invitations/${invitationNote.invitation.id}/accept`, {
      method: 'POST',
    });
    assert.equal(stolenAccept.response.status, 404);
  });

  it('keeps pending, declined, revoked, and expired invitations from granting access', async () => {
    const beforeAccept = await api(invitee, `/api/projects/${projectSlug}`);
    assert.equal(beforeAccept.response.status, 403);
    assert.equal(beforeAccept.data.project, undefined);

    const documents = await api(invitee, `/api/projects/${projectId}/documents`);
    assert.equal(documents.response.status, 403);

    const analytics = await api(invitee, `/api/projects/${projectId}/analytics`);
    assert.equal(analytics.response.status, 403);

    const listed = await api(invitee, '/api/projects');
    assert.equal(
      listed.data.projects.some((project: { id: string }) => project.id === projectId),
      false
    );

    const ownerList = await api(owner, '/api/projects');
    assert.equal(
      ownerList.data.projects.some((project: { id: string }) => project.id === projectId),
      true
    );

    const declinedInvite = await invite(owner, decliner.user.email, 'editor');
    assert.equal(declinedInvite.response.status, 201);
    const declined = await api(decliner, `/api/invitations/${declinedInvite.data.invitation.id}/decline`, {
      method: 'POST',
    });
    assert.equal(declined.response.status, 200);
    assert.equal(declined.data.membershipCreated, false);
    assert.equal(
      await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: decliner.user.id } },
      }),
      null
    );
    const declinedAccess = await api(decliner, `/api/projects/${projectId}`);
    assert.equal(declinedAccess.response.status, 403);

    const inviterNotes = await api(owner, '/api/notifications');
    assert.equal(
      inviterNotes.data.notifications.some(
        (item: { type: string }) => item.type === 'PROJECT_INVITATION_DECLINED'
      ),
      true
    );

    const reinvite = await invite(owner, decliner.user.email, 'developer');
    assert.equal(reinvite.response.status, 201, reinvite.data.error);
    const revoked = await api(
      owner,
      `/api/projects/${projectId}/invitations/${reinvite.data.invitation.id}/revoke`,
      { method: 'POST' }
    );
    assert.equal(revoked.response.status, 200, revoked.data.error);
    const revokedAccept = await api(decliner, `/api/invitations/${reinvite.data.invitation.id}/accept`, {
      method: 'POST',
    });
    assert.equal(revokedAccept.response.status, 409);
    assert.equal(
      await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: decliner.user.id } },
      }),
      null
    );

    const expiredInvite = await invite(manager, decliner.user.email, 'developer');
    assert.equal(expiredInvite.response.status, 201, expiredInvite.data.error);
    await prisma.projectInvitation.update({
      where: { id: expiredInvite.data.invitation.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
    const expiredAccept = await api(decliner, `/api/invitations/${expiredInvite.data.invitation.id}/accept`, {
      method: 'POST',
    });
    assert.equal(expiredAccept.response.status, 409);
    assert.match(expiredAccept.data.error, /expired/i);
  });

  it('accepts once, notifies the inviter, and grants only the invited role', async () => {
    const missing = await invite(owner, `missing-${stamp}@example.com`);
    assert.equal(missing.response.status, 404);
    assert.equal(
      await prisma.projectInvitation.count({
        where: { recipientEmail: `missing-${stamp}@example.com` },
      }),
      0
    );

    process.env.INVITATION_EMAIL_FORCE_FAIL = '1';
    const mailUser = await register(`mail${stamp}`, `mail${stamp}@example.com`);
    const forced = await invite(owner, mailUser.user.email, 'editor');
    delete process.env.INVITATION_EMAIL_FORCE_FAIL;
    assert.equal(forced.response.status, 201, forced.data.error);
    assert.equal(forced.data.emailDelivered, false);
    const forcedRow = await prisma.projectInvitation.findUnique({
      where: { id: forced.data.invitation.id },
    });
    assert.equal(forcedRow?.status, 'PENDING');
    assert.ok(
      await prisma.notification.findFirst({
        where: { invitationId: forced.data.invitation.id, recipientId: mailUser.user.id },
      })
    );

    const currentInvite = await prisma.projectInvitation.findFirst({
      where: { projectId, recipientEmail: invitee.user.email, status: 'PENDING' },
    });
    assert.ok(currentInvite);

    const [first, second] = await Promise.all([
      api(invitee, `/api/invitations/${currentInvite.id}/accept`, { method: 'POST' }),
      api(invitee, `/api/invitations/${currentInvite.id}/accept`, { method: 'POST' }),
    ]);
    assert.equal(first.response.status, 200, first.data.error || second.data.error);
    assert.equal(second.response.status, 200, second.data.error);

    const memberships = await prisma.projectMember.findMany({
      where: { projectId, userId: invitee.user.id },
    });
    assert.equal(memberships.length, 1);
    assert.equal(memberships[0].role, 'DEVELOPER');

    const acceptedNotes = await api(owner, '/api/notifications');
    assert.equal(
      acceptedNotes.data.notifications.filter(
        (item: { type: string; invitationId: string }) =>
          item.type === 'PROJECT_INVITATION_ACCEPTED' && item.invitationId === currentInvite.id
      ).length,
      1
    );

    const project = await api(invitee, `/api/projects/${projectSlug}`);
    assert.equal(project.response.status, 200, project.data.error);
    assert.equal(project.data.project.userRole, 'developer');
    assert.equal(project.data.project.description.includes('Private project'), true);

    const inviteAgain = await invite(invitee, outsider.user.email);
    assert.equal(inviteAgain.response.status, 403);

    const refreshed = await api(invitee, `/api/notifications`);
    const resolved = refreshed.data.notifications.find(
      (item: { invitationId: string | null; type: string }) =>
        item.invitationId === currentInvite.id && item.type === 'PROJECT_INVITATION'
    );
    assert.equal(resolved.invitation.actionable, false);
    assert.equal(resolved.invitation.status, 'ACCEPTED');
  });

  it('revokes the refresh token on logout', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: owner.user.email, password }),
    });
    const data = await response.json();
    assert.equal(response.status, 200, data.error);
    const cookie = cookieHeader(response);

    const loggedOut = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: cookie,
        Authorization: `Bearer ${data.accessToken}`,
      },
    });
    assert.equal(loggedOut.status, 200);

    const refresh = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: cookie },
    });
    assert.equal(refresh.status, 401);

    const refreshCookie = cookie
      .split('; ')
      .filter((part) => part.startsWith('refresh_token='))
      .join('; ');
    const replayed = await fetch(`${baseUrl}/api/notifications/unread-count`, {
      headers: { Cookie: refreshCookie },
    });
    assert.equal(replayed.status, 401);

    const stored = await prisma.refreshToken.findFirst({
      where: { userId: owner.user.id },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(stored?.revokedAt);
  });
});
