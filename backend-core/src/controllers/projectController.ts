import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AiService } from '../services/aiService.js';
import { socketService } from '../services/socketService.js';
import { TicketPriority, TicketStatus } from '@prisma/client';
import { authenticateRequest } from '../lib/auth.js';
import { getProjectRole } from '../lib/permissions.js';

export class ProjectController {
  static async createProject(req: Request, res: Response) {
    try {
      const {
        name,
        description,
        prdText,
        techStack,
        goals,
        targetUsers,
        businessRequirements,
        technicalConstraints,
        constraints,
        knownDependencies,
        targetReleaseDate,
        additionalNotes,
        createdById,
      } = req.body;

      if (!name || !description) {
        return res.status(400).json({
          success: false,
          error: 'Name and description are required.',
        });
      }

      // Find or assign user from auth session or payload
      const authUser = await authenticateRequest(req);
      let userId = authUser?.id || createdById;
      if (!userId) {
        const defaultUser = await prisma.user.findFirst();
        userId = defaultUser?.id;
      }

      // 1. Create Project in PostgreSQL with all metadata fields
      const project = await prisma.project.create({
        data: {
          name: name.trim(),
          description: description.trim(),
          goals: goals ? goals.trim() : null,
          targetUsers: targetUsers ? targetUsers.trim() : null,
          techStack: techStack ? techStack.trim() : null,
          businessRequirements: businessRequirements ? businessRequirements.trim() : null,
          technicalConstraints: technicalConstraints ? technicalConstraints.trim() : (constraints ? constraints.trim() : null),
          knownDependencies: knownDependencies ? knownDependencies.trim() : null,
          targetReleaseDate: targetReleaseDate ? targetReleaseDate.trim() : null,
          additionalNotes: additionalNotes ? additionalNotes.trim() : null,
          ownerId: userId || null,
        },
      });

      // Ensure Owner is registered as ProjectMember with OWNER role
      if (userId) {
        await prisma.projectMember.upsert({
          where: {
            projectId_userId: {
              projectId: project.id,
              userId,
            },
          },
          update: { role: 'OWNER' },
          create: {
            projectId: project.id,
            userId,
            role: 'OWNER',
          },
        });
      }

      // Ingest PRD text if supplied during project creation
      let initialDocument = null;
      if (prdText && prdText.trim()) {
        initialDocument = await prisma.projectDocument.create({
          data: {
            projectId: project.id,
            filename: `${name.trim().replace(/[^a-zA-Z0-9_-]/g, '_')}_PRD.md`,
            fileSize: Buffer.byteLength(prdText.trim(), 'utf8'),
            fileFormat: 'md',
            mimeType: 'text/markdown',
            status: 'COMPLETED',
          },
        });

        await prisma.documentChunk.create({
          data: {
            documentId: initialDocument.id,
            projectId: project.id,
            chunkText: prdText.trim(),
            order: 0,
            location: 'PRD Specification',
            sourceHeading: `${name.trim()} PRD`,
          },
        });
      }

      // 2. Create Default Board & Dynamic Columns
      const board = await prisma.board.create({
        data: {
          projectId: project.id,
          name: `${name.trim()} Board`,
        },
      });

      const columnConfigs = [
        { name: 'To Do', category: TicketStatus.TODO, position: 0, color: '#526174' },
        { name: 'In Progress', category: TicketStatus.IN_PROGRESS, position: 1, color: '#003049' },
        { name: 'Done', category: TicketStatus.DONE, position: 2, color: '#15803D' },
      ];

      const createdColumns: Record<string, any> = {};

      for (const conf of columnConfigs) {
        const col = await prisma.boardColumn.create({
          data: {
            boardId: board.id,
            name: conf.name,
            category: conf.category,
            position: conf.position,
            color: conf.color,
            isDefault: true,
          },
        });
        createdColumns[conf.name] = col;
      }

      socketService.emitToProject(project.id, 'project:created', {
        projectId: project.id,
      });

      return res.status(201).json({
        success: true,
        project: {
          ...project,
          userRole: 'owner',
          memberCount: 1,
          ticketCount: 0,
          documentCount: initialDocument ? 1 : 0,
        },
        boardId: board.id,
        initialDocumentId: initialDocument?.id || null,
      });
    } catch (error: any) {
      console.error('[ProjectController.createProject] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getProjects(req: Request, res: Response) {
    try {
      const authUser = await authenticateRequest(req);
      const projects = await prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: { id: true, username: true, email: true, avatarUrl: true },
          },
          tickets: {
            select: {
              id: true,
              status: true,
              storyPoints: true,
              priority: true,
              column: { select: { id: true, name: true, category: true } },
            },
          },
          boards: {
            select: { id: true, name: true },
          },
          _count: {
            select: {
              members: true,
              documents: true,
              tickets: true,
            },
          },
        },
      });

