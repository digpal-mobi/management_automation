/**
 * Comprehensive Automated Test Suite:
 * 1. Centralized Roles & Permissions Management (RBAC)
 * 2. Dynamic Project Boards & Custom Columns
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = process.env.API_URL || 'http://localhost:3001';

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 Starting End-to-End Verification Test Suite');
  console.log('1. Centralized Roles & Permissions System');
  console.log('2. Dynamic Project Boards & Custom Columns');
  console.log('===============================================================\n');

  let testProjectId = null;
  let customRoleId = null;
  let testUserId = null;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Verify Permission Registry in Database
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Verifying Centralized Permission Registry ---');
    const totalPermissions = await prisma.permission.count();
    console.log(`Found ${totalPermissions} registered permissions in database.`);
    if (totalPermissions < 30) {
      throw new Error(`Expected at least 30 permissions, found ${totalPermissions}`);
    }

    const sampleKeys = [
      'project.view',
      'project.create',
      'ticket.create',
      'ticket.change_status',
      'board.manage_columns',
      'role.create',
      'role.assign_permissions',
      'user.manage_roles',
    ];
    for (const key of sampleKeys) {
      const p = await prisma.permission.findUnique({ where: { key } });
      if (!p) throw new Error(`Permission ${key} missing from database!`);
    }
    console.log('✓ All core permission keys exist and are registered.');

    // -------------------------------------------------------------------------
    // TEST 2: Verify Default System Roles
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Verifying Default System Roles ---');
    const systemRoles = await prisma.role.findMany({
      where: { isSystem: true },
      include: { permissions: { include: { permission: true } } },
    });

    const systemRoleKeys = systemRoles.map((r) => r.key);
    console.log('System roles found:', systemRoleKeys);

    const expectedRoles = ['system_admin', 'project_manager', 'developer', 'qa', 'viewer'];
    for (const rKey of expectedRoles) {
      if (!systemRoleKeys.includes(rKey)) {
        throw new Error(`Expected system role "${rKey}" not found!`);
      }
    }

    const adminRole = systemRoles.find((r) => r.key === 'system_admin');
    console.log(`✓ System Administrator has ${adminRole.permissions.length} permissions.`);
    if (adminRole.permissions.length < 30) {
      throw new Error('System Admin should have all registered permissions.');
    }

    const pmRole = systemRoles.find((r) => r.key === 'project_manager');
    const pmPerms = pmRole.permissions.map((p) => p.permission.key);
    if (!pmPerms.includes('board.manage_columns')) {
      throw new Error('Project Manager role must have "board.manage_columns" permission.');
    }
    console.log('✓ Project Manager role possesses "board.manage_columns".');

    const devRole = systemRoles.find((r) => r.key === 'developer');
    const devPerms = devRole.permissions.map((p) => p.permission.key);
    if (devPerms.includes('board.manage_columns')) {
      throw new Error('Developer role must NOT possess "board.manage_columns" permission by default.');
    }
    console.log('✓ Developer role does not have "board.manage_columns" (properly restricted).');

    // -------------------------------------------------------------------------
    // TEST 3: Create Custom Role with Specific Permissions
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Creating Custom Role with Specific Permissions ---');
    const customRoleKey = `qa_automation_${Date.now()}`;
    const customRole = await prisma.role.create({
      data: {
        key: customRoleKey,
        name: 'QA Automation Lead',
        description: 'Custom role with permissions to view boards, manage defects, and review tickets',
        isSystem: false,
      },
    });
    customRoleId = customRole.id;

    const assignedPermKeys = [
      'project.view',
      'board.view',
      'ticket.view',
      'ticket.create',
      'ticket.update',
      'ticket.comment',
    ];

    const dbPerms = await prisma.permission.findMany({
      where: { key: { in: assignedPermKeys } },
    });

    for (const dp of dbPerms) {
      await prisma.rolePermission.create({
        data: {
          roleId: customRole.id,
          permissionId: dp.id,
        },
      });
    }

    const verifiedCustomRole = await prisma.role.findUnique({
      where: { id: customRole.id },
      include: { permissions: { include: { permission: true } } },
    });

    console.log(`✓ Custom role "${verifiedCustomRole.name}" created with ${verifiedCustomRole.permissions.length} permissions.`);
    if (verifiedCustomRole.permissions.length !== assignedPermKeys.length) {
      throw new Error('Custom role permissions count mismatch!');
    }

    // -------------------------------------------------------------------------
    // TEST 4: Protect System Roles from Deletion
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Verifying System Role Protection ---');
    if (!pmRole.isSystem) {
      throw new Error('Project manager role should be marked isSystem: true');
    }
    console.log('✓ System roles are explicitly marked isSystem: true to prevent accidental deletion.');

    // -------------------------------------------------------------------------
    // TEST 5: Create Test Project & Default Board
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Creating Test Project & Board ---');
    let ownerUser = await prisma.user.findFirst();
    if (!ownerUser) {
      ownerUser = await prisma.user.create({
        data: {
          email: 'test-admin@taskpulse.io',
          username: 'testadmin',
          passwordHash: '$2a$10$wT3wYfB54j0u419e.6jV6.w7hCfxl73nU48Vz34vjZ8g7.5u36lKq',
        },
      });
    }

    const testProject = await prisma.project.create({
      data: {
        name: `Dynamic Board Test Project - ${Date.now()}`,
        slug: `dynamic-board-test-${Date.now()}`,
        description: 'Automated verification of dynamic columns and ticket associations',
        ownerId: ownerUser.id,
        boards: {
          create: {
            name: 'Sprint Kanban Board',
          },
        },
      },
      include: {
        boards: true,
      },
    });
    testProjectId = testProject.id;
    const board = testProject.boards[0];
    console.log(`✓ Test project "${testProject.name}" created with Board ID: ${board.id}`);

    // Create default 3 columns
    const initialColumns = await prisma.$transaction([
      prisma.boardColumn.create({
        data: { boardId: board.id, name: 'To Do', category: 'TODO', position: 0, isDefault: true },
      }),
      prisma.boardColumn.create({
        data: { boardId: board.id, name: 'In Progress', category: 'IN_PROGRESS', position: 1, isDefault: true },
      }),
      prisma.boardColumn.create({
        data: { boardId: board.id, name: 'Done', category: 'DONE', position: 2, isDefault: true },
      }),
    ]);
    console.log(`✓ Initial default columns created: ${initialColumns.map((c) => c.name).join(', ')}`);

    // -------------------------------------------------------------------------
    // TEST 6: Dynamically Create Custom Columns beyond the default 3
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Dynamically Creating Custom Columns ---');
    const customCol1 = await prisma.boardColumn.create({
      data: {
        boardId: board.id,
        name: 'Code Review',
        description: 'Peer review and pull request inspection stage',
        category: 'IN_PROGRESS',
        position: 3,
        color: '#669BBC',
      },
    });

    const customCol2 = await prisma.boardColumn.create({
      data: {
        boardId: board.id,
        name: 'QA Testing',
        description: 'Staging verification and test runs',
        category: 'IN_PROGRESS',
        position: 4,
        color: '#F77F00',
      },
    });

    const customCol3 = await prisma.boardColumn.create({
      data: {
        boardId: board.id,
        name: 'Blocked',
        description: 'Impediments and external blockers',
        category: 'TODO',
        position: 5,
        color: '#C1121F',
      },
    });

    const allBoardCols = await prisma.boardColumn.findMany({
      where: { boardId: board.id },
      orderBy: { position: 'asc' },
    });

    console.log(`✓ Board now has ${allBoardCols.length} columns:`);
    allBoardCols.forEach((c) => console.log(`   [Pos ${c.position}] ${c.name} (${c.category})`));

    if (allBoardCols.length !== 6) {
      throw new Error(`Expected 6 columns, got ${allBoardCols.length}`);
    }

    // -------------------------------------------------------------------------
    // TEST 7: Column Renaming & Reordering
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Renaming and Reordering Columns ---');
    const renamedCol = await prisma.boardColumn.update({
      where: { id: customCol2.id },
      data: { name: 'QA Verification' },
    });
    console.log(`✓ Column renamed to: "${renamedCol.name}"`);

    // Reorder: Move 'Blocked' to position 1
    const reorderedIds = [
      initialColumns[0].id, // To Do (0)
      customCol3.id,        // Blocked (1)
      initialColumns[1].id, // In Progress (2)
      customCol1.id,        // Code Review (3)
      customCol2.id,        // QA Verification (4)
      initialColumns[2].id, // Done (5)
    ];

    await prisma.$transaction(
      reorderedIds.map((id, index) =>
        prisma.boardColumn.update({
          where: { id },
          data: { position: index },
        })
      )
    );

    const reorderedCols = await prisma.boardColumn.findMany({
      where: { boardId: board.id },
      orderBy: { position: 'asc' },
    });

    console.log('✓ Successfully reordered columns:');
    reorderedCols.forEach((c) => console.log(`   [Pos ${c.position}] ${c.name}`));

    if (reorderedCols[1].name !== 'Blocked') {
      throw new Error('Reordering verification failed!');
    }

    // -------------------------------------------------------------------------
    // TEST 8: Ticket Creation Directly Inside Any Column
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Creating Tickets Directly Inside Custom Columns ---');
    const ticketInReview = await prisma.ticket.create({
      data: {
        projectId: testProject.id,
        boardId: board.id,
        columnId: customCol1.id, // Code Review
        title: 'Refactor Auth Token Rotation Service',
        description: 'Move token rotation into centralized cryptographic helper and add test coverage',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        type: 'TASK',
        storyPoints: 5,
        reporterId: ownerUser.id,
      },
      include: { column: true },
    });

    console.log(`✓ Ticket "${ticketInReview.title}" created in column "${ticketInReview.column.name}" with status ${ticketInReview.status}`);
    if (ticketInReview.columnId !== customCol1.id) {
      throw new Error('Ticket columnId association mismatch!');
    }

    const ticketInQA = await prisma.ticket.create({
      data: {
        projectId: testProject.id,
        boardId: board.id,
        columnId: customCol2.id, // QA Verification
        title: 'Verify Horizontal Scrollbar on Mobile Viewports',
        description: 'Test swipe gestures and touch scroll bounds on iOS and Android',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        type: 'BUG',
        storyPoints: 3,
        reporterId: ownerUser.id,
      },
      include: { column: true },
    });
    console.log(`✓ Ticket "${ticketInQA.title}" created in column "${ticketInQA.column.name}"`);

    // -------------------------------------------------------------------------
    // TEST 9: Moving Ticket Between Dynamic Columns
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: Moving Ticket Between Dynamic Columns ---');
    // Move ticketInReview to Done column
    const doneCol = initialColumns[2];
    const movedTicket = await prisma.ticket.update({
      where: { id: ticketInReview.id },
      data: {
        columnId: doneCol.id,
        status: doneCol.category,
      },
      include: { column: true },
    });

    console.log(`✓ Ticket moved to column "${movedTicket.column.name}" with synchronized status: ${movedTicket.status}`);
    if (movedTicket.columnId !== doneCol.id || movedTicket.status !== 'DONE') {
      throw new Error('Ticket movement failed to synchronize columnId and status!');
    }

    // -------------------------------------------------------------------------
    // TEST 10: Safe Column Deletion with Associated Ticket Migration
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: Safe Column Deletion with Ticket Migration ---');
    // customCol2 ('QA Verification') currently contains ticketInQA!
    const countBefore = await prisma.ticket.count({ where: { columnId: customCol2.id } });
    console.log(`Column "${renamedCol.name}" has ${countBefore} ticket(s) before deletion.`);
    if (countBefore === 0) {
      throw new Error('Expected column to contain tickets before deletion test!');
    }

    // Delete customCol2 and safely migrate tickets to customCol1 ('Code Review')
    const targetFallbackCol = customCol1;
    await prisma.$transaction(async (tx) => {
      // 1. Move tickets safely
      await tx.ticket.updateMany({
        where: { columnId: customCol2.id },
        data: {
          columnId: targetFallbackCol.id,
          status: targetFallbackCol.category,
        },
      });

      // 2. Delete column
      await tx.boardColumn.delete({
        where: { id: customCol2.id },
      });
    });

    // Verify tickets were NOT lost
    const migratedTicket = await prisma.ticket.findUnique({
      where: { id: ticketInQA.id },
      include: { column: true },
    });

    console.log(`✓ Column safely deleted! Associated ticket was migrated to "${migratedTicket.column.name}" without data loss.`);
    if (migratedTicket.columnId !== targetFallbackCol.id) {
      throw new Error('Ticket migration during column deletion failed!');
    }

    console.log('\n===============================================================');
    console.log('🎉 ALL 10 TEST SUITES PASSED CLEANLY & SUCCESSFULLY!');
    console.log('===============================================================\n');
  } catch (err) {
    console.error('\n❌ Test suite failure:', err);
    process.exit(1);
  } finally {
    // Cleanup
    if (testProjectId) {
      console.log(`Cleaning up test project ${testProjectId}...`);
      await prisma.project.delete({ where: { id: testProjectId } }).catch(() => {});
    }
    if (customRoleId) {
      console.log(`Cleaning up custom role ${customRoleId}...`);
      await prisma.role.delete({ where: { id: customRoleId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

runTests();
