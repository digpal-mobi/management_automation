import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PERMISSION_DEFINITIONS = [
  // Project
  { key: 'project.view', name: 'View Projects', description: 'View project details, specifications, and overview information', resource: 'project', action: 'view' },
  { key: 'project.create', name: 'Create Projects', description: 'Create new project workspaces and initialize repositories', resource: 'project', action: 'create' },
  { key: 'project.update', name: 'Update Projects', description: 'Modify project settings, tech stack, constraints, and descriptions', resource: 'project', action: 'update' },
  { key: 'project.delete', name: 'Delete Projects', description: 'Permanently remove a project workspace and all associated data', resource: 'project', action: 'delete' },

  // Tickets
  { key: 'ticket.view', name: 'View Tickets', description: 'View ticket details, acceptance criteria, technical notes, and PR checklists', resource: 'ticket', action: 'view' },
  { key: 'ticket.create', name: 'Create Tickets', description: 'Create developer-ready tickets inside any board column', resource: 'ticket', action: 'create' },
  { key: 'ticket.update', name: 'Update Tickets', description: 'Edit ticket title, description, priority, type, points, and checklists', resource: 'ticket', action: 'update' },
  { key: 'ticket.delete', name: 'Delete Tickets', description: 'Delete tickets from project boards', resource: 'ticket', action: 'delete' },
  { key: 'ticket.assign', name: 'Assign Tickets', description: 'Assign or reassign tickets to authorized team members', resource: 'ticket', action: 'assign' },
  { key: 'ticket.change_status', name: 'Change Ticket Status', description: 'Move tickets between workflow stages and board columns', resource: 'ticket', action: 'change_status' },
  { key: 'ticket.comment', name: 'Comment on Tickets', description: 'Participate in ticket discussions and interact with AI assistants', resource: 'ticket', action: 'comment' },

  // Board & Columns
  { key: 'board.view', name: 'View Boards', description: 'Access and view project Kanban boards', resource: 'board', action: 'view' },
  { key: 'board.create', name: 'Create Boards', description: 'Create new boards within a project', resource: 'board', action: 'create' },
  { key: 'board.update', name: 'Update Boards', description: 'Rename and modify board settings', resource: 'board', action: 'update' },
  { key: 'board.delete', name: 'Delete Boards', description: 'Delete boards and their column layouts', resource: 'board', action: 'delete' },
  { key: 'board.manage_columns', name: 'Manage Board Columns', description: 'Dynamically add, rename, reorder, and remove board columns', resource: 'board', action: 'manage_columns' },

  // Team & Members
  { key: 'member.view', name: 'View Members', description: 'View project team members and their assignments', resource: 'member', action: 'view' },
  { key: 'member.invite', name: 'Invite Members', description: 'Invite new users to collaborate on a project', resource: 'member', action: 'invite' },
  { key: 'member.update_role', name: 'Update Member Roles', description: 'Change the assigned project role of team members', resource: 'member', action: 'update_role' },
  { key: 'member.remove', name: 'Remove Members', description: 'Remove collaborators from a project', resource: 'member', action: 'remove' },

  // Roles & Access Control
  { key: 'role.view', name: 'View Roles & Permissions', description: 'View available roles, permission sets, and assigned users', resource: 'role', action: 'view' },
  { key: 'role.create', name: 'Create Roles', description: 'Define and create custom roles with specific permission sets', resource: 'role', action: 'create' },
  { key: 'role.update', name: 'Update Roles', description: 'Modify role names, descriptions, and permission configurations', resource: 'role', action: 'update' },
  { key: 'role.delete', name: 'Delete Roles', description: 'Delete custom roles that are not in use', resource: 'role', action: 'delete' },
  { key: 'role.assign_permissions', name: 'Assign Role Permissions', description: 'Configure and update the granular permissions assigned to roles', resource: 'role', action: 'assign_permissions' },
  { key: 'permission.view', name: 'View Permission Catalog', description: 'Inspect the full catalog of registered system permissions', resource: 'permission', action: 'view' },
  { key: 'user.manage_roles', name: 'Manage User Role Assignments', description: 'Assign or revoke roles for users globally or within projects', resource: 'user', action: 'manage_roles' },

  // Roadmap & Knowledge
  { key: 'document.view', name: 'View Documents', description: 'Read uploaded PRDs, specifications, and extracted chunks', resource: 'document', action: 'view' },
  { key: 'document.upload', name: 'Upload Documents', description: 'Upload and parse project requirement documents', resource: 'document', action: 'upload' },
  { key: 'document.delete', name: 'Delete Documents', description: 'Remove uploaded documentation from project knowledge base', resource: 'document', action: 'delete' },
  { key: 'feature.view', name: 'View Roadmap Features', description: 'Inspect AI-extracted features and architectural modules', resource: 'feature', action: 'view' },
  { key: 'feature.create', name: 'Create Roadmap Features', description: 'Propose new features on the project roadmap', resource: 'feature', action: 'create' },
  { key: 'feature.update', name: 'Update Roadmap Features', description: 'Review features, change status, and edit specs', resource: 'feature', action: 'update' },
  { key: 'feature.delete', name: 'Delete Roadmap Features', description: 'Remove features from the project roadmap', resource: 'feature', action: 'delete' },
  { key: 'feature.generate_tickets', name: 'Generate Tickets from Features', description: 'Trigger AI generation of scoped developer tickets from roadmap features', resource: 'feature', action: 'generate_tickets' },

  // Analytics
  { key: 'analytics.view', name: 'View Analytics', description: 'View sprint completion rates, priority distribution, and velocity analytics', resource: 'analytics', action: 'view' },
];

