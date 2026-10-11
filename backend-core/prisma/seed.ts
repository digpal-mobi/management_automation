import { PrismaClient, Role, Priority, SenderType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial database...');

  // 1. Create Default Users
  const usersData = [
    {
      name: 'Alex Rivera',
      email: 'alex.rivera@team.internal',
      role: Role.TECH_LEAD,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    {
      name: 'Sarah Chen',
      email: 'sarah.chen@team.internal',
      role: Role.DEVELOPER,
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    },
    {
      name: 'Marcus Vance',
      email: 'marcus.vance@team.internal',
      role: Role.DEVELOPER,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    {
      name: 'Elena Rostova',
      email: 'elena.rostova@team.internal',
      role: Role.PM,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    },
  ];

  const createdUsers = [];
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: u,
    });
    createdUsers.push(user);
  }

  console.log(`Created ${createdUsers.length} users`);

  // 2. Check if sample project already exists
  const existingProject = await prisma.project.findFirst({
    where: { name: 'CloudScale SaaS Platform' },
  });

  if (!existingProject) {
    const pm = createdUsers.find((u) => u.role === Role.PM) || createdUsers[0];
    const dev1 = createdUsers.find((u) => u.name === 'Sarah Chen') || createdUsers[1];
    const dev2 = createdUsers.find((u) => u.name === 'Marcus Vance') || createdUsers[2];

    const prd = `
# CloudScale SaaS Platform - Product Requirements Document

## Executive Summary
CloudScale is a multi-tenant cloud operations dashboard enabling engineering teams to orchestrate microservices, monitor cluster health, and automate rollbacks via declarative policies.

## Key Goals
1. Provide single pane of glass observability for Kubernetes clusters.
2. Ensure sub-second latency for real-time telemetry graphs and WebSocket streams.
3. Strict tenant isolation at database and API gateway tiers.

## Architecture & Tech Stack
- Frontend: Next.js (App Router), Tailwind CSS, Redux Toolkit, Recharts
- Backend: Node.js (Express), Python (FastAPI/Flask) for ML anomaly detection
- Database: PostgreSQL with pgvector for log search & telemetry semantic clustering
- Authentication: JWT with refresh token rotation & Org RBAC
`;

    const project = await prisma.project.create({
      data: {
        name: 'CloudScale SaaS Platform',
        description: 'Multi-tenant cloud infrastructure and telemetry orchestration engine',
        prdText: prd,
        techStack: 'Next.js 14, Node.js, Express, PostgreSQL, pgvector, Redis, Docker',
        goals: 'Multi-tenant cluster monitoring with real-time anomaly detection',
        constraints: 'Sub-second telemetry latency, 99.99% SLA, strict RBAC',
        createdById: pm.id,
      },
    });

    // Create Board
    const board = await prisma.board.create({
      data: {
        projectId: project.id,
        name: 'CloudScale Kanban Board',
      },
    });

    // Create Columns
    const columnNames = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'];
    const columns: Record<string, any> = {};

    for (let i = 0; i < columnNames.length; i++) {
      const col = await prisma.column.create({
        data: {
          boardId: board.id,
          name: columnNames[i],
          position: i,
        },
      });
      columns[columnNames[i]] = col;
    }

    // Create Seed Tickets
    const sampleTickets = [
      {
        title: 'Implement Tenant Isolation Middleware & Schema Separation',
        description: 'Enforce multi-tenant data isolation across all database queries. Every incoming request must resolve tenant_id from JWT claims and inject it into the database connection context.',
        acceptanceCriteria: [
          { id: '1', text: 'Extract tenant ID from validated JWT claims', completed: true },
          { id: '2', text: 'Set PostgreSQL session variable `app.current_tenant_id` before query execution', completed: true },
          { id: '3', text: 'Verify cross-tenant data leakage is prevented via Row-Level Security (RLS)', completed: false },
          { id: '4', text: 'Add unit tests simulating cross-tenant access attempts', completed: false },
        ],
        technicalNotes: 'Configure Prisma extension or custom Express middleware. Ensure connection pooling supports dynamic session variables or scoped tenant queries.',
        prChecklist: [
          { id: 'pr-1', text: 'RLS policies tested with negative cases', completed: false },
          { id: 'pr-2', text: 'Benchmark connection overhead < 5ms', completed: false },
        ],
        priority: Priority.HIGH,
        storyPoints: 8,
        labels: ['backend', 'security', 'multi-tenancy', 'database'],
        columnId: columns['In Progress'].id,
        assigneeId: dev1.id,
        position: 0,
      },
      {
        title: 'Design Real-Time Cluster Telemetry WebSocket Stream',
        description: 'Provide high-frequency cluster metrics (CPU, RAM, network I/O) over WebSockets with automatic room scoping per cluster ID.',
        acceptanceCriteria: [
          { id: '1', text: 'WebSocket server attaches to core Express HTTP listener', completed: true },
          { id: '2', text: 'Clients can subscribe to `cluster:{id}` room', completed: true },
          { id: '3', text: 'Throttling and backpressure protection at 10 updates/sec per stream', completed: true },
          { id: '4', text: 'Heartbeat ping-pong with 30s timeout for stale disconnects', completed: true },
        ],
        technicalNotes: 'Use Socket.IO with redis adapter for horizontal scaling. Payload serialized with lightweight JSON buffers.',
        prChecklist: [
          { id: 'pr-1', text: 'Load tested with 1,000 concurrent sockets', completed: true },
          { id: 'pr-2', text: 'Clean disconnect listener cleanup verified', completed: true },
        ],
        priority: Priority.HIGH,
        storyPoints: 5,
        labels: ['websocket', 'backend', 'streaming', 'real-time'],
        columnId: columns['Done'].id,
        assigneeId: dev2.id,
        position: 0,
      },
      {
        title: 'Build Interactive Metrics Dashboard UI in Next.js',
        description: 'Create responsive metrics dashboard widgets showing live memory charts, active pods, and health badges with instant WebSocket updates.',
        acceptanceCriteria: [
          { id: '1', text: 'Line chart component rendering 60-second rolling telemetry window', completed: true },
          { id: '2', text: 'Status badge component with pulsing green/amber/red indicators', completed: false },
          { id: '3', text: 'Zero layout shift during live chart re-renders', completed: false },
          { id: '4', text: 'Dark mode styling matching Shadcn UI palette', completed: false },
        ],
        technicalNotes: 'Use Recharts or Canvas-based chart for 60fps rendering without DOM bottlenecks. Wire up to Redux Toolkit slice.',
        prChecklist: [
          { id: 'pr-1', text: 'Renders cleanly at 1440p and mobile viewports', completed: false },
          { id: 'pr-2', text: 'Memory leak check with 1-hour soak test', completed: false },
        ],
        priority: Priority.MEDIUM,
        storyPoints: 5,
        labels: ['frontend', 'nextjs', 'ui', 'charts'],
        columnId: columns['To Do'].id,
        assigneeId: dev1.id,
        position: 0,
      },
      {
        title: 'Setup Automated Anomaly Detection Pipeline',
        description: 'Interface Python AI microservice with cluster telemetry to detect sudden spike anomalies and trigger webhook alerts.',
        acceptanceCriteria: [
          { id: '1', text: 'Fast vector search against baseline normal behavior embeddings', completed: false },
          { id: '2', text: 'Confidence threshold scoring (0.0 to 1.0) with configurable alerts', completed: false },
          { id: '3', text: 'Slack / PagerDuty webhook dispatch on HIGH severity anomalies', completed: false },
        ],
        technicalNotes: 'Use pgvector cosine similarity to compute deviation from healthy cluster baseline embeddings.',
        prChecklist: [
          { id: 'pr-1', text: 'False positive rate below 3% on historical dataset', completed: false },
        ],
        priority: Priority.MEDIUM,
        storyPoints: 8,
        labels: ['ai', 'python', 'pgvector', 'ml'],
        columnId: columns['Backlog'].id,
        assigneeId: dev2.id,
        position: 0,
      },
      {
        title: 'Implement Automated Pod Rollback Policy Controller',
        description: 'Provide declarative rollback engine that triggers deployment revisions if crash-loop rate exceeds 5% within 3 minutes.',
        acceptanceCriteria: [
          { id: '1', text: 'Kubernetes client controller monitoring deployment status events', completed: true },
          { id: '2', text: 'Automatic rollback invocation calling rollback API', completed: true },
          { id: '3', text: 'Audit trail record written to PostgreSQL event log', completed: false },
        ],
        technicalNotes: 'Use `@kubernetes/client-node`. Ensure RBAC permissions for ServiceAccount restrict rollbacks to target namespace.',
        prChecklist: [
          { id: 'pr-1', text: 'Tested in staging cluster with synthetic failing image', completed: false },
        ],
        priority: Priority.HIGH,
        storyPoints: 5,
        labels: ['devops', 'kubernetes', 'automation'],
        columnId: columns['In Review'].id,
        assigneeId: dev1.id,
        position: 0,
      },
    ];

    for (const t of sampleTickets) {
      const ticket = await prisma.ticket.create({
        data: {
          projectId: project.id,
          columnId: t.columnId,
          title: t.title,
          description: t.description,
          acceptanceCriteria: t.acceptanceCriteria,
          technicalNotes: t.technicalNotes,
          prChecklist: t.prChecklist,
          priority: t.priority,
          storyPoints: t.storyPoints,
          labels: t.labels,
          dependencies: [],
          position: t.position,
          assigneeId: t.assigneeId,
          createdById: pm.id,
        },
      });

      // Add a couple sample messages
      if (t.title.includes('Tenant Isolation')) {
        await prisma.message.create({
          data: {
            ticketId: ticket.id,
            senderType: SenderType.USER,
            senderId: dev1.id,
            senderName: dev1.name,
            content: 'Should we use PostgreSQL Row-Level Security (RLS) directly or filter in Prisma query middleware?',
          },
        });

        await prisma.message.create({
          data: {
            ticketId: ticket.id,
            senderType: SenderType.AI,
            senderName: 'Antigravity AI Lead',
            content: `### Architecture Recommendation: Defense-in-Depth RLS + Prisma Extension

For multi-tenant SaaS platforms with strict isolation requirements, the recommended pattern is **PostgreSQL Row-Level Security (RLS)** as the authoritative barrier, supplemented by a **Prisma Client Extension** for clean developer ergonomics.

\`\`\`typescript
// src/lib/prisma-tenant.ts
import { PrismaClient } from '@prisma/client';

export function getTenantPrisma(tenantId: string) {
  const prisma = new PrismaClient();
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          // Wrap operations in transaction with session variable set
          return prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(
              \`SET LOCAL app.current_tenant_id = '\${tenantId}';\`
            );
            return query(args);
          });
        },
      },
    },
  });
}
\`\`\`

#### Key Benefits:
1. **Zero Leakage Risk**: Even if an engineer omits \`where: { tenantId }\` in application code, the PostgreSQL engine silently restricts access.
2. **Audit Compliance**: SOC2 and ISO27001 auditors specifically look for DB-enforced isolation boundaries.
`,
          },
        });
      }
    }

    console.log(`Created sample project "${project.name}" with 5 tickets and discussion messages.`);
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
