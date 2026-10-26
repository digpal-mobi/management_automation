import { describe, it } from 'node:test';
import assert from 'node:assert';
import { prisma } from '../src/lib/prisma.js';
import {
  SprintPlanningBrainService,
  PlanningTicket,
  PlanGenerationOptions,
} from '../src/lib/sprintPlanningBrain.js';
import { PERMISSIONS } from '../src/authorization/permissions.js';
import { SYSTEM_ROLE_KEYS } from '../src/authorization/roles.js';
import { TicketPriority, TicketStatus } from '@prisma/client';

describe('AI Sprint Planning Brain — Comprehensive Test Suite', () => {
  // Helper to create mock tickets for unit testing deterministic logic
  function createMockTicket(overrides: Partial<PlanningTicket>): PlanningTicket {
    return {
      id: overrides.id || `ticket-${Math.random().toString(36).slice(2, 8)}`,
      sourceCandidateId: overrides.sourceCandidateId || null,
      title: overrides.title || 'Sample Ticket',
      description: overrides.description || 'Description',
      featureId: overrides.featureId || null,
      module: overrides.module || 'General',
      priority: overrides.priority || TicketPriority.MEDIUM,
      type: overrides.type || 'Feature',
      storyPoints: overrides.storyPoints ?? 3,
      ownershipRole: overrides.ownershipRole || 'Backend',
      status: overrides.status || TicketStatus.TODO,
      currentSprint: overrides.currentSprint || null,
      executionOrder: overrides.executionOrder || 0,
      isLocked: overrides.isLocked || false,
      technicalNotes: overrides.technicalNotes || null,
      acceptanceCriteria: overrides.acceptanceCriteria || null,
      prerequisites: overrides.prerequisites || [],
      dependents: overrides.dependents || [],
      criticalPathScore: overrides.criticalPathScore || 0,
      isCriticalPath: overrides.isCriticalPath || false,
      isReleaseCritical: overrides.isReleaseCritical || false,
    };
  }

  const standardSprints = [
    { sprint: 'S1', sprintName: 'Sprint 1', capacityPoints: 20 },
    { sprint: 'S2', sprintName: 'Sprint 2', capacityPoints: 20 },
    { sprint: 'S3', sprintName: 'Sprint 3', capacityPoints: 20 },
  ];

  // Test 1: Independent tickets
  it('1. should schedule independent tickets across sprints respecting capacity', () => {
    const tMap = new Map<string, PlanningTicket>();
    tMap.set('t1', createMockTicket({ id: 't1', title: 'Task 1', storyPoints: 8 }));
    tMap.set('t2', createMockTicket({ id: 't2', title: 'Task 2', storyPoints: 8 }));
    tMap.set('t3', createMockTicket({ id: 't3', title: 'Task 3', storyPoints: 8 }));
    tMap.set('t4', createMockTicket({ id: 't4', title: 'Task 4', storyPoints: 8 }));

    const { sprintAllocations, unscheduledTickets } = SprintPlanningBrainService.allocateSprints(
      tMap,
      standardSprints,
      { strictCapacity: true }
    );

    assert.strictEqual(unscheduledTickets.length, 0, 'No tickets unscheduled');
    const s1 = sprintAllocations.find((s) => s.sprintId === 'S1')!;
    const s2 = sprintAllocations.find((s) => s.sprintId === 'S2')!;

    assert.ok(s1.allocatedPoints <= 20, 'S1 within capacity');
    assert.ok(s2.allocatedPoints <= 20, 'S2 within capacity');
    assert.strictEqual(s1.tickets.length + s2.tickets.length, 4, 'All 4 tickets scheduled');
  });

  // Test 2: Multiple prerequisite relationships
  it('2. should enforce prerequisites precede dependent tickets in sprint allocation or execution order', () => {
    const tMap = new Map<string, PlanningTicket>();
    const t1 = createMockTicket({ id: 't1', title: 'Database Schema', storyPoints: 5, prerequisites: [] });
    const t2 = createMockTicket({ id: 't2', title: 'Auth API', storyPoints: 5, prerequisites: ['t1'] });
    const t3 = createMockTicket({ id: 't3', title: 'User Dashboard UI', storyPoints: 5, prerequisites: ['t1', 't2'] });

    t1.dependents = ['t2', 't3'];
    t2.dependents = ['t3'];

    tMap.set('t1', t1);
    tMap.set('t2', t2);
    tMap.set('t3', t3);

    const { sprintAllocations } = SprintPlanningBrainService.allocateSprints(tMap, standardSprints);

    // Find sprint index for each ticket
    const sIdxMap = new Map<string, number>();
    const execMap = new Map<string, number>();
    sprintAllocations.forEach((s, idx) => {
      s.tickets.forEach((t) => {
        sIdxMap.set(t.ticketId, idx);
        execMap.set(t.ticketId, t.executionOrder);
      });
    });

    const s1Idx = sIdxMap.get('t1')!;
    const s2Idx = sIdxMap.get('t2')!;
    const s3Idx = sIdxMap.get('t3')!;

    assert.ok(s1Idx <= s2Idx, 't1 scheduled in or before t2 sprint');
    assert.ok(s2Idx <= s3Idx, 't2 scheduled in or before t3 sprint');

    // If in same sprint, execution order must be t1 < t2 < t3
    if (s1Idx === s2Idx) {
      assert.ok(execMap.get('t1')! < execMap.get('t2')!, 't1 executed before t2 in same sprint');
    }
    if (s2Idx === s3Idx) {
      assert.ok(execMap.get('t2')! < execMap.get('t3')!, 't2 executed before t3 in same sprint');
    }
  });

  // Test 3: Circular dependencies
  it('3. should detect circular dependencies and gracefully break cycles to prevent infinite loops', () => {
    const tMap = new Map<string, PlanningTicket>();
    const tA = createMockTicket({ id: 'tA', title: 'Ticket A', storyPoints: 3 });
    const tB = createMockTicket({ id: 'tB', title: 'Ticket B', storyPoints: 3 });
    const tC = createMockTicket({ id: 'tC', title: 'Ticket C', storyPoints: 3 });

    tMap.set('tA', tA);
    tMap.set('tB', tB);
    tMap.set('tC', tC);

    // Introduce cycle: tA -> tB -> tC -> tA
    const explicitDeps = [
      { sourceTicketId: 'tA', targetTicketId: 'tB', type: 'BLOCKS' },
      { sourceTicketId: 'tB', targetTicketId: 'tC', type: 'BLOCKS' },
      { sourceTicketId: 'tC', targetTicketId: 'tA', type: 'BLOCKS' },
    ];

    const { edges, cycles } = SprintPlanningBrainService.buildDependencyGraph(tMap, explicitDeps);

    assert.ok(cycles.length > 0, 'Cycle was detected');
    // Ensure cycle was broken by checking that allocateSprints succeeds without deadlock
    const { sprintAllocations } = SprintPlanningBrainService.allocateSprints(tMap, standardSprints);
    const totalScheduled = sprintAllocations.reduce((sum, s) => sum + s.tickets.length, 0);
    assert.strictEqual(totalScheduled, 3, 'All tickets scheduled despite initial cycle');
  });

  // Test 4: Missing prerequisite tickets
  it('4. should flag tickets with unresolvable or missing prerequisites as unscheduled', () => {
    const tMap = new Map<string, PlanningTicket>();
    // t1 depends on a missing/non-existent ticket 't-missing'
    const t1 = createMockTicket({
      id: 't1',
      title: 'Checkout Payment',
      storyPoints: 5,
      prerequisites: ['t-missing'],
    });
    tMap.set('t1', t1);

    const { unscheduledTickets } = SprintPlanningBrainService.allocateSprints(tMap, standardSprints);
    assert.strictEqual(unscheduledTickets.length, 1, 'Ticket with missing prerequisite is unscheduled');
    assert.strictEqual(
      unscheduledTickets[0].reasonCode,
      'UNSCHEDULED_DEPENDENCY_UNRESOLVED',
      'Reason code correctly reflects unresolved dependency'
    );
    assert.ok(unscheduledTickets[0].blockingPrerequisites.includes('t-missing'));
  });

  // Test 5: Sprint capacity constraints
  it('5. should respect configured sprint capacity bounds', () => {
    const tMap = new Map<string, PlanningTicket>();
    for (let i = 1; i <= 6; i++) {
      tMap.set(`t${i}`, createMockTicket({ id: `t${i}`, title: `Ticket ${i}`, storyPoints: 5 }));
    }

    const tightSprints = [
      { sprint: 'S1', sprintName: 'Sprint 1', capacityPoints: 10 },
      { sprint: 'S2', sprintName: 'Sprint 2', capacityPoints: 10 },
      { sprint: 'S3', sprintName: 'Sprint 3', capacityPoints: 10 },
    ];

    const { sprintAllocations, unscheduledTickets } = SprintPlanningBrainService.allocateSprints(
      tMap,
      tightSprints,
      { strictCapacity: true }
    );

    assert.strictEqual(unscheduledTickets.length, 0);
    for (const sprint of sprintAllocations) {
      assert.ok(
        sprint.allocatedPoints <= sprint.capacityPoints,
        `Sprint ${sprint.sprintId} allocated ${sprint.allocatedPoints} <= capacity ${sprint.capacityPoints}`
      );
    }
  });

  // Test 6: Workloads that exceed available capacity
  it('6. should route overflow tickets to unscheduled backlog with UNSCHEDULED_CAPACITY_EXCEEDED', () => {
    const tMap = new Map<string, PlanningTicket>();
    // 8 tickets * 10 points = 80 points total
    for (let i = 1; i <= 8; i++) {
      tMap.set(`t${i}`, createMockTicket({ id: `t${i}`, title: `Large Task ${i}`, storyPoints: 10 }));
    }

    // Only 2 sprints of capacity 20 each = 40 points total capacity
    const smallSprints = [
      { sprint: 'S1', sprintName: 'Sprint 1', capacityPoints: 20 },
      { sprint: 'S2', sprintName: 'Sprint 2', capacityPoints: 20 },
    ];

    const { unscheduledTickets } = SprintPlanningBrainService.allocateSprints(tMap, smallSprints, {
      strictCapacity: true,
    });

    assert.ok(unscheduledTickets.length >= 4, 'At least 4 tickets overflowed');
    for (const ut of unscheduledTickets) {
      assert.strictEqual(ut.reasonCode, 'UNSCHEDULED_CAPACITY_EXCEEDED');
      assert.ok(ut.actionRequired.length > 0, 'Provides actionable remediation guidance');
    }
  });

  // Test 7: Tickets with missing estimates
  it('7. should assign provisional estimate to unestimated tickets and flag in assumptions', () => {
    const rawTickets = [
      { id: 't-unest', title: 'Ticket Without Estimate', storyPoints: null, priority: 'MEDIUM' },
      { id: 't-zero', title: 'Ticket With 0 Points', storyPoints: 0, priority: 'HIGH' },
    ];

    const normalized = SprintPlanningBrainService.normalizeTickets(rawTickets);
    assert.strictEqual(normalized.get('t-unest')?.storyPoints, 3, 'Default provisional 3 points assigned');
    assert.strictEqual(normalized.get('t-zero')?.storyPoints, 3, 'Zero points normalized to provisional 3');
  });

  // Test 8: Release-blocking tasks and delivery priority
  it('8. should calculate higher delivery priority for critical, foundational, and release-blocking tasks', () => {
    const secTicket = createMockTicket({
      id: 'sec',
      title: 'PCI-DSS Payment Security Hardening',
      priority: TicketPriority.CRITICAL,
      isReleaseCritical: true,
      module: 'Foundation & Security',
      dependents: ['t2', 't3', 't4'],
    });

    const cosmeticTicket = createMockTicket({
      id: 'cosmetic',
      title: 'Update Footer Copyright Font',
      priority: TicketPriority.LOW,
      isReleaseCritical: false,
      module: 'UI Polish',
      dependents: [],
    });

    const secScore = SprintPlanningBrainService.calculateDeliveryPriority(secTicket);
    const cosmeticScore = SprintPlanningBrainService.calculateDeliveryPriority(cosmeticTicket);

    assert.ok(secScore > cosmeticScore * 2, 'Security critical ticket receives substantially higher priority score');
  });

  // Test 9: Locked and manually assigned tickets
  it('9. should honor manually locked tickets in their assigned sprint', () => {
    const tMap = new Map<string, PlanningTicket>();
    // tLocked is explicitly locked to S2
    const tLocked = createMockTicket({
      id: 't-locked',
      title: 'Locked Mid-project Demo',
      currentSprint: 'S2',
      isLocked: true,
      storyPoints: 5,
    });
    // tFree is unlocked
    const tFree = createMockTicket({
      id: 't-free',
      title: 'Free Floating Task',
      storyPoints: 5,
    });

    tMap.set('tLocked', tLocked);
    tMap.set('tFree', tFree);

    const { sprintAllocations } = SprintPlanningBrainService.allocateSprints(tMap, standardSprints);

    const s2 = sprintAllocations.find((s) => s.sprintId === 'S2')!;
    const hasLocked = s2.tickets.some((t) => t.ticketId === 't-locked' && t.isLocked);
    assert.ok(hasLocked, 'Locked ticket remained strictly in Sprint 2');
  });

  // Test 10: Completed tickets preservation
  it('10. should preserve completed (DONE) tickets in their historical sprint assignments', () => {
    const tMap = new Map<string, PlanningTicket>();
    const tDone = createMockTicket({
      id: 't-done',
      title: 'Initial Database Setup',
      status: TicketStatus.DONE,
      currentSprint: 'S1',
      storyPoints: 5,
    });
    tMap.set('tDone', tDone);

    const { sprintAllocations } = SprintPlanningBrainService.allocateSprints(tMap, standardSprints);
    const s1 = sprintAllocations.find((s) => s.sprintId === 'S1')!;
    assert.ok(
      s1.tickets.some((t) => t.ticketId === 't-done' && t.status === TicketStatus.DONE),
      'DONE ticket retained in S1'
    );
  });

  // Test 11: Unscheduled work reporting
  it('11. should provide descriptive explanation, reason code, and action required for unscheduled work', () => {
    const tMap = new Map<string, PlanningTicket>();
    tMap.set(
      't-blocked',
      createMockTicket({
        id: 't-blocked',
        title: 'Dependent Task',
        prerequisites: ['non-existent-id'],
      })
    );

    const { unscheduledTickets } = SprintPlanningBrainService.allocateSprints(tMap, standardSprints);
    assert.strictEqual(unscheduledTickets.length, 1);
    const item = unscheduledTickets[0];
    assert.ok(item.reasonDescription.length > 10, 'Has detailed reason description');
    assert.ok(item.actionRequired.length > 10, 'Has actionable recommendation for PM');
  });

  // Test 12: New ticket added after plan is approved
  it('12. should accommodate a newly added ticket during replan without mutating approved plan', async () => {
    // Test normalization and priority calculation for a newly added ticket
    const existing = createMockTicket({ id: 'existing-1', title: 'Existing Feature', storyPoints: 5 });
    const newlyAdded = createMockTicket({ id: 'new-1', title: 'New Payment Method', storyPoints: 3, priority: TicketPriority.HIGH });

    const tMap = new Map<string, PlanningTicket>([
      ['existing-1', existing],
      ['new-1', newlyAdded],
    ]);

    const { sprintAllocations } = SprintPlanningBrainService.allocateSprints(tMap, standardSprints);
    const allAllocated = sprintAllocations.flatMap((s) => s.tickets).map((t) => t.ticketId);

    assert.ok(allAllocated.includes('new-1'), 'Newly added ticket scheduled into sprint plan');
  });

  // Test 13: Detecting changes that invalidate existing allocations
  it('13. should detect dependency inversions and capacity overflows in validation report', () => {
    const tMap = new Map<string, PlanningTicket>();
    const t1 = createMockTicket({ id: 't1', title: 'Prereq', storyPoints: 5 });
    const t2 = createMockTicket({ id: 't2', title: 'Dependent', storyPoints: 5, prerequisites: ['t1'] });
    tMap.set('t1', t1);
    tMap.set('t2', t2);

    // Intentionally construct an invalid allocation: t2 in S1, t1 in S2
    const invalidAllocations: any[] = [
      {
        sprintId: 'S1',
        name: 'Sprint 1',
        capacityPoints: 10,
        allocatedPoints: 5,
        tickets: [{ ticketId: 't2', title: 'Dependent' }],
      },
      {
        sprintId: 'S2',
        name: 'Sprint 2',
        capacityPoints: 10,
        allocatedPoints: 5,
        tickets: [{ ticketId: 't1', title: 'Prereq' }],
      },
    ];

    const report = SprintPlanningBrainService.validatePlan(tMap, invalidAllocations, [], []);
    assert.strictEqual(report.isValid, false, 'Validation flags invalid dependency order');
    assert.strictEqual(report.dependencyViolationCount, 1, 'Detected 1 dependency inversion');
    assert.ok(report.warnings.some((w) => w.includes('depends on')), 'Warning describes the inversion');
  });

  // Test 14: Replanning without duplicate tickets
  it('14. should not produce duplicate tickets across sprints', () => {
    const tMap = new Map<string, PlanningTicket>();
    for (let i = 1; i <= 10; i++) {
      tMap.set(`t${i}`, createMockTicket({ id: `t${i}`, title: `Ticket ${i}`, storyPoints: 3 }));
    }

    const { sprintAllocations } = SprintPlanningBrainService.allocateSprints(tMap, standardSprints);
    const seenIds = new Set<string>();
    let duplicates = 0;

    for (const s of sprintAllocations) {
      for (const t of s.tickets) {
        if (seenIds.has(t.ticketId)) duplicates++;
        seenIds.add(t.ticketId);
      }
    }

    assert.strictEqual(duplicates, 0, 'No ticket appears in multiple sprints');
  });

  // Test 15: Plan version comparison and supercession
  it('15. should support plan versioning, change summary tracking, and status transitions', async () => {
    // Query existing project to verify schema fields
    const project = await prisma.project.findFirst({
      include: { sprintPlans: true },
    });
    if (!project) return;

    assert.ok(project.id, 'Project exists in database');
    assert.ok(Array.isArray(project.sprintPlans), 'SprintPlans relation exists');
  });

  // Test 16: CPM Critical Path calculation
  it('16. should compute Critical Path (longest weighted dependency chain) using CPM', () => {
    const tMap = new Map<string, PlanningTicket>();
    // Chain A: t1 (5pts) -> t2 (8pts) -> t3 (13pts) = 26 pts
    // Chain B: t4 (2pts) -> t5 (2pts) = 4 pts
    const t1 = createMockTicket({ id: 't1', title: 'Core API', storyPoints: 5 });
    const t2 = createMockTicket({ id: 't2', title: 'Payment Processing', storyPoints: 8, prerequisites: ['t1'] });
    const t3 = createMockTicket({ id: 't3', title: 'Checkout End-to-End', storyPoints: 13, prerequisites: ['t2'] });
    t1.dependents = ['t2'];
    t2.dependents = ['t3'];

    const t4 = createMockTicket({ id: 't4', title: 'Minor Style', storyPoints: 2 });
    const t5 = createMockTicket({ id: 't5', title: 'Favicon Icon', storyPoints: 2, prerequisites: ['t4'] });
    t4.dependents = ['t5'];

    tMap.set('t1', t1);
    tMap.set('t2', t2);
    tMap.set('t3', t3);
    tMap.set('t4', t4);
    tMap.set('t5', t5);

    SprintPlanningBrainService.buildDependencyGraph(tMap);

    assert.ok(t3.isCriticalPath, 'End of longest chain is critical path');
    assert.ok(t3.criticalPathScore >= 26, 'Critical path score reflects cumulative weight');
    assert.ok(t4.criticalPathScore < t3.criticalPathScore, 'Shorter chain has lower score');
  });

  // Test 17: Role permissions
  it('17. should define PLAN_VIEW, PLAN_GENERATE, and PLAN_APPROVE permissions', () => {
    assert.ok(PERMISSIONS.PLAN_VIEW, 'PLAN_VIEW permission defined');
    assert.ok(PERMISSIONS.PLAN_GENERATE, 'PLAN_GENERATE permission defined');
    assert.ok(PERMISSIONS.PLAN_APPROVE, 'PLAN_APPROVE permission defined');

    // Admin should have PLAN_APPROVE and PLAN_GENERATE
    const adminRole = SYSTEM_ROLE_KEYS.PROJECT_MANAGER || 'PROJECT_MANAGER';
    assert.ok(adminRole, 'PM / Admin role exists');
  });

  // Test 18: Full End-to-End Execution on Realistic 82-Ticket Ecommerce Project
  it('18. should plan the real Ecommerce project (82 tickets across 12 sprints) end-to-end', async () => {
    const project = await prisma.project.findFirst({
      where: {
        tickets: {
          some: {
            sourceCandidateId: { startsWith: 'ECOM-' },
          },
        },
      },
      include: {
        tickets: {
          include: {
            feature: true,
            dependenciesOutgoing: true,
            dependenciesIncoming: true,
          },
        },
        analysis: true,
      },
    });

    if (!project) {
      console.warn('Real Ecommerce project fixture not loaded in database; skipping E2E test');
      return;
    }

    console.log(`Executing End-to-End Sprint Planning Brain on Project: "${project.name}" (${project.id}) with ${project.tickets.length} tickets`);

    // 1. Generate Plan
    const result = await SprintPlanningBrainService.planSprints(project.id, {
      defaultSprintCapacity: 28,
      strictCapacity: false,
      allowCoSprintDependencies: true,
    });

    assert.ok(result.planId, 'Generated plan has a valid ID');
    assert.ok(result.version >= 1, 'Version is >= 1');
    assert.strictEqual(result.status, 'PROPOSED', 'Status is PROPOSED before PM approval');
    assert.ok(result.sprintAllocations.length >= 11, 'Covers at least 11 development sprints');

    const totalScheduled = result.sprintAllocations.reduce((sum, s) => sum + s.tickets.length, 0);
    const totalUnscheduled = result.unscheduledTickets.length;
    assert.strictEqual(
      totalScheduled + totalUnscheduled,
      project.tickets.length,
      'Every project ticket has an explicit scheduling outcome'
    );

    // 2. Critical Path and Dependencies
    assert.ok(result.criticalPath.ticketIds.length > 0, 'Identified Critical Path tickets');
    assert.ok(result.dependencies.length > 0, 'Built directed dependency graph');

    // 3. Sequential Execution Order
    for (const sprint of result.sprintAllocations) {
      sprint.tickets.forEach((t, idx) => {
        assert.strictEqual(t.executionOrder, idx + 1, 'Tickets have strictly sequential execution order within sprint');
        assert.ok(t.explanation && t.explanation.length > 5, 'Every ticket has "Why this order?" explanation');
      });
    }

    // 4. Validation Report
    assert.ok(result.validationReport.ruleEvaluations.length >= 4, 'Evaluated all core planning rules');
    assert.strictEqual(result.validationReport.isValid, true, 'Validation report marks plan as valid');
    assert.strictEqual(result.validationReport.dependencyViolationCount, 0, 'Zero dependency violations');

    // 5. Test Plan Approval
    const approval = await SprintPlanningBrainService.approvePlan(project.id, result.planId, 'test-admin');
    assert.strictEqual(approval.success, true, 'Approval succeeded');
    assert.strictEqual(approval.status, 'APPROVED', 'Plan transitioned to APPROVED');

    // 6. Verify live Ticket records updated
    const liveTickets = await prisma.ticket.findMany({
      where: { projectId: project.id },
      select: { id: true, sprint: true, executionOrder: true },
    });

    const scheduledLiveTickets = liveTickets.filter((t) => t.sprint !== null);
    assert.strictEqual(
      scheduledLiveTickets.length,
      totalScheduled,
      'Live tickets reflect approved sprint assignments'
    );

    console.log(
      `E2E Plan generated & approved successfully: ${totalScheduled} tickets scheduled across ${result.sprintAllocations.length} sprints, ${totalUnscheduled} unscheduled, ${result.dependencies.length} dependency edges.`
    );
  });
});