      const formatted = await Promise.all(
        projects.map(async (p) => {
          const totalTickets = p.tickets.length;
          const doneTickets = p.tickets.filter((t) => t.status === TicketStatus.DONE).length;
          const totalPoints = p.tickets.reduce((acc: number, t) => acc + (t.storyPoints || 0), 0);
          const completionRate = totalTickets > 0 ? Math.round((doneTickets / totalTickets) * 100) : 0;

          let userRole = 'owner';
          if (authUser) {
            userRole = (await getProjectRole(p.id, authUser.id)) || (p.ownerId === authUser.id ? 'owner' : 'owner');
          }

          return {
            id: p.id,
            name: p.name,
            description: p.description,
            goals: p.goals,
            targetUsers: p.targetUsers,
            techStack: p.techStack,
            businessRequirements: p.businessRequirements,
            technicalConstraints: p.technicalConstraints,
            constraints: p.technicalConstraints,
            knownDependencies: p.knownDependencies,
            targetReleaseDate: p.targetReleaseDate,
            additionalNotes: p.additionalNotes,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            createdBy: p.owner,
            ownerId: p.ownerId,
            userRole,
            memberCount: (p._count?.members || 0) + 1,
            documentCount: p._count?.documents || 0,
            ticketCount: p._count?.tickets || 0,
            totalTickets,
            doneTickets,
            totalPoints,
            completionRate,
            boardId: p.boards[0]?.id || null,
          };
        })
      );

