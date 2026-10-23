import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateRequest } from '../lib/auth.js';
import { getProjectRole } from '../lib/permissions.js';
import { analyzeProjectContext } from '../lib/ai.js';
import { TicketPriority, FeatureReviewStatus } from '@prisma/client';

const priorityEnumMap: Record<string, TicketPriority> = {
  Low: TicketPriority.LOW,
  Medium: TicketPriority.MEDIUM,
  High: TicketPriority.HIGH,
  Critical: TicketPriority.CRITICAL,
};

export class AnalysisController {
  static async getAnalysis(req: Request, res: Response) {
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

      const analysis = await prisma.projectAnalysis.findUnique({
        where: { projectId },
      });

      return res.status(200).json({ success: true, analysis });
    } catch (error: any) {
      console.error('[AnalysisController.getAnalysis] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch analysis' });
    }
  }

  static async updateAnalysis(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id: projectId } = req.params;
      const userRole = await getProjectRole(projectId, user.id);
      if (userRole !== 'owner' && userRole !== 'manager') {
        return res.status(403).json({ success: false, error: 'Forbidden. Only owners and managers can edit analysis.' });
      }

      const body = req.body;

      const updated = await prisma.projectAnalysis.upsert({
        where: { projectId },
        create: {
          projectId,
          overview: body.overview || '',
          functionalRequirements: body.functionalRequirements || [],
          nonFunctionalRequirements: body.nonFunctionalRequirements || [],
          businessRules: body.businessRules || [],
          technicalRequirements: body.technicalRequirements || [],
          milestones: body.milestones || [],
          openQuestions: body.openQuestions || [],
          status: 'REVIEWED',
          analyzedAt: new Date(),
        },
        update: {
          overview: body.overview,
          functionalRequirements: body.functionalRequirements,
          nonFunctionalRequirements: body.nonFunctionalRequirements,
          businessRules: body.businessRules,
          technicalRequirements: body.technicalRequirements,
          milestones: body.milestones,
          openQuestions: body.openQuestions,
          status: 'REVIEWED',
        },
      });

      return res.status(200).json({ success: true, analysis: updated });
    } catch (error: any) {
      console.error('[AnalysisController.updateAnalysis] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async runAnalysis(req: Request, res: Response) {
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
          error: 'Forbidden. Only owners and managers can run project analysis.',
        });
      }

      const output = await analyzeProjectContext(projectId);

      const analysis = await prisma.projectAnalysis.upsert({
        where: { projectId },
        create: {
          projectId,
          overview: output.overview,
          functionalRequirements: output.functionalRequirements as any,
          nonFunctionalRequirements: output.nonFunctionalRequirements as any,
          businessRules: output.businessRules as any,
          technicalRequirements: output.technicalRequirements as any,
          milestones: output.milestones as any,
          openQuestions: output.openQuestions as any,
          status: 'COMPLETED',
          analyzedAt: new Date(),
        },
        update: {
          overview: output.overview,
          functionalRequirements: output.functionalRequirements as any,
          nonFunctionalRequirements: output.nonFunctionalRequirements as any,
          businessRules: output.businessRules as any,
          technicalRequirements: output.technicalRequirements as any,
          milestones: output.milestones as any,
          openQuestions: output.openQuestions as any,
          status: 'COMPLETED',
          analyzedAt: new Date(),
        },
      });

      if (output.features && output.features.length > 0) {
        for (const feat of output.features) {
          const prio = priorityEnumMap[feat.suggestedPriority as any] || TicketPriority.MEDIUM;
          await prisma.projectFeature.create({
            data: {
              projectId,
              name: feat.name,
              description: feat.description,
              module: feat.module || 'General',
              businessValue: feat.businessValue,
              suggestedPriority: prio,
              dependencies: feat.dependencies || [],
              relatedRequirements: feat.relatedRequirements || [],
              constraints: feat.constraints,
              sourceReferences: feat.sourceReferences as any,
              status: FeatureReviewStatus.PROPOSED,
              isAiGenerated: true,
            },
          });
        }
      }

      return res.status(200).json({
        success: true,
        analysis,
        featuresExtracted: output.features?.length || 0,
      });
    } catch (error: any) {
      console.error('[AnalysisController.runAnalysis] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Analysis run failed' });
    }
  }
}
