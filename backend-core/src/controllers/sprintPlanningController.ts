import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateRequest } from '../lib/auth.js';
import { getProjectRole } from '../lib/permissions.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { PERMISSIONS } from '../authorization/permissions.js';
import { SprintPlanningBrainService } from '../lib/sprintPlanningBrain.js';

const generatePlanSchema = z.object({
  defaultSprintCapacity: z.number().int().min(10).max(100).optional(),
  maxSprints: z.number().int().min(1).max(30).optional(),
  strictCapacity: z.boolean().optional(),
  allowCoSprintDependencies: z.boolean().optional(),
});

const updateAllocationSchema = z.object({
  ticketId: z.string().min(1),
  targetSprintId: z.string().min(1),
  isLocked: z.boolean().optional(),
});

const createDependencySchema = z.object({
  sourceTicketId: z.string().min(1),
  targetTicketId: z.string().min(1),
  type: z.enum(['BLOCKS', 'RELIES_ON', 'INTEGRATES_WITH']).default('BLOCKS'),
  reason: z.string().optional(),
});

export class SprintPlanningController {
  /**
   * Triggers the AI Sprint Planning Brain to sequence tickets and generate a proposed plan
   */
  static async generatePlan(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const auth = await AuthorizationService.authorize(req, PERMISSIONS.PLAN_GENERATE, projectId);
      if (!auth.authorized) {
        return res.status(auth.status || 403).json({ success: false, error: auth.reason });
      }

      const parsed = generatePlanSchema.safeParse(req.body);
      const options = parsed.success ? parsed.data : {};

      const planResult = await SprintPlanningBrainService.planSprints(projectId, options);

      return res.status(200).json({
        success: true,
        plan: planResult,
      });
    } catch (error: any) {
      console.error('[SprintPlanningController.generatePlan] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to generate sprint plan' });
    }
  }

  /**
   * Retrieves the latest active or proposed sprint plan for a project
   */
  static async getLatestPlan(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const auth = await AuthorizationService.authorize(req, PERMISSIONS.PLAN_VIEW, projectId);
      if (!auth.authorized) {
        return res.status(auth.status || 403).json({ success: false, error: auth.reason });
      }

      let plan = await SprintPlanningBrainService.getLatestPlan(projectId);

      // If no plan exists yet, synthesize the initial baseline plan on-demand
      if (!plan) {
        const generated = await SprintPlanningBrainService.planSprints(projectId);
        plan = await SprintPlanningBrainService.getLatestPlan(projectId);
      }

      return res.status(200).json({
        success: true,
        plan,
      });
    } catch (error: any) {
      console.error('[SprintPlanningController.getLatestPlan] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch latest sprint plan' });
    }
  }

  /**
   * Retrieves plan versions history
   */
  static async getPlanHistory(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const auth = await AuthorizationService.authorize(req, PERMISSIONS.PLAN_VIEW, projectId);
      if (!auth.authorized) {
        return res.status(auth.status || 403).json({ success: false, error: auth.reason });
      }

      const history = await SprintPlanningBrainService.getPlanHistory(projectId);

      return res.status(200).json({
        success: true,
        history,
      });
    } catch (error: any) {
      console.error('[SprintPlanningController.getPlanHistory] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch plan history' });
    }
  }

  /**
   * Approves a proposed plan and applies allocations to live tickets
   */
  static async approvePlan(req: Request, res: Response) {
    try {
      const { id: projectId, planId } = req.params;
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const auth = await AuthorizationService.authorize(req, PERMISSIONS.PLAN_APPROVE, projectId);
      if (!auth.authorized) {
        return res.status(auth.status || 403).json({ success: false, error: auth.reason });
      }

      const result = await SprintPlanningBrainService.approvePlan(projectId, planId, user.id);

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('[SprintPlanningController.approvePlan] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to approve sprint plan' });
    }
  }

  /**
   * Updates an individual ticket allocation or lock state within a proposed plan
   */
  static async updateAllocation(req: Request, res: Response) {
    try {
      const { id: projectId, planId } = req.params;
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const auth = await AuthorizationService.authorize(req, PERMISSIONS.PLAN_GENERATE, projectId);
      if (!auth.authorized) {
        return res.status(auth.status || 403).json({ success: false, error: auth.reason });
      }

      const parsed = updateAllocationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: (parsed.error as any).issues?.[0]?.message || parsed.error.message,
        });
      }

      const result = await SprintPlanningBrainService.updatePlanAllocation(
        projectId,
        planId,
        parsed.data.ticketId,
        parsed.data.targetSprintId,
        parsed.data.isLocked
      );

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('[SprintPlanningController.updateAllocation] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to update plan allocation' });
    }
  }

  /**
   * Retrieves ticket dependencies for the project
   */
  static async getDependencies(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const userRole = await getProjectRole(projectId, user.id);
      if (!userRole) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const dependencies = await prisma.ticketDependency.findMany({
        where: { projectId },
        include: {
          sourceTicket: { select: { id: true, title: true, sourceCandidateId: true, sprint: true, status: true } },
          targetTicket: { select: { id: true, title: true, sourceCandidateId: true, sprint: true, status: true } },
        },
      });

      return res.status(200).json({
        success: true,
        dependencies,
      });
    } catch (error: any) {
      console.error('[SprintPlanningController.getDependencies] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch dependencies' });
    }
  }

  /**
   * Creates a manual dependency edge between two tickets
   */
  static async createDependency(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const userRole = await getProjectRole(projectId, user.id);
      if (!userRole) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const parsed = createDependencySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: (parsed.error as any).issues?.[0]?.message || parsed.error.message,
        });
      }

      const { sourceTicketId, targetTicketId, type, reason } = parsed.data;

      if (sourceTicketId === targetTicketId) {
        return res.status(400).json({ success: false, error: 'A ticket cannot depend on itself.' });
      }

      const dep = await prisma.ticketDependency.upsert({
        where: {
          sourceTicketId_targetTicketId: { sourceTicketId, targetTicketId },
        },
        create: {
          projectId,
          sourceTicketId,
          targetTicketId,
          type,
          isInferred: false,
          reason: reason || 'Manual dependency defined by PM',
        },
        update: {
          type,
          reason: reason || 'Manual dependency updated by PM',
        },
      });

      return res.status(201).json({
        success: true,
        dependency: dep,
      });
    } catch (error: any) {
      console.error('[SprintPlanningController.createDependency] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to create dependency' });
    }
  }
}