      return res.status(200).json({ success: true, projects: formatted });
    } catch (error: any) {
      console.error('[ProjectController.getProjects] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getProjectById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const authUser = await authenticateRequest(req);

      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          owner: { select: { id: true, username: true, email: true, avatarUrl: true } },
          boards: {
            include: {
              columns: { orderBy: { position: 'asc' } },
            },
          },
          _count: {
            select: {
              members: true,
              tickets: true,
              documents: true,
              features: true,
            },
          },
        },
      });

      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      let userRole = 'owner';
      if (authUser) {
        userRole = (await getProjectRole(project.id, authUser.id)) || (project.ownerId === authUser.id ? 'owner' : 'owner');
      }

      return res.status(200).json({
        success: true,
        project: {
          ...project,
          userRole,
          memberCount: (project._count?.members || 0) + 1,
          ticketCount: project._count?.tickets || 0,
          documentCount: project._count?.documents || 0,
          featureCount: project._count?.features || 0,
        },
      });
    } catch (error: any) {
      console.error('[ProjectController.getProjectById] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getProjectBoard(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const project = await prisma.project.findUnique({
        where: { id },
        select: { id: true, name: true, description: true, techStack: true },
      });

      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      let board = await prisma.board.findFirst({
        where: { projectId: id },
        include: {
          columns: {
            orderBy: { position: 'asc' },
            include: {
              tickets: {
                orderBy: { createdAt: 'desc' },
                include: {
                  assignee: { select: { id: true, username: true, avatarUrl: true, email: true } },
                  _count: { select: { comments: true } },
                },
              },
            },
          },
        },
      });

      // If board doesn't exist, create default
      if (!board) {
        board = await prisma.board.create({
          data: {
            projectId: id,
            name: `${project.name} Board`,
          },
          include: {
            columns: {
              include: {
                tickets: {
                  include: {
                    assignee: true,
                    _count: { select: { comments: true } },
                  },
                },
              },
            },
          },
        });

        // Ensure default columns
        const defaultColConfigs = [
          { name: 'To Do', category: TicketStatus.TODO, position: 0, color: '#526174' },
          { name: 'In Progress', category: TicketStatus.IN_PROGRESS, position: 1, color: '#003049' },
          { name: 'Done', category: TicketStatus.DONE, position: 2, color: '#15803D' },
        ];
        for (const conf of defaultColConfigs) {
          await prisma.boardColumn.create({
            data: {
              boardId: board.id,
              name: conf.name,
              category: conf.category,
              position: conf.position,
              color: conf.color,
              isDefault: true,
            },
          });
        }
      }

      return res.status(200).json({
        success: true,
        project,
        board,
      });
    } catch (error: any) {
      console.error('[ProjectController.getProjectBoard] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getProjectAnalytics(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const tickets = await prisma.ticket.findMany({
        where: { projectId: id },
        include: {
          column: { select: { name: true, category: true } },
          assignee: { select: { id: true, username: true } },
        },
      });

      const totalTickets = tickets.length;
      const totalStoryPoints = tickets.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

      const statusCounts: Record<string, number> = {
        'To Do': 0,
        'In Progress': 0,
        'Done': 0,
      };

      const priorityCounts: Record<string, number> = {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
      };

      let completedStoryPoints = 0;

      for (const t of tickets) {
        const colName = t.column?.name || 'To Do';
        statusCounts[colName] = (statusCounts[colName] || 0) + 1;
        priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;

        if (t.status === TicketStatus.DONE) {
          completedStoryPoints += t.storyPoints || 0;
        }
      }

      const completionPercentage = totalStoryPoints > 0
        ? Math.round((completedStoryPoints / totalStoryPoints) * 100)
        : 0;

      return res.status(200).json({
        success: true,
        totalTickets,
        totalStoryPoints,
        completedStoryPoints,
        completionPercentage,
        statusCounts,
        priorityCounts,
      });
    } catch (error: any) {
      console.error('[ProjectController.getProjectAnalytics] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async updateProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        techStack,
        goals,
        targetUsers,
        businessRequirements,
        technicalConstraints,
        constraints,
        knownDependencies,
        targetReleaseDate,
        additionalNotes,
      } = req.body;

      const effectiveConstraints = technicalConstraints !== undefined
        ? technicalConstraints
        : (constraints !== undefined ? constraints : undefined);

      const updated = await prisma.project.update({
        where: { id },
        data: {
          name: name ? name.trim() : undefined,
          description: description !== undefined ? description : undefined,
          goals: goals !== undefined ? goals : undefined,
          targetUsers: targetUsers !== undefined ? targetUsers : undefined,
          techStack: techStack !== undefined ? techStack : undefined,
          businessRequirements: businessRequirements !== undefined ? businessRequirements : undefined,
          technicalConstraints: effectiveConstraints,
          knownDependencies: knownDependencies !== undefined ? knownDependencies : undefined,
          targetReleaseDate: targetReleaseDate !== undefined ? targetReleaseDate : undefined,
          additionalNotes: additionalNotes !== undefined ? additionalNotes : undefined,
        },
      });
      socketService.broadcast('project:updated', updated);
      return res.status(200).json({ success: true, project: updated });
    } catch (error: any) {
      console.error('[ProjectController.updateProject] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async deleteProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.project.delete({ where: { id } });
      socketService.broadcast('project:deleted', { projectId: id });
      return res.status(200).json({ success: true, message: 'Project deleted' });
    } catch (error: any) {
      console.error('[ProjectController.deleteProject] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}
