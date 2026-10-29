import { prisma } from '../dist/lib/prisma.js';

async function runTest() {
  console.log('🧪 Testing Multi-Assignee Ticket Functionality...\n');

  // 1. Create a dummy project and 3 users
  const timestamp = Date.now();
  const owner = await prisma.user.create({
    data: {
      email: `multi_owner_${timestamp}@example.com`,
      username: `multi_owner_${timestamp}`,
      passwordHash: 'dummy',
    },
  });

  const dev1 = await prisma.user.create({
    data: {
      email: `dev1_${timestamp}@example.com`,
      username: `dev1_${timestamp}`,
      passwordHash: 'dummy',
    },
  });

  const dev2 = await prisma.user.create({
    data: {
      email: `dev2_${timestamp}@example.com`,
      username: `dev2_${timestamp}`,
      passwordHash: 'dummy',
    },
  });

  const project = await prisma.project.create({
    data: {
      name: `Multi Assignee Project ${timestamp}`,
      slug: `multi-assignee-${timestamp}`,
      ownerId: owner.id,
      boards: {
        create: {
          name: 'Main Board',
          columns: {
            create: [
              { name: 'To Do', category: 'TODO', position: 0 },
            ],
          },
        },
      },
    },
    include: {
      boards: {
        include: {
          columns: true,
        },
      },
    },
  });

  const board = project.boards[0];
  const column = board.columns[0];

  try {
    // 2. Create ticket assigned to dev1 and dev2
    const assigneeIds = [dev1.id, dev2.id];
    console.log(`Step 1: Creating ticket with 2 assignees: [${dev1.username}, ${dev2.username}]...`);

    const ticket = await prisma.ticket.create({
      data: {
        projectId: project.id,
        boardId: board.id,
        columnId: column.id,
        title: 'Multi-Assignee Test Ticket',
        status: 'TODO',
        assigneeId: assigneeIds[0],
        assignees: {
          create: assigneeIds.map((userId) => ({ userId })),
        },
      },
      include: {
        assignees: {
          include: {
            user: { select: { id: true, username: true, email: true } },
          },
        },
        assignee: true,
      },
    });

    console.log('Ticket created:', ticket.id);
    console.log('Primary assignee:', ticket.assignee?.username);
    console.log('Assignees count:', ticket.assignees.length);
    console.log('Assignee names:', ticket.assignees.map((a) => a.user.username));

    if (ticket.assignees.length !== 2) {
      throw new Error(`Expected 2 assignees, got ${ticket.assignees.length}`);
    }
    if (ticket.assigneeId !== dev1.id) {
      throw new Error(`Expected primary assigneeId to be ${dev1.id}, got ${ticket.assigneeId}`);
    }
    console.log('✓ Step 1 passed: Ticket created with multiple assignees!\n');

    // 3. Update ticket to add owner as a 3rd assignee
    console.log(`Step 2: Updating ticket to add ${owner.username} as 3rd assignee...`);
    const newAssigneeIds = [dev1.id, dev2.id, owner.id];

    await prisma.ticketAssignee.deleteMany({ where: { ticketId: ticket.id } });
    await prisma.ticketAssignee.createMany({
      data: newAssigneeIds.map((userId) => ({ ticketId: ticket.id, userId })),
    });

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        assigneeId: newAssigneeIds[0],
      },
      include: {
        assignees: {
          include: {
            user: { select: { id: true, username: true, email: true } },
          },
        },
        assignee: true,
      },
    });

    console.log('Updated assignees count:', updatedTicket.assignees.length);
    console.log('Assignee names:', updatedTicket.assignees.map((a) => a.user.username));

    if (updatedTicket.assignees.length !== 3) {
      throw new Error(`Expected 3 assignees, got ${updatedTicket.assignees.length}`);
    }
    console.log('✓ Step 2 passed: Successfully added 3rd assignee!\n');

    // 4. Update ticket to remove dev2 (leaving dev1 and owner)
    console.log(`Step 3: Removing ${dev2.username} (leaving dev1 and owner)...`);
    const reducedAssigneeIds = [dev1.id, owner.id];

    await prisma.ticketAssignee.deleteMany({ where: { ticketId: ticket.id } });
    await prisma.ticketAssignee.createMany({
      data: reducedAssigneeIds.map((userId) => ({ ticketId: ticket.id, userId })),
    });

    const reducedTicket = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      include: {
        assignees: {
          include: {
            user: { select: { id: true, username: true, email: true } },
          },
        },
      },
    });

    console.log('Reduced assignees count:', reducedTicket.assignees.length);
    console.log('Assignee names:', reducedTicket.assignees.map((a) => a.user.username));

    if (reducedTicket.assignees.length !== 2) {
      throw new Error(`Expected 2 assignees, got ${reducedTicket.assignees.length}`);
    }
    if (reducedTicket.assignees.some((a) => a.userId === dev2.id)) {
      throw new Error('dev2 should not be in assignees');
    }
    console.log('✓ Step 3 passed: Successfully removed dev2!\n');

    // 5. Test CASCADE delete when ticket is deleted
    console.log('Step 4: Testing cascade deletion of ticket_assignees...');
    await prisma.ticket.delete({ where: { id: ticket.id } });

    const remainingJoinRecords = await prisma.ticketAssignee.findMany({
      where: { ticketId: ticket.id },
    });

    if (remainingJoinRecords.length !== 0) {
      throw new Error(`Expected 0 join records after ticket deletion, got ${remainingJoinRecords.length}`);
    }
    console.log('✓ Step 4 passed: Join records cleanly cascaded upon ticket deletion!\n');

    console.log('🎉 ALL MULTI-ASSIGNEE VERIFICATION TESTS PASSED SUCCESSFULLY!');
  } finally {
    // Cleanup
    await prisma.project.delete({ where: { id: project.id } }).catch(() => {});
    await prisma.user.deleteMany({
      where: { id: { in: [owner.id, dev1.id, dev2.id] } },
    }).catch(() => {});
  }
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
