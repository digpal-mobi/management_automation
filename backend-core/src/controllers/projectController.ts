import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AiService } from '../services/aiService.js';
import { socketService } from '../services/socketService.js';
import { Priority } from '@prisma/client';

export class ProjectController {
  static async createProject(req: Request, res: Response) {
    try {
      const {
        name,
        description,
        prdText,
        techStack,
        goals,
        constraints,
        createdById,
      } = req.body;

      if (!name || !description || !prdText) {
        return res.status(400).json({
          success: false,
          error: 'Name, description, and PRD text are required.',
        });
      }

      // Find or assign default user
      let userId = createdById;
      if (!userId) {
        const defaultUser = await prisma.user.findFirst();
        userId = defaultUser?.id;
      }

      // 1. Create Project in PostgreSQL
      const project = await prisma.project.create({
        data: {
          name,
          description,
          prdText,
          techStack: techStack || '',
          goals: goals || '',
          constraints: constraints || '',
          createdById: userId,
        },
      });

      // 2. Create Default Board & Kanban Columns
      const board = await prisma.board.create({
        data: {
          projectId: project.id,
          name: `${name} Board`,
        },
      });

      const columnNames = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'];
      const createdColumns: Record<string, any> = {};

      for (let i = 0; i < columnNames.length; i++) {
        const col = await prisma.column.create({
          data: {
            boardId: board.id,
            name: columnNames[i],
            position: i,
          },
        });
        createdColumns[columnNames[i]] = col;
      }

      // 3. Ingest Context into Python pgvector service
      try {
        await AiService.ingestProject({
          projectId: project.id,
          projectName: name,
          description,
          prdText,
          techStack,
          goals,
          constraints,
        });
      } catch (err) {
        console.warn('[ProjectController] AI ingestion warning (proceeding):', err);
      }

      // 4. Generate AI Tickets
      let generatedTickets: any[] = [];
      try {
        const genResult = await AiService.generateTickets({
          projectId: project.id,
          projectName: name,
          description,
          prdText,
          techStack,
          goals,
          constraints,
        });
        generatedTickets = genResult.tickets || [];
      } catch (err) {
        console.error('[ProjectController] AI ticket generation error:', err);
      }

      // 5. Save generated tickets to DB
      const backlogCol = createdColumns['Backlog'];
      const todoCol = createdColumns['To Do'];
      const createdTickets = [];

      for (let i = 0; i < generatedTickets.length; i++) {
        const t = generatedTickets[i];

        // Format acceptance criteria as interactive checklist
        const acChecklist = Array.isArray(t.acceptanceCriteria)
          ? t.acceptanceCriteria.map((item: string, idx: number) => ({
              id: `ac-${idx + 1}`,
              text: item,
              completed: false,
            }))
          : [];

        // Format PR checklist
        const prChecklist = Array.isArray(t.prChecklist)
          ? t.prChecklist.map((item: string, idx: number) => ({
              id: `pr-${idx + 1}`,
              text: item,
              completed: false,
            }))
          : [];

        // Distribute: First 2 tickets to 'To Do', remaining to 'Backlog'
        const targetColumn = i < 2 ? todoCol : backlogCol;

        // Map priority
        let prio: Priority = Priority.MEDIUM;
        if (t.priority === 'HIGH') prio = Priority.HIGH;
        if (t.priority === 'LOW') prio = Priority.LOW;

        const ticket = await prisma.ticket.create({
          data: {
            projectId: project.id,
            columnId: targetColumn.id,
            title: t.title,
            description: t.description,
            acceptanceCriteria: acChecklist,
            technicalNotes: t.technicalNotes || '',
            prChecklist: prChecklist,
            priority: prio,
            storyPoints: t.storyPoints || 3,
            labels: Array.isArray(t.labels) ? t.labels : [],
            dependencies: Array.isArray(t.dependencies) ? t.dependencies : [],
            position: i,
            createdById: userId,
          },
        });
        createdTickets.push(ticket);
      }

      socketService.emitToProject(project.id, 'project:created', {
        projectId: project.id,
      });

      return res.status(201).json({
        success: true,
        project,
        boardId: board.id,
        ticketsCount: createdTickets.length,
        tickets: createdTickets,
      });
    } catch (error: any) {
      console.error('[ProjectController.createProject] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getProjects(req: Request, res: Response) {
    try {
      const projects = await prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          tickets: {
            select: {
              id: true,
              column: { select: { name: true } },
              storyPoints: true,
              priority: true,
            },
          },
          boards: {
            select: { id: true, name: true },
          },
        },
      });

      const formatted = projects.map((p) => {
        const totalTickets = p.tickets.length;
        const doneTickets = p.tickets.filter((t) => t.column.name === 'Done').length;
        const totalPoints = p.tickets.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
        const completionRate = totalTickets > 0 ? Math.round((doneTickets / totalTickets) * 100) : 0;

        return {
          id: p.id,
          name: p.name,
          description: p.description,
          techStack: p.techStack,
          goals: p.goals,
          constraints: p.constraints,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          createdBy: p.createdBy,
          totalTickets,
          doneTickets,
          totalPoints,
          completionRate,
          boardId: p.boards[0]?.id || null,
        };
      });

      return res.status(200).json({ success: true, projects: formatted });
    } catch (error: any) {
      console.error('[ProjectController.getProjects] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getProjectById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          createdBy: { select: { id: true, name: true, email: true, avatar: true } },
          boards: {
            include: {
              columns: { orderBy: { position: 'asc' } },
            },
          },
        },
      });

      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      return res.status(200).json({ success: true, project });
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
                orderBy: { position: 'asc' },
                include: {
                  assignee: { select: { id: true, name: true, avatar: true, email: true } },
                  _count: { select: { messages: true } },
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
                    _count: { select: { messages: true } },
                  },
                },
              },
            },
          },
        });
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
          column: { select: { name: true } },
          assignee: { select: { id: true, name: true } },
        },
      });

      const totalTickets = tickets.length;
      const totalStoryPoints = tickets.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      
      const statusCounts: Record<string, number> = {
        Backlog: 0,
        'To Do': 0,
        'In Progress': 0,
        'In Review': 0,
        Done: 0,
      };

      const priorityCounts: Record<string, number> = {
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
      };

      let completedStoryPoints = 0;
      const labelCounts: Record<string, number> = {};

      for (const t of tickets) {
        const col = t.column.name;
        statusCounts[col] = (statusCounts[col] || 0) + 1;
        priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;

        if (col === 'Done') {
          completedStoryPoints += t.storyPoints || 0;
        }

        const labels = Array.isArray(t.labels) ? (t.labels as string[]) : [];
        for (const l of labels) {
          labelCounts[l] = (labelCounts[l] || 0) + 1;
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
        labelCounts,
      });
    } catch (error: any) {
      console.error('[ProjectController.getProjectAnalytics] Error:', error);
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
