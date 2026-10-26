import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateRequest } from '../lib/auth.js';
import { getProjectRole } from '../lib/permissions.js';
import { ProjectSynthesisService } from '../lib/projectSynthesis.js';
import { TicketPriority, FeatureReviewStatus } from '@prisma/client';

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

  static async getBrief(req: Request, res: Response) {
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

      let analysis = await prisma.projectAnalysis.findUnique({
        where: { projectId },
      });

      if (!analysis?.brief) {
        const synth = await ProjectSynthesisService.synthesizeProject(projectId);
        analysis = await prisma.projectAnalysis.findUnique({ where: { projectId } });
      }

      return res.status(200).json({
        success: true,
        brief: analysis?.brief,
        coverageReport: analysis?.coverageReport,
        sprintSchedule: analysis?.sprintSchedule,
      });
    } catch (error: any) {
      console.error('[AnalysisController.getBrief] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch project brief' });
    }
  }

  static async generateBrief(req: Request, res: Response) {
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
          error: 'Forbidden. Only owners and managers can synthesize the project brief.',
        });
      }

      const result = await ProjectSynthesisService.synthesizeProject(projectId);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('[AnalysisController.generateBrief] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Brief generation failed' });
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
          brief: body.brief || null,
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
          brief: body.brief !== undefined ? body.brief : undefined,
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

      const result = await ProjectSynthesisService.synthesizeProject(projectId);

      const analysis = await prisma.projectAnalysis.findUnique({
        where: { projectId },
      });

      return res.status(200).json({
        success: true,
        analysis,
        brief: result.brief,
        sprintsCount: result.sprintsCount,
        candidatesCount: result.candidatesCount,
        featuresExtracted: result.featuresCount,
      });
    } catch (error: any) {
      console.error('[AnalysisController.runAnalysis] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Analysis run failed' });
    }
  }
}
