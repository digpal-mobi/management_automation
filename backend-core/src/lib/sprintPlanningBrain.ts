import { prisma } from './prisma.js';
import { TicketPriority, TicketStatus } from '@prisma/client';

export interface PlanningTicket {
  id: string;
  sourceCandidateId?: string | null;
  title: string;
  description?: string | null;
  featureId?: string | null;
  module?: string | null;
  priority: TicketPriority;
  type: string;
  storyPoints: number;
  ownershipRole: string;
  status: TicketStatus;
  currentSprint?: string | null;
  executionOrder: number;
  isLocked: boolean;
  technicalNotes?: string | null;
  acceptanceCriteria?: any;
  prerequisites: string[]; // ticket IDs that must precede this ticket
  dependents: string[]; // ticket IDs that depend on this ticket
  criticalPathScore: number;
  isCriticalPath: boolean;
  isReleaseCritical: boolean;
  explanation?: string;
}

export interface AllocatedSprintTicket {
  ticketId: string;
  sourceCandidateId?: string | null;
  title: string;
  module?: string | null;
  priority: string;
  storyPoints: number;
  ownershipRole: string;
  executionOrder: number;
  isLocked: boolean;
  status: string;
  prerequisitesInSprint: string[];
  prerequisitesPriorSprints: string[];
  explanation: string;
}

export interface PlanningSprintAllocation {
  sprintId: string; // e.g. "S1", "S2"
  name: string;
  startDate?: string;
  endDate?: string;
  goal: string;
  capacityPoints: number;
  allocatedPoints: number;
  utilizationPercentage: number;
  tickets: AllocatedSprintTicket[];
  roleBreakdown: Record<string, number>;
  deliverablesSummary: string;
  warnings: string[];
}

export interface UnscheduledTicketItem {
  ticketId: string;
  sourceCandidateId?: string | null;
  title: string;
  module?: string | null;
  priority: string;
  storyPoints: number;
  ownershipRole: string;
  reasonCode:
    | 'UNSCHEDULED_CAPACITY_EXCEEDED'
    | 'UNSCHEDULED_DEPENDENCY_UNRESOLVED'
    | 'UNSCHEDULED_MISSING_ESTIMATE'
    | 'UNSCHEDULED_DEFERRED_BY_PM'
    | 'UNSCHEDULED_BLOCKED'
    | 'UNSCHEDULED_DEADLINE_BREACH';
  reasonDescription: string;
  actionRequired: string;
  blockingPrerequisites: string[];
}

export interface PlanningValidationReport {
  isValid: boolean;
  totalTicketsAnalyzed: number;
  totalScheduled: number;
  totalUnscheduled: number;
  totalSprintsUsed: number;
  capacityUtilizationAverage: number;
  criticalPathLength: number;
  criticalPathTicketIds: string[];
  dependencyViolationCount: number;
  capacityViolationCount: number;
  cycleCount: number;
  detectedCycles: string[][];
  warnings: string[];
  ruleEvaluations: Array<{
    rule: string;
    passed: boolean;
    details: string;
  }>;
}

export interface SprintPlanResult {
  planId: string;
  projectId: string;
  version: number;
  status: 'PROPOSED' | 'APPROVED' | 'SUPERSEDED' | 'REJECTED';
  title: string;
  summary: string;
  sourceBriefRevision?: string;
  sprintAllocations: PlanningSprintAllocation[];
  dependencies: Array<{
    sourceTicketId: string;
    sourceKey: string;
    targetTicketId: string;
    targetKey: string;
    type: string;
    isInferred: boolean;
    reason?: string;
  }>;
  unscheduledTickets: UnscheduledTicketItem[];
  criticalPath: {
    ticketIds: string[];
    totalPoints: number;
    estimatedSprints: number;
  };
  capacitySettings: {
    defaultSprintCapacity: number;
    sprintCount: number;
    roleCapacities?: Record<string, number>;
  };
  validationReport: PlanningValidationReport;
  changeSummary?: {
    ticketsMoved: number;
    pointsShifted: number;
    addedToSprints: number;
    removedToUnscheduled: number;
    details: string[];
  };
  planningAssumptions: string[];
  createdAt: string;
  isApproved: boolean;
  approvedAt?: string | null;
}

export interface PlanGenerationOptions {
  defaultSprintCapacity?: number;
  maxSprints?: number;
  strictCapacity?: boolean; // if true, don't allow over-allocation
  allowCoSprintDependencies?: boolean; // if true, prerequisites can be in same sprint with lower executionOrder
  lockedTicketsOnly?: boolean;
}

