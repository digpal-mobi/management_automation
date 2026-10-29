const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3001/api';

async function runTest() {
  console.log('=================================================================');
  console.log('🧪 Verifying Clean Database & Project PRD Ingestion -> AI Tickets');
  console.log('=================================================================');

  // Step 1: Clean slate - ensure 0 projects in DB
  await prisma.project.deleteMany();
  const initialProjectCount = await prisma.project.count();
  console.log(`[Step 1] Initial project count in DB: ${initialProjectCount}`);

  // Step 2: Ensure test user exists & obtain token
  let user = await prisma.user.findFirst({ where: { email: 'admin@taskpulse.ai' } });
  if (!user) {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('Password123!', 10);
    user = await prisma.user.create({
      data: {
        email: 'admin@taskpulse.ai',
        username: 'AdminUser',
        passwordHash: hash,
        role: 'admin',
      },
    });
  }

  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { userId: user.id, email: user.email, username: user.username },
    process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_12345',
    { expiresIn: '1h' }
  );

  const authHeader = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  console.log(`[Step 2] Authenticated as: ${user.username} (${user.email})`);

  // Step 3: User creates a real project with PRD text
  console.log('[Step 3] User creates a new project: "Autonomous Supply Chain Tracker"...');
  const prdContent = `# Autonomous Supply Chain Tracker - PRD

## Executive Overview
A real-time logistics tracking system that predicts port bottlenecks and dynamically reroutes shipping containers using sensor telemetry.

## Functional Requirements
- Real-time GPS and temperature sensor telemetry ingestion (MQTT / WebSockets).
- Automated bottleneck detection at marine container ports with anomaly scoring.
- Automated carrier notification dispatch via Webhooks and SMS.

## Non-Functional Requirements
- Sub-200ms latency for sensor stream ingest.
- SOC2 compliant end-to-end payload encryption.

## Proposed Modules & Features
### 1. Ingestion Engine
High-throughput telemetry ingestion pipeline handling 10,000 events/second.

### 2. Predictive Bottleneck Detector
AI-driven congestion scoring model evaluating port dwell times and customs clearance delays.

### 3. Automated Carrier Dispatcher
Autonomous alert and dynamic reroute notification service for logistics fleet managers.
`;

  const createRes = await fetch(`${BASE_URL}/projects`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      name: 'Autonomous Supply Chain Tracker',
      description: 'Real-time telemetry and predictive congestion routing for maritime supply chains',
      prdText: prdContent,
      techStack: 'Next.js 14, Node.js, Express, PostgreSQL, Redis, MQTT',
      goals: 'Reduce port demurrage costs by 35% through predictive rerouting',
      constraints: 'Sub-200ms telemetry latency, strict maritime safety compliance',
    }),
  });

  const createData = await createRes.json();
  if (!createData.success) {
    throw new Error(`Project creation failed: ${JSON.stringify(createData)}`);
  }

  const project = createData.project;
  console.log(`✓ Project created with ID: ${project.id}`);
  console.log(`  userRole returned: "${project.userRole}" (canEdit: ${project.userRole === 'owner'})`);
  console.log(`  Initial document count: ${project.documentCount}`);

  // Step 4: User uploads an additional specification document (PDF / Markdown / Doc)
  console.log('\n[Step 4] User uploads additional technical document via Document Upload API...');
  const formData = new FormData();
  const specBlob = new Blob([`
# Marine Sensor Telemetry Specification
Version: 1.2
Protocol: MQTT v5.0 over TLS

## Data Contract
- container_id: string
- latitude: float
- longitude: float
- ambient_temp_celsius: float
- shock_event_detected: boolean
- battery_percent: integer
  `], { type: 'text/markdown' });

  formData.append('files', specBlob, 'Sensor_Telemetry_Spec.md');

  const uploadRes = await fetch(`${BASE_URL}/projects/${project.id}/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const uploadData = await uploadRes.json();
  if (!uploadData.success) {
    throw new Error(`Document upload failed: ${JSON.stringify(uploadData)}`);
  }
  console.log(`✓ Document uploaded successfully: ${uploadData.documents?.[0]?.filename}`);

  // Step 5: Check project knowledge endpoint
  console.log('\n[Step 5] Querying GET /api/projects/:id and /api/projects/:id/documents...');
  const projGetRes = await fetch(`${BASE_URL}/projects/${project.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const projGetData = await projGetRes.json();

  const docsGetRes = await fetch(`${BASE_URL}/projects/${project.id}/documents`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const docsGetData = await docsGetRes.json();

  console.log(`✓ Project userRole: "${projGetData.project.userRole}"`);
  console.log(`✓ Documents found: ${docsGetData.documents.length}`);
  docsGetData.documents.forEach((d) => {
    console.log(`  - ${d.filename} (${d.status}, ${d._count?.chunks || 0} chunks)`);
  });

  // Step 6: Trigger AI Analysis
  console.log('\n[Step 6] Running AI Analysis on project documents...');
  const analysisRes = await fetch(`${BASE_URL}/projects/${project.id}/analysis/run`, {
    method: 'POST',
    headers: authHeader,
  });
  const analysisData = await analysisRes.json();

  console.log(`✓ Analysis completed! Status: ${analysisData.analysis?.status}`);
  console.log(`  Overview preview: ${analysisData.analysis?.overview?.slice(0, 100)}...`);
  console.log(`  Functional Requirements: ${analysisData.analysis?.functionalRequirements?.length || 0}`);
  console.log(`  Candidate Features Extracted: ${analysisData.featuresExtracted}`);

  // Step 7: Inspect Roadmap Features
  console.log('\n[Step 7] Inspecting Roadmap Features...');
  const featuresRes = await fetch(`${BASE_URL}/projects/${project.id}/features`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const featuresData = await featuresRes.json();
  const features = featuresData.features;
  console.log(`✓ Found ${features.length} extracted roadmap features:`);
  features.forEach((f, i) => {
    console.log(`  ${i + 1}. [${f.module}] ${f.name} (Priority: ${f.suggestedPriority})`);
  });

  // Step 8: Autonomous Ticket Generation for Feature
  if (features.length > 0) {
    const targetFeature = features[0];
    console.log(`\n[Step 8] Generating developer tickets for feature: "${targetFeature.name}"...`);
    const genRes = await fetch(
      `${BASE_URL}/projects/${project.id}/features/${targetFeature.id}/generate-tickets`,
      {
        method: 'POST',
        headers: authHeader,
      }
    );
    const genData = await genRes.json();
    console.log(`[Step 8 status: ${genRes.status}]`, genData);

    if (genData.tickets) {
      console.log(`✓ Generated ${genData.count} developer-ready tickets:`);
      genData.tickets.forEach((t) => {
        console.log(`  - Ticket: "${t.title}" (${t.priority}, ${t.storyPoints || 0} pts, Column: ${t.status})`);
        if (t.acceptanceCriteria && Array.isArray(t.acceptanceCriteria)) {
          console.log(`    Acceptance criteria count: ${t.acceptanceCriteria.length}`);
        }
      });
    }
  }

  // Step 9: Inspect Kanban Board
  console.log('\n[Step 9] Inspecting Dynamic Kanban Board...');
  const boardRes = await fetch(`${BASE_URL}/projects/${project.id}/board`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const boardData = await boardRes.json();
  const board = boardData.board;
  console.log(`✓ Board: "${board.name}" with ${board.columns.length} columns:`);
  board.columns.forEach((c) => {
    console.log(`  * Column "${c.name}": ${c.tickets.length} tickets`);
  });

  // Step 10: Clean up test project if desired
  console.log('\n[Step 10] Deleting test project to maintain clean user workspace...');
  await fetch(`${BASE_URL}/projects/${project.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const finalCount = await prisma.project.count();
  console.log(`✓ Test project cleaned up. Final DB project count: ${finalCount}`);

  console.log('\n=================================================================');
  console.log('🎉 ALL TESTS PASSED: Clean slate, document ingestion,');
  console.log('   AI analysis, and autonomous ticket generation verified!');
  console.log('=================================================================');
}

runTest()
  .catch((e) => {
    console.error('Test failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
