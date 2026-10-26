import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateRequest } from '../lib/auth.js';
import { getProjectRole } from '../lib/permissions.js';
import { ProjectSynthesisService } from '../lib/projectSynthesis.js';
import { FeatureReviewStatus, TicketPriority, TicketType, TicketStatus } from '@prisma/client';

const createFeatureSchema = z.object({
  name: z.string().min(1, 'Feature name is required').max(200),
  description: z.string().min(1, 'Description is required'),
  module: z.string().default('General'),
  businessValue: z.string().optional(),
  suggestedPriority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  dependencies: z.array(z.string()).default([]),
  constraints: z.string().optional(),
});

const updateFeatureSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  module: z.string().optional(),
  businessValue: z.string().optional(),
  suggestedPriority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  dependencies: z.array(z.string()).optional(),
  constraints: z.string().optional(),
  reviewStatus: z.enum(['PROPOSED', 'ACCEPTED', 'DEFERRED', 'REJECTED']).optional(),
});

export class FeatureController {
  static async getFeatures(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id: projectId } = req.params;
      const userRole = await getProjectRole(projectId, user.id);
      if (!userRole) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const features = await prisma.projectFeature.findMany({
        where: { projectId },
        orderBy: [{ module: 'asc' }, { createdAt: 'asc' }],
        include: {
          tickets: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              type: true,
            },
          },
        },
      });

      return res.status(200).json({ success: true, features });
    } catch (error: any) {
      console.error('[FeatureController.getFeatures] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch features' });
    }
  }

  static async createFeature(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id: projectId } = req.params;
      const userRole = await getProjectRole(projectId, user.id);
      if (!userRole || userRole === 'editor') {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      const parsed = createFeatureSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: (parsed.error as any).issues?.[0]?.message || parsed.error.message,
        });
      }

      let prio: TicketPriority = TicketPriority.MEDIUM;
      if (parsed.data.suggestedPriority === 'High') prio = TicketPriority.HIGH;
      if (parsed.data.suggestedPriority === 'Low') prio = TicketPriority.LOW;
      if (parsed.data.suggestedPriority === 'Critical') prio = TicketPriority.CRITICAL;

      const feature = await prisma.projectFeature.create({
        data: {
          projectId,
          name: parsed.data.name,
          description: parsed.data.description,
          module: parsed.data.module,
          businessValue: parsed.data.businessValue,
          suggestedPriority: prio,
          dependencies: parsed.data.dependencies,
          constraints: parsed.data.constraints,
          status: FeatureReviewStatus.PROPOSED,
          isAiGenerated: false,
        },
      });

      return res.status(201).json({ success: true, feature });
    } catch (error: any) {
      console.error('[FeatureController.createFeature] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to create feature' });
    }
  }

  static async getFeatureById(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id: projectId, featureId } = req.params;
      const userRole = await getProjectRole(projectId, user.id);
      if (!userRole) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const feature = await prisma.projectFeature.findUnique({
        where: { id: featureId },
        include: { tickets: true },
      });

      if (!feature || feature.projectId !== projectId) {
        return res.status(404).json({ success: false, error: 'Feature not found' });
      }

      return res.status(200).json({ success: true, feature });
    } catch (error: any) {
      console.error('[FeatureController.getFeatureById] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async updateFeature(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id: projectId, featureId } = req.params;
      const userRole = await getProjectRole(projectId, user.id);
      if (!userRole || userRole === 'editor') {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      const parsed = updateFeatureSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: (parsed.error as any).issues?.[0]?.message || parsed.error.message,
        });
      }

      let prio: TicketPriority | undefined;
      if (parsed.data.suggestedPriority === 'High') prio = TicketPriority.HIGH;
      if (parsed.data.suggestedPriority === 'Low') prio = TicketPriority.LOW;
      if (parsed.data.suggestedPriority === 'Critical') prio = TicketPriority.CRITICAL;
      if (parsed.data.suggestedPriority === 'Medium') prio = TicketPriority.MEDIUM;

      const updated = await prisma.projectFeature.update({
        where: { id: featureId },
        data: {
          name: parsed.data.name,
          description: parsed.data.description,
          module: parsed.data.module,
          businessValue: parsed.data.businessValue,
          suggestedPriority: prio,
          dependencies: parsed.data.dependencies,
          constraints: parsed.data.constraints,
          status: (parsed.data.reviewStatus as FeatureReviewStatus) || undefined,
        },
      });

      return res.status(200).json({ success: true, feature: updated });
    } catch (error: any) {
      console.error('[FeatureController.updateFeature] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async deleteFeature(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id: projectId, featureId } = req.params;
      const userRole = await getProjectRole(projectId, user.id);
      if (!userRole || userRole === 'editor') {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      await prisma.projectFeature.delete({ where: { id: featureId } });

      return res.status(200).json({ success: true, message: 'Feature deleted successfully' });
    } catch (error: any) {
      console.error('[FeatureController.deleteFeature] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Mode B: Generate Tickets for a Single Selected Feature
   */
  static async generateTickets(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id: projectId, featureId } = req.params;
      const userRole = await getProjectRole(projectId, user.id);
      if (!userRole || userRole === 'editor') {
        return res.status(403).json({ success: false, error: 'Forbidden. Editors cannot generate tickets.' });
      }

      const result = await ProjectSynthesisService.generateTicketsForFeature(projectId, featureId);

      return res.status(200).json({
        success: true,
        tickets: result.tickets,
        count: result.ticketCount,
        featureName: result.featureName,
      });
    } catch (error: any) {
      console.error('[FeatureController.generateTickets] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Ticket generation failed' });
    }
  }

  /**
   * Mode A: Generate Whole-Project Backlog from Approved Brief and Candidates
   */
  static async generateAllTickets(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id: projectId } = req.params;
      const userRole = await getProjectRole(projectId, user.id);
      if (userRole !== 'owner' && userRole !== 'manager') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden. Only owners and managers can generate the entire project backlog.',
        });
      }

      const result = await ProjectSynthesisService.generateAllBacklogTickets(projectId);

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('[FeatureController.generateAllTickets] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Whole-project backlog generation failed' });
    }
  }
}