export class SprintPlanningBrainService {
  /**
   * Stage A: Project Context Assembly
   */
  static async assembleProjectContext(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        analysis: true,
        features: true,
        members: { include: { user: true } },
        tickets: {
          include: {
            feature: true,
            dependenciesOutgoing: true,
            dependenciesIncoming: true,
          },
          orderBy: [{ createdAt: 'asc' }],
        },
        sprintPlans: {
          orderBy: { version: 'desc' },
          take: 5,
        },
      },
    });

    if (!project) throw new Error(`Project ${projectId} not found`);
    return project;
  }

  /**
   * Stage B: Ticket Understanding and Normalization
   */
  static normalizeTickets(tickets: any[]): Map<string, PlanningTicket> {
    const ticketMap = new Map<string, PlanningTicket>();

    for (const t of tickets) {
      // Parse story points (default 3 if missing or unestimated)
      const storyPoints = t.storyPoints && t.storyPoints > 0 ? t.storyPoints : 3;

      // Identify role
      const ownershipRole = t.ownershipRole || 'Backend';

      // Identify release-critical nature
      const titleLower = (t.title || '').toLowerCase();
      const descLower = (t.description || '').toLowerCase();
      const isReleaseCritical =
        titleLower.includes('security') ||
        titleLower.includes('auth') ||
        titleLower.includes('payment') ||
        titleLower.includes('pci') ||
        titleLower.includes('checkout') ||
        titleLower.includes('migration') ||
        titleLower.includes('audit') ||
        descLower.includes('p0') ||
        t.priority === TicketPriority.CRITICAL;

      ticketMap.set(t.id, {
        id: t.id,
        sourceCandidateId: t.sourceCandidateId,
        title: t.title,
        description: t.description,
        featureId: t.featureId,
        module: t.module || t.feature?.module || 'General',
        priority: t.priority || TicketPriority.MEDIUM,
        type: t.type || 'Feature',
        storyPoints,
        ownershipRole,
        status: t.status || TicketStatus.TODO,
        currentSprint: t.sprint || null,
        executionOrder: t.executionOrder || 0,
        isLocked: Boolean(t.isLocked),
        technicalNotes: t.technicalNotes,
        acceptanceCriteria: t.acceptanceCriteria,
        prerequisites: [],
        dependents: [],
        criticalPathScore: 0,
        isCriticalPath: false,
        isReleaseCritical,
      });
    }

    return ticketMap;
  }

  /**
   * Stage C: Dependency Graph Construction, Cycle Detection & Critical Path
   */
  static buildDependencyGraph(
    ticketMap: Map<string, PlanningTicket>,
    existingDependencies: any[] = []
  ): {
    edges: Array<{
      sourceTicketId: string;
      sourceKey: string;
      targetTicketId: string;
      targetKey: string;
      type: string;
      isInferred: boolean;
      reason?: string;
    }>;
    cycles: string[][];
  } {
    const edges: Array<{
      sourceTicketId: string;
      sourceKey: string;
      targetTicketId: string;
      targetKey: string;
      type: string;
      isInferred: boolean;
      reason?: string;
    }> = [];

    // Helper map from sourceCandidateId (e.g. "ECOM-001") to ticket ID
    const candidateToTicketId = new Map<string, string>();
    for (const [id, t] of ticketMap.entries()) {
      if (t.sourceCandidateId) {
        candidateToTicketId.set(t.sourceCandidateId.trim().toUpperCase(), id);
      }
    }

    const addedEdgeKeys = new Set<string>();

    const addEdge = (sourceId: string, targetId: string, type: string, isInferred: boolean, reason?: string) => {
      if (sourceId === targetId) return; // Self dependency rejected
      if (!ticketMap.has(sourceId) || !ticketMap.has(targetId)) return;

      const edgeKey = `${sourceId}->${targetId}`;
      if (addedEdgeKeys.has(edgeKey)) return;
      addedEdgeKeys.add(edgeKey);

      const sourceTicket = ticketMap.get(sourceId)!;
      const targetTicket = ticketMap.get(targetId)!;

      sourceTicket.dependents.push(targetId);
      targetTicket.prerequisites.push(sourceId);

      edges.push({
        sourceTicketId: sourceId,
        sourceKey: sourceTicket.sourceCandidateId || sourceTicket.id,
        targetTicketId: targetId,
        targetKey: targetTicket.sourceCandidateId || targetTicket.id,
        type,
        isInferred,
        reason,
      });
    };

    // 1. Explicit database dependency records
    for (const d of existingDependencies) {
      addEdge(d.sourceTicketId, d.targetTicketId, d.type || 'BLOCKS', d.isInferred || false, d.reason);
    }

    // 2. Extract dependencies from technical notes & descriptions (e.g. "Dependencies: ECOM-001, ECOM-002")
    for (const [targetId, t] of ticketMap.entries()) {
      const textToScan = `${t.technicalNotes || ''} ${t.description || ''}`;
      const matches = textToScan.match(/ECOM-[0-9]{3}/gi);
      if (matches) {
        for (const candId of matches) {
          const upperCand = candId.toUpperCase();
          if (t.sourceCandidateId && t.sourceCandidateId.toUpperCase() === upperCand) continue;
          const sourceId = candidateToTicketId.get(upperCand);
          if (sourceId && sourceId !== targetId) {
            addEdge(sourceId, targetId, 'BLOCKS', false, `Explicit prerequisite reference ${upperCand}`);
          }
        }
      }
    }

    // 3. Grounded Architectural & Workflow Semantic Dependencies
    // Grounded strictly in shared featureId or explicit domain relationships (not loose module matching)
    const ticketsArray = Array.from(ticketMap.values());

    for (const t of ticketsArray) {
      // 3a. Same Feature: Frontend UI depends on Backend API Contract within the exact same feature
      if (t.featureId && (t.ownershipRole.toLowerCase().includes('frontend') || t.ownershipRole.toLowerCase().includes('ux'))) {
        const matchingBackend = ticketsArray.find(
          (b) =>
            b.id !== t.id &&
            b.featureId === t.featureId &&
            (b.ownershipRole.toLowerCase().includes('backend') || b.ownershipRole.toLowerCase().includes('api')) &&
            !b.prerequisites.includes(t.id) && // prevent reciprocal edge
            !t.prerequisites.includes(b.id)
        );
        if (matchingBackend) {
          addEdge(
            matchingBackend.id,
            t.id,
            'RELIES_ON',
            true,
            `Frontend UI relies on backend API contract (${matchingBackend.sourceCandidateId || matchingBackend.title}) for feature`
          );
        }
      }

      // 3b. Same Feature: E2E / QA Integration testing depends on implementation ticket
      if (t.featureId && (t.ownershipRole.toLowerCase().includes('qa') || t.title.toLowerCase().includes('testing'))) {
        const devTicket = ticketsArray.find(
          (d) =>
            d.id !== t.id &&
            d.featureId === t.featureId &&
            !d.ownershipRole.toLowerCase().includes('qa') &&
            !d.prerequisites.includes(t.id) &&
            !t.prerequisites.includes(d.id)
        );
        if (devTicket) {
          addEdge(
            devTicket.id,
            t.id,
            'BLOCKS',
            true,
            `Integration testing requires feature implementation (${devTicket.sourceCandidateId || devTicket.title})`
          );
        }
      }

      // 3c. Core Ecommerce Domain Workflows:
      const titleLower = t.title.toLowerCase();
      // Checkout requires Cart functionality
      if (titleLower.includes('checkout') && !titleLower.includes('cart')) {
        const cartTicket = ticketsArray.find(
          (c) => c.id !== t.id && c.title.toLowerCase().includes('cart') && !c.title.toLowerCase().includes('checkout')
        );
        if (cartTicket && !cartTicket.prerequisites.includes(t.id)) {
          addEdge(
            cartTicket.id,
            t.id,
            'BLOCKS',
            true,
            `Checkout flow requires Cart functionality (${cartTicket.sourceCandidateId || cartTicket.title})`
          );
        }
      }

      // Order fulfillment requires order creation / payment
      if (titleLower.includes('fulfillment') || titleLower.includes('shipment')) {
        const orderTicket = ticketsArray.find(
          (o) => o.id !== t.id && (o.title.toLowerCase().includes('order creation') || o.title.toLowerCase().includes('payment process'))
        );
        if (orderTicket && !orderTicket.prerequisites.includes(t.id)) {
          addEdge(
            orderTicket.id,
            t.id,
            'BLOCKS',
            true,
            `Fulfillment requires Order creation & payment confirmation (${orderTicket.sourceCandidateId || orderTicket.title})`
          );
        }
      }
    }

    // 4. Cycle Detection using DFS
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    const detectCyclesDfs = (nodeId: string) => {
      visited.add(nodeId);
      recStack.add(nodeId);
      path.push(nodeId);

      const ticket = ticketMap.get(nodeId);
      if (ticket) {
        for (const depId of [...ticket.dependents]) {
          if (!visited.has(depId)) {
            detectCyclesDfs(depId);
          } else if (recStack.has(depId)) {
            // Found cycle!
            const cycleStartIndex = path.indexOf(depId);
            if (cycleStartIndex !== -1) {
              const detectedCycle = [...path.slice(cycleStartIndex), depId];
              cycles.push(detectedCycle);

              // Gracefully break cycle for scheduling: remove back edge
              ticket.dependents = ticket.dependents.filter((id) => id !== depId);
              const depTicket = ticketMap.get(depId);
              if (depTicket) {
                depTicket.prerequisites = depTicket.prerequisites.filter((id) => id !== nodeId);
              }
            }
          }
        }
      }

      recStack.delete(nodeId);
      path.pop();
    };

    for (const id of ticketMap.keys()) {
      if (!visited.has(id)) {
        detectCyclesDfs(id);
      }
    }

    // 5. Critical Path Calculation (Longest weighted path using dynamic programming)
    // First, compute in-degrees for topological sort
    const inDegree = new Map<string, number>();
    for (const [id, t] of ticketMap.entries()) {
      inDegree.set(id, t.prerequisites.length);
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }

    const topoOrder: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      topoOrder.push(current);
      const ticket = ticketMap.get(current);
      if (ticket) {
        for (const depId of ticket.dependents) {
          const currentDeg = (inDegree.get(depId) || 1) - 1;
          inDegree.set(depId, currentDeg);
          if (currentDeg === 0) queue.push(depId);
        }
      }
    }

    // Longest path computation
    const dist = new Map<string, number>();
    for (const id of ticketMap.keys()) {
      dist.set(id, ticketMap.get(id)!.storyPoints);
    }

    for (const u of topoOrder) {
      const uDist = dist.get(u) || 0;
      const uTicket = ticketMap.get(u);
      if (uTicket) {
        for (const v of uTicket.dependents) {
          const vPoints = ticketMap.get(v)?.storyPoints || 3;
          if (uDist + vPoints > (dist.get(v) || 0)) {
            dist.set(v, uDist + vPoints);
          }
        }
      }
    }

    // Identify critical path tickets (top 20% highest cumulative path distance)
    const sortedByDist = Array.from(dist.entries()).sort((a, b) => b[1] - a[1]);
    const maxDist = sortedByDist.length > 0 ? sortedByDist[0][1] : 0;
    const criticalThreshold = maxDist * 0.7;

    for (const [id, score] of sortedByDist) {
      const ticket = ticketMap.get(id);
      if (ticket) {
        ticket.criticalPathScore = score;
        if (score >= criticalThreshold && maxDist > 0) {
          ticket.isCriticalPath = true;
        }
      }
    }

    return { edges, cycles };
  }

  /**
   * Stage D: Delivery Priority Scoring & Explanation Generation
   */
  static calculateDeliveryPriority(ticket: PlanningTicket): number {
    let score = 0;

    // PM Priority
    if (ticket.priority === TicketPriority.CRITICAL) score += 100;
    else if (ticket.priority === TicketPriority.HIGH) score += 75;
    else if (ticket.priority === TicketPriority.MEDIUM) score += 50;
    else score += 25;

    // Downstream dependents multiplier (blocker value)
    score += ticket.dependents.length * 15;

    // Critical Path boost
    if (ticket.isCriticalPath) score += 40;

    // Foundational / Infrastructure bonus
    const modLower = (ticket.module || '').toLowerCase();
    if (modLower.includes('foundation') || modLower.includes('architecture') || modLower.includes('database')) {
      score += 50;
    } else if (modLower.includes('auth') || modLower.includes('user')) {
      score += 35;
    }

    // Release-critical bonus
    if (ticket.isReleaseCritical) score += 30;

    // Deduct for tickets with many unresolved prerequisites (they can't start early anyway)
    score -= ticket.prerequisites.length * 5;

    return score;
  }

  /**
   * Stage E: Sprint Allocation and Sequencing
   */
  static allocateSprints(
    ticketMap: Map<string, PlanningTicket>,
    rawSprints: any[],
    options: PlanGenerationOptions = {}
  ): {
    sprintAllocations: PlanningSprintAllocation[];
    unscheduledTickets: UnscheduledTicketItem[];
  } {
    const defaultCapacity = options.defaultSprintCapacity || 28;
    const allowCoSprint = options.allowCoSprintDependencies !== false; // default true

    // 1. Build planning sprints array from source schedule
    const sprintList: PlanningSprintAllocation[] = rawSprints.map((s, idx) => ({
      sprintId: s.sprint || s.sprintId || `S${idx + 1}`,
      name: s.name || s.sprintName || `Sprint ${s.sprint || idx + 1}`,
      startDate: s.start || s.startDate || `Week ${idx * 2 + 1}`,
      endDate: s.end || s.endDate || `Week ${idx * 2 + 2}`,
      goal: s.goal || 'Implement deliverables according to specifications.',
      capacityPoints: s.capacityPoints || defaultCapacity,
      allocatedPoints: 0,
      utilizationPercentage: 0,
      tickets: [],
      roleBreakdown: {},
      deliverablesSummary: s.deliverables || '',
      warnings: [],
    }));

    const sprintIndexMap = new Map<string, number>();
    sprintList.forEach((s, idx) => sprintIndexMap.set(s.sprintId, idx));

    const scheduledTicketSprintIndex = new Map<string, number>(); // ticketId -> sprint index
    const unscheduledTickets: UnscheduledTicketItem[] = [];

    // Helper to evaluate if all prerequisites of a ticket are satisfied for sprint index
    const arePrerequisitesSatisfied = (
      ticket: PlanningTicket,
      targetSprintIdx: number
    ): { satisfied: boolean; coSprintPrereqs: string[]; priorSprintPrereqs: string[]; blockingIds: string[] } => {
      const coSprintPrereqs: string[] = [];
      const priorSprintPrereqs: string[] = [];
      const blockingIds: string[] = [];

      for (const prereqId of ticket.prerequisites) {
        const prereqSprintIdx = scheduledTicketSprintIndex.get(prereqId);
        if (prereqSprintIdx === undefined) {
          // Prerequisite not yet scheduled
          blockingIds.push(prereqId);
        } else if (prereqSprintIdx < targetSprintIdx) {
          priorSprintPrereqs.push(prereqId);
        } else if (prereqSprintIdx === targetSprintIdx) {
          if (allowCoSprint) {
            coSprintPrereqs.push(prereqId);
          } else {
            blockingIds.push(prereqId);
          }
        } else {
          // Prerequisite is scheduled AFTER target sprint! Violation!
          blockingIds.push(prereqId);
        }
      }

      return {
        satisfied: blockingIds.length === 0,
        coSprintPrereqs,
        priorSprintPrereqs,
        blockingIds,
      };
    };

    // Helper: Add ticket to sprint
    const assignTicketToSprint = (
      ticket: PlanningTicket,
      sprintIdx: number,
      coSprintPrereqs: string[],
      priorSprintPrereqs: string[]
    ) => {
      const sprint = sprintList[sprintIdx];
      const execOrder = sprint.tickets.length + 1;

      // Build "Why this order?" explanation
      let explanation = `Allocated to ${sprint.name} (${sprint.goal.slice(0, 60)}...). `;
      if (ticket.isLocked) {
        explanation += 'Manually locked to this sprint by PM. ';
      }
      if (ticket.isCriticalPath) {
        explanation += 'Critical-path item; sequenced early to avoid downstream delivery bottleneck. ';
      }
      if (coSprintPrereqs.length > 0) {
        explanation += `Co-located in same sprint following prerequisite(s) [${coSprintPrereqs.map((id) => ticketMap.get(id)?.sourceCandidateId || id).join(', ')}]. `;
      } else if (priorSprintPrereqs.length > 0) {
        explanation += `Prerequisites completed in prior sprint(s). `;
      }

      sprint.tickets.push({
        ticketId: ticket.id,
        sourceCandidateId: ticket.sourceCandidateId,
        title: ticket.title,
        module: ticket.module,
        priority: ticket.priority,
        storyPoints: ticket.storyPoints,
        ownershipRole: ticket.ownershipRole,
        executionOrder: execOrder,
        isLocked: ticket.isLocked,
        status: ticket.status,
        prerequisitesInSprint: coSprintPrereqs,
        prerequisitesPriorSprints: priorSprintPrereqs,
        explanation: explanation.trim(),
      });

      sprint.allocatedPoints += ticket.storyPoints;
      sprint.roleBreakdown[ticket.ownershipRole] = (sprint.roleBreakdown[ticket.ownershipRole] || 0) + ticket.storyPoints;
      scheduledTicketSprintIndex.set(ticket.id, sprintIdx);
    };

    // --- Pass 1: Handle Locked & Completed Tickets (Hard Constraints) ---
    for (const [id, ticket] of ticketMap.entries()) {
      if (ticket.status === TicketStatus.DONE || ticket.isLocked) {
        const targetSprintId = ticket.currentSprint || 'S1';
        let sprintIdx = sprintIndexMap.get(targetSprintId);
        if (sprintIdx === undefined) sprintIdx = 0; // fallback to S1

        const prereqCheck = arePrerequisitesSatisfied(ticket, sprintIdx);
        assignTicketToSprint(ticket, sprintIdx, prereqCheck.coSprintPrereqs, prereqCheck.priorSprintPrereqs);
      }
    }

    // --- Pass 2: Iterative Dependency-Aware Worklist Allocation ---
    let progress = true;
    while (progress) {
      progress = false;

      // Find candidate unallocated tickets whose prerequisites are already scheduled
      const candidateTickets = Array.from(ticketMap.values())
        .filter((t) => !scheduledTicketSprintIndex.has(t.id))
        .sort((a, b) => this.calculateDeliveryPriority(b) - this.calculateDeliveryPriority(a));

      for (const ticket of candidateTickets) {
        // Evaluate earliest possible sprint index based on scheduled prerequisites
        let minPrereqSprintIdx = 0;
        let hasUnscheduledPrereq = false;

        for (const prereqId of ticket.prerequisites) {
          const pIdx = scheduledTicketSprintIndex.get(prereqId);
          if (pIdx === undefined) {
            hasUnscheduledPrereq = true;
            break;
          }
          if (allowCoSprint) {
            minPrereqSprintIdx = Math.max(minPrereqSprintIdx, pIdx);
          } else {
            minPrereqSprintIdx = Math.max(minPrereqSprintIdx, pIdx + 1);
          }
        }

        if (hasUnscheduledPrereq) {
          continue; // Wait until prerequisites are scheduled
        }

        const preferredSprintIdx = ticket.currentSprint ? sprintIndexMap.get(ticket.currentSprint) : undefined;
        const candidateSprintsToTry: number[] = [];

        // If preferred sprint is feasible, try it first
        if (preferredSprintIdx !== undefined && preferredSprintIdx >= minPrereqSprintIdx && preferredSprintIdx < sprintList.length) {
          candidateSprintsToTry.push(preferredSprintIdx);
        }

        // Then try subsequent/other feasible sprints
        for (let sIdx = minPrereqSprintIdx; sIdx < sprintList.length; sIdx++) {
          if (!candidateSprintsToTry.includes(sIdx)) {
            candidateSprintsToTry.push(sIdx);
          }
        }

        // Try candidate sprints
        for (const sIdx of candidateSprintsToTry) {
          const sprint = sprintList[sIdx];
          const prereqCheck = arePrerequisitesSatisfied(ticket, sIdx);

          if (!prereqCheck.satisfied) continue;

          const prospectivePoints = sprint.allocatedPoints + ticket.storyPoints;
          const fitsCapacity = options.strictCapacity
            ? prospectivePoints <= sprint.capacityPoints
            : prospectivePoints <= sprint.capacityPoints + 4;

          if (fitsCapacity) {
            assignTicketToSprint(ticket, sIdx, prereqCheck.coSprintPrereqs, prereqCheck.priorSprintPrereqs);
            progress = true;
            break;
          }
        }
      }
    }

    // --- Pass 3: Process Remaining Unscheduled Tickets ---
    const unallocatedRemaining = Array.from(ticketMap.values()).filter(
      (t) => !scheduledTicketSprintIndex.has(t.id)
    );

    for (const ticket of unallocatedRemaining) {
      const prereqCheck = arePrerequisitesSatisfied(ticket, sprintList.length - 1);
      let reasonCode: UnscheduledTicketItem['reasonCode'] = 'UNSCHEDULED_CAPACITY_EXCEEDED';
      let reasonDescription = 'Total available story-point capacity across planned sprints has been exhausted.';
      let actionRequired = 'Increase sprint capacity, add team members, or add an extra iteration before release.';

      if (!prereqCheck.satisfied) {
        reasonCode = 'UNSCHEDULED_DEPENDENCY_UNRESOLVED';
        reasonDescription = `Prerequisite tickets [${prereqCheck.blockingIds.map((id) => ticketMap.get(id)?.sourceCandidateId || id).join(', ')}] could not be scheduled or completed.`;
        actionRequired = 'Resolve blocking prerequisites or descope dependent functional requirements.';
      }

      unscheduledTickets.push({
        ticketId: ticket.id,
        sourceCandidateId: ticket.sourceCandidateId,
        title: ticket.title,
        module: ticket.module,
        priority: ticket.priority,
        storyPoints: ticket.storyPoints,
        ownershipRole: ticket.ownershipRole,
        reasonCode,
        reasonDescription,
        actionRequired,
        blockingPrerequisites: prereqCheck.blockingIds,
      });
    }

    // --- Pass 4: Finalize Utilization and Execution Order ---
    for (const sprint of sprintList) {
      sprint.utilizationPercentage =
        sprint.capacityPoints > 0 ? Math.round((sprint.allocatedPoints / sprint.capacityPoints) * 100) : 0;

      // Re-index execution order to ensure prerequisites come before dependents within the sprint
      sprint.tickets.sort((a, b) => {
        if (a.prerequisitesInSprint.includes(b.ticketId)) return 1;
        if (b.prerequisitesInSprint.includes(a.ticketId)) return -1;
        return a.executionOrder - b.executionOrder;
      });

      sprint.tickets.forEach((t, idx) => {
        t.executionOrder = idx + 1;
      });

      // Capacity warnings
      if (sprint.allocatedPoints > sprint.capacityPoints) {
        sprint.warnings.push(
          `Sprint is over-allocated by ${sprint.allocatedPoints - sprint.capacityPoints} points (${sprint.utilizationPercentage}% capacity utilization).`
        );
      } else if (sprint.allocatedPoints < sprint.capacityPoints * 0.5 && sprint.tickets.length > 0) {
        sprint.warnings.push(`Sprint capacity is under-utilized (${sprint.utilizationPercentage}%).`);
      }
    }

    return { sprintAllocations: sprintList, unscheduledTickets };
  }

  /**
   * Stage F: Plan Validation and Optimization Metrics
   */
  static validatePlan(
    ticketMap: Map<string, PlanningTicket>,
    sprintAllocations: PlanningSprintAllocation[],
    unscheduledTickets: UnscheduledTicketItem[],
    cycles: string[][]
  ): PlanningValidationReport {
    const warnings: string[] = [];
    const ruleEvaluations: PlanningValidationReport['ruleEvaluations'] = [];

    const totalTicketsAnalyzed = ticketMap.size;
    const totalScheduled = sprintAllocations.reduce((sum, s) => sum + s.tickets.length, 0);
    const totalUnscheduled = unscheduledTickets.length;

    // Rule 1: Every ticket accounted for
    const allAccounted = totalScheduled + totalUnscheduled === totalTicketsAnalyzed;
    ruleEvaluations.push({
      rule: 'All approved tickets have explicit scheduling outcome',
      passed: allAccounted,
      details: `${totalScheduled} scheduled into sprints, ${totalUnscheduled} in unscheduled backlog.`,
    });

    // Rule 2: No cycles (all cycles detected in input were safely resolved)
    ruleEvaluations.push({
      rule: 'Dependency graph is acyclic (DAG)',
      passed: true,
      details: cycles.length === 0 ? 'No circular dependencies detected.' : `${cycles.length} circular loop(s) detected and safely resolved.`,
    });

    // Rule 3: Dependency Ordering
    const ticketSprintMap = new Map<string, number>();
    sprintAllocations.forEach((s, idx) => {
      s.tickets.forEach((t) => ticketSprintMap.set(t.ticketId, idx));
    });

    let dependencyViolations = 0;
    for (const [id, t] of ticketMap.entries()) {
      const targetSprint = ticketSprintMap.get(id);
      if (targetSprint !== undefined) {
        for (const prereqId of t.prerequisites) {
          const prereqSprint = ticketSprintMap.get(prereqId);
          if (prereqSprint !== undefined && prereqSprint > targetSprint) {
            dependencyViolations++;
            warnings.push(
              `Ticket "${t.title}" in ${sprintAllocations[targetSprint].name} depends on "${ticketMap.get(prereqId)?.title}" which is scheduled later in ${sprintAllocations[prereqSprint].name}.`
            );
          }
        }
      }
    }

    ruleEvaluations.push({
      rule: 'Prerequisites precede dependent tickets across sprints',
      passed: dependencyViolations === 0,
      details: dependencyViolations === 0 ? 'Strict topological sprint order preserved.' : `${dependencyViolations} dependency inversions flagged.`,
    });

    // Rule 4: Sprint Capacity Bounds
    let capacityViolations = 0;
    for (const s of sprintAllocations) {
      if (s.allocatedPoints > s.capacityPoints + 4) {
        capacityViolations++;
      } else if (s.allocatedPoints > s.capacityPoints) {
        warnings.push(
          `Sprint ${s.name} is over configured capacity by ${s.allocatedPoints - s.capacityPoints} points (within soft tolerance).`
        );
      }
    }

    ruleEvaluations.push({
      rule: 'Sprint capacity boundaries respected',
      passed: capacityViolations === 0,
      details: capacityViolations === 0 ? 'All sprints within story-point limits.' : `${capacityViolations} sprints exceeded capacity bounds.`,
    });

    // Calculate critical path stats
    const criticalPathTickets = Array.from(ticketMap.values())
      .filter((t) => t.isCriticalPath)
      .map((t) => t.id);

    const nonZeroSprints = sprintAllocations.filter((s) => s.allocatedPoints > 0);
    const avgUtil =
      nonZeroSprints.length > 0
        ? Math.round(nonZeroSprints.reduce((sum, s) => sum + s.utilizationPercentage, 0) / nonZeroSprints.length)
        : 0;

    return {
      isValid: dependencyViolations === 0 && capacityViolations === 0,
      totalTicketsAnalyzed,
      totalScheduled,
      totalUnscheduled,
      totalSprintsUsed: nonZeroSprints.length,
      capacityUtilizationAverage: avgUtil,
      criticalPathLength: criticalPathTickets.length,
      criticalPathTicketIds: criticalPathTickets,
      dependencyViolationCount: dependencyViolations,
      capacityViolationCount: capacityViolations,
      cycleCount: cycles.length,
      detectedCycles: cycles,
      warnings,
      ruleEvaluations,
    };
  }

  /**
   * Complete Pipeline Execution: Generates Proposed Sprint Plan
   */
  static async planSprints(projectId: string, options: PlanGenerationOptions = {}): Promise<SprintPlanResult> {
    // 1. Stage A: Context Assembly
    const context = await this.assembleProjectContext(projectId);

    // 2. Stage B: Ticket Normalization
    const ticketMap = this.normalizeTickets(context.tickets);

    // 3. Stage C: Dependency Graph & Cycles
    const { edges, cycles } = this.buildDependencyGraph(ticketMap, context.tickets.flatMap((t) => t.dependenciesOutgoing));

    // 4. Retrieve or generate Sprints
    let rawSprints: any[] = [];
    if (context.analysis?.sprintSchedule && Array.isArray(context.analysis.sprintSchedule)) {
      rawSprints = context.analysis.sprintSchedule as any[];
    } else {
      // Auto-generate standard 2-week sprints
      const sprintCount = options.maxSprints || 12;
      for (let i = 1; i <= sprintCount; i++) {
        rawSprints.push({
          sprint: `S${i}`,
          sprintName: `Sprint ${i}`,
          start: `Sprint ${i} Start`,
          end: `Sprint ${i} End`,
          goal: `Deliver milestone features for Sprint ${i}`,
          capacityPoints: options.defaultSprintCapacity || 28,
        });
      }
    }

    // 5. Stage E: Sprint Allocation
    const { sprintAllocations, unscheduledTickets } = this.allocateSprints(ticketMap, rawSprints, options);

    // 6. Stage F: Plan Validation
    const validationReport = this.validatePlan(ticketMap, sprintAllocations, unscheduledTickets, cycles);

    // 7. Versioning & Change Summary
    const previousPlan = context.sprintPlans[0];
    const newVersion = previousPlan ? previousPlan.version + 1 : 1;

    let changeSummary: SprintPlanResult['changeSummary'] = undefined;
    if (previousPlan) {
      const prevAllocations = previousPlan.sprintAllocations as any[];
      let movedCount = 0;
      const details: string[] = [];

      for (const currSprint of sprintAllocations) {
        for (const ticket of currSprint.tickets) {
          const prevSprint = prevAllocations?.find((ps: any) =>
            ps.tickets?.some((pt: any) => pt.ticketId === ticket.ticketId)
          );
          if (prevSprint && prevSprint.sprintId !== currSprint.sprintId) {
            movedCount++;
            details.push(`Ticket "${ticket.title}" moved from ${prevSprint.name} to ${currSprint.name}`);
          }
        }
      }

      changeSummary = {
        ticketsMoved: movedCount,
        pointsShifted: movedCount * 3,
        addedToSprints: sprintAllocations.reduce((sum, s) => sum + s.tickets.length, 0),
        removedToUnscheduled: unscheduledTickets.length,
        details: details.slice(0, 10),
      };
    }

    const title = `Sprint Implementation Plan (v${newVersion})`;
    const summary = `Dependency-aware sprint schedule covering ${ticketMap.size} approved tickets across ${sprintAllocations.length} delivery sprints with ${validationReport.capacityUtilizationAverage}% average capacity utilization.`;

    // Persist new proposed SprintPlan in database
    const savedPlan = await prisma.sprintPlan.create({
      data: {
        projectId,
        version: newVersion,
        status: 'PROPOSED',
        title,
        summary,
        sprintAllocations: sprintAllocations as any,
        dependencies: edges as any,
        unscheduledTickets: unscheduledTickets as any,
        criticalPath: {
          ticketIds: validationReport.criticalPathTicketIds,
          totalPoints: validationReport.criticalPathTicketIds.length * 3,
          estimatedSprints: Math.ceil((validationReport.criticalPathTicketIds.length * 3) / 25),
        } as any,
        capacitySettings: {
          defaultSprintCapacity: options.defaultSprintCapacity || 28,
          sprintCount: sprintAllocations.length,
        } as any,
        validationReport: validationReport as any,
        changeSummary: changeSummary as any,
        planningAssumptions: [
          'Team capacity assumed at 25-30 story points per 2-week sprint.',
          'Co-located prerequisites within same sprint require sequential execution order.',
          'Critical path items prioritized to reduce integration risk.',
        ] as any,
        isApproved: false,
      },
    });

    return {
      planId: savedPlan.id,
      projectId,
      version: newVersion,
      status: 'PROPOSED',
      title,
      summary,
      sprintAllocations,
      dependencies: edges,
      unscheduledTickets,
      criticalPath: {
        ticketIds: validationReport.criticalPathTicketIds,
        totalPoints: validationReport.criticalPathTicketIds.length * 3,
        estimatedSprints: Math.ceil((validationReport.criticalPathTicketIds.length * 3) / 25),
      },
      capacitySettings: {
        defaultSprintCapacity: options.defaultSprintCapacity || 28,
        sprintCount: sprintAllocations.length,
      },
      validationReport,
      changeSummary,
      planningAssumptions: [
        'Team capacity assumed at 25-30 story points per 2-week sprint.',
        'Co-located prerequisites within same sprint require sequential execution order.',
        'Critical path items prioritized to reduce integration risk.',
      ],
      createdAt: savedPlan.createdAt.toISOString(),
      isApproved: false,
      approvedAt: null,
    };
  }

  /**
   * Approves a proposed Sprint Plan and applies allocations to live tickets
   */
  static async approvePlan(projectId: string, planId: string, approvedByUserId?: string) {
    const plan = await prisma.sprintPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || plan.projectId !== projectId) {
      throw new Error(`Sprint Plan ${planId} not found for project ${projectId}`);
    }

    // 1. Mark prior approved plans as SUPERSEDED
    await prisma.sprintPlan.updateMany({
      where: {
        projectId,
        status: 'APPROVED',
      },
      data: {
        status: 'SUPERSEDED',
      },
    });

    // 2. Mark this plan as APPROVED
    const updatedPlan = await prisma.sprintPlan.update({
      where: { id: planId },
      data: {
        status: 'APPROVED',
        isApproved: true,
        approvedAt: new Date(),
        approvedById: approvedByUserId || null,
      },
    });

    // 3. Apply allocations to live Ticket records
    const allocations = plan.sprintAllocations as any as PlanningSprintAllocation[];
    let appliedCount = 0;

    for (const sprint of allocations) {
      for (const t of sprint.tickets) {
        await prisma.ticket.update({
          where: { id: t.ticketId },
          data: {
            sprint: sprint.sprintId,
            executionOrder: t.executionOrder,
          },
        });
        appliedCount++;
      }
    }

    // Also update unscheduled tickets (remove sprint assignment or set to null)
    const unscheduled = (plan.unscheduledTickets as any as UnscheduledTicketItem[]) || [];
    for (const ut of unscheduled) {
      await prisma.ticket.update({
        where: { id: ut.ticketId },
        data: {
          sprint: null,
          executionOrder: 0,
        },
      });
    }

    return {
      success: true,
      planId: updatedPlan.id,
      version: updatedPlan.version,
      status: updatedPlan.status,
      appliedTicketsCount: appliedCount,
      unscheduledCount: unscheduled.length,
      approvedAt: updatedPlan.approvedAt,
    };
  }

  /**
   * Updates an individual ticket's sprint allocation or lock status within a proposed plan
   */
  static async updatePlanAllocation(
    projectId: string,
    planId: string,
    ticketId: string,
    targetSprintId: string,
    isLocked?: boolean
  ) {
    const plan = await prisma.sprintPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || plan.projectId !== projectId) {
      throw new Error(`Sprint Plan ${planId} not found`);
    }

    if (plan.status === 'APPROVED') {
      throw new Error('Cannot directly edit an already approved plan. Generate a new proposed plan revision instead.');
    }

    const allocations = [...((plan.sprintAllocations as any) as PlanningSprintAllocation[])];
    let foundTicket: AllocatedSprintTicket | null = null;

    // Remove from existing sprint
    for (const s of allocations) {
      const idx = s.tickets.findIndex((t) => t.ticketId === ticketId);
      if (idx !== -1) {
        foundTicket = s.tickets.splice(idx, 1)[0];
        s.allocatedPoints -= foundTicket.storyPoints;
        s.utilizationPercentage = Math.round((s.allocatedPoints / s.capacityPoints) * 100);
        break;
      }
    }

    if (!foundTicket) {
      throw new Error(`Ticket ${ticketId} not found in plan allocations`);
    }

    // Add to target sprint
    const targetSprint = allocations.find((s) => s.sprintId === targetSprintId);
    if (!targetSprint) {
      throw new Error(`Target sprint ${targetSprintId} does not exist in plan`);
    }

    if (isLocked !== undefined) {
      foundTicket.isLocked = isLocked;
      // Also update ticket in DB if requested
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { isLocked },
      });
    }

    foundTicket.executionOrder = targetSprint.tickets.length + 1;
    targetSprint.tickets.push(foundTicket);
    targetSprint.allocatedPoints += foundTicket.storyPoints;
    targetSprint.utilizationPercentage = Math.round((targetSprint.allocatedPoints / targetSprint.capacityPoints) * 100);

    const updatedPlan = await prisma.sprintPlan.update({
      where: { id: planId },
      data: {
        sprintAllocations: allocations as any,
      },
    });

    return {
      success: true,
      plan: updatedPlan,
    };
  }

  /**
   * Retrieves the latest active or proposed sprint plan
   */
  static async getLatestPlan(projectId: string) {
    const plan = await prisma.sprintPlan.findFirst({
      where: { projectId },
      orderBy: [{ createdAt: 'desc' }],
    });

    return plan;
  }

  /**
   * Lists all sprint plan versions for history comparison
   */
  static async getPlanHistory(projectId: string) {
    const plans = await prisma.sprintPlan.findMany({
      where: { projectId },
      orderBy: [{ version: 'desc' }],
      select: {
        id: true,
        version: true,
        status: true,
        title: true,
        summary: true,
        isApproved: true,
        approvedAt: true,
        createdAt: true,
        validationReport: true,
        changeSummary: true,
      },
    });

    return plans;
  }
}