const DEFAULT_ROLES = [
  {
    key: 'system_admin',
    name: 'System Administrator',
    description: 'Full administrative access across all projects, users, custom roles, and security permissions.',
    permissions: PERMISSION_DEFINITIONS.map((p) => p.key),
  },
  {
    key: 'project_manager',
    name: 'Project Manager',
    description: 'Manages projects, Kanban boards, dynamic columns, tickets, team membership, roadmap, and analytics.',
    permissions: [
      'project.view', 'project.create', 'project.update',
      'board.view', 'board.create', 'board.update', 'board.delete', 'board.manage_columns',
      'ticket.view', 'ticket.create', 'ticket.update', 'ticket.delete', 'ticket.assign', 'ticket.change_status', 'ticket.comment',
      'member.view', 'member.invite', 'member.update_role', 'member.remove',
      'document.view', 'document.upload', 'document.delete',
      'feature.view', 'feature.create', 'feature.update', 'feature.delete', 'feature.generate_tickets',
      'analytics.view',
    ],
  },
  {
    key: 'developer',
    name: 'Developer',
    description: 'Contributes to tickets, updates implementation status, and participates in AI discussions.',
    permissions: [
      'project.view', 'board.view', 'ticket.view', 'ticket.create', 'ticket.update', 'ticket.change_status', 'ticket.comment',
      'member.view', 'document.view', 'feature.view', 'analytics.view',
    ],
  },
  {
    key: 'qa',
    name: 'Tester / QA',
    description: 'Verifies bug fixes, logs quality defects, updates ticket test statuses, and comments on reviews.',
    permissions: [
      'project.view', 'board.view', 'ticket.view', 'ticket.create', 'ticket.update', 'ticket.change_status', 'ticket.comment',
      'member.view', 'document.view', 'feature.view',
    ],
  },
  {
    key: 'viewer',
    name: 'Viewer / Stakeholder',
    description: 'Read-only visibility into projects, roadmap features, boards, and sprint analytics.',
    permissions: [
      'project.view', 'board.view', 'ticket.view', 'member.view', 'document.view', 'feature.view', 'analytics.view',
    ],
  },
];

async function main() {
  console.log('--- 1. Synchronizing Permissions ---');
  for (const def of PERMISSION_DEFINITIONS) {
    await prisma.permission.upsert({
      where: { key: def.key },
      update: {
        name: def.name,
        description: def.description,
        resource: def.resource,
        action: def.action,
      },
      create: {
        key: def.key,
        name: def.name,
        description: def.description,
        resource: def.resource,
        action: def.action,
      },
    });
  }
  console.log(`✓ Synchronized ${PERMISSION_DEFINITIONS.length} permissions.`);

  console.log('--- 2. Synchronizing System Roles & Permissions ---');
  const allDbPermissions = await prisma.permission.findMany();
  const permMap = new Map(allDbPermissions.map((p) => [p.key, p.id]));

  for (const roleDef of DEFAULT_ROLES) {
    const role = await prisma.role.upsert({
      where: { key: roleDef.key },
      update: {
        name: roleDef.name,
        description: roleDef.description,
        isSystem: true,
      },
      create: {
        key: roleDef.key,
        name: roleDef.name,
        description: roleDef.description,
        isSystem: true,
      },
    });

    for (const pKey of roleDef.permissions) {
      const pId = permMap.get(pKey);
      if (pId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: pId,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: pId,
          },
        });
      }
    }
    console.log(`✓ Role "${roleDef.name}" (${roleDef.key}) synced.`);
  }

  console.log('--- Database bootstrap complete. No seeded projects added. Clean slate for user projects. ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
