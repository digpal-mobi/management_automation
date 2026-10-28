import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { PERMISSIONS } from '../authorization/permissions.js';
import { TicketStatus } from '@prisma/client';

const createColumnSchema = z.object({
  name: z.string().min(1, 'Column name is required').max(50, 'Column name cannot exceed 50 characters'),
  description: z.string().max(255).optional(),
  category: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'To Do', 'In Progress', 'Done']).default('TODO'),
  color: z.string().optional(),
});

const updateColumnSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(255).optional().nullable(),
  category: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'To Do', 'In Progress', 'Done']).optional(),
  color: z.string().optional().nullable(),
});

const reorderSchema = z.object({
  columnOrders: z.array(
    z.object({
      id: z.string(),
      position: z.number().int().min(0),
    })
  ).min(1, 'columnOrders array cannot be empty'),
});

export class BoardColumnController {
  static async getProjectBoard(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const auth = await AuthorizationService.authorize(req, PERMISSIONS.BOARD_VIEW, projectId);
      if (!auth.authorized) {
        return res.status(auth.status || 403).json({ success: false, error: auth.reason });
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, name: true, description: true },
      });

      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      let board = await prisma.board.findFirst({
        where: { projectId },
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

      if (!board) {
        board = await prisma.board.create({
          data: { projectId, name: `${project.name} Board` },
          include: {
            columns: {
              orderBy: { position: 'asc' },
              include: {
                tickets: {
                  include: {
                    assignee: { select: { id: true, username: true, avatarUrl: true, email: true } },
                    _count: { select: { comments: true } },
                  },
                },
              },
            },
          },
        });
      }

      if (!board.columns || board.columns.length === 0) {
        const defaultDefs = [
          { name: 'To Do', category: TicketStatus.TODO, position: 0, isDefault: true, color: '#526174' },
          { name: 'In Progress', category: TicketStatus.IN_PROGRESS, position: 1, isDefault: true, color: '#003049' },
          { name: 'Done', category: TicketStatus.DONE, position: 2, isDefault: true, color: '#15803D' },
        ];

        for (const def of defaultDefs) {
          await prisma.boardColumn.create({
            data: {
              boardId: board.id,
              name: def.name,
              category: def.category,
              position: def.position,
              isDefault: def.isDefault,
              color: def.color,
            },
          });
        }

        board = await prisma.board.findUnique({
          where: { id: board.id },
          include: {
            columns: {
              orderBy: { position: 'asc' },
              include: {
                tickets: {
                  include: {
                    assignee: { select: { id: true, username: true, avatarUrl: true, email: true } },
                    _count: { select: { comments: true } },
                  },
                },
              },
            },
          },
        });
      }

      // Check unassigned tickets
      const unassignedTickets = await prisma.ticket.findMany({
        where: {
          projectId,
          OR: [{ columnId: null }, { column: { boardId: { not: board!.id } } }],
        },
        include: {
          assignee: { select: { id: true, username: true, avatarUrl: true, email: true } },
          _count: { select: { comments: true } },
        },
      });

      if (unassignedTickets.length > 0 && board && board.columns.length > 0) {
        const firstCol = board.columns[0];
        for (const t of unassignedTickets) {
          await prisma.ticket.update({
            where: { id: t.id },
            data: { columnId: firstCol.id, boardId: board.id },
          });
          (firstCol.tickets as any[]).unshift(t);
        }
      }

      const formattedColumns = board!.columns.map((col) => ({
        id: col.id,
        boardId: col.boardId,
        name: col.name,
        description: col.description,
        position: col.position,
        category: col.category === 'TODO' ? 'To Do' : col.category === 'IN_PROGRESS' ? 'In Progress' : 'Done',
        isDefault: col.isDefault,
        color: col.color,
        createdAt: col.createdAt,
        updatedAt: col.updatedAt,
        tickets: col.tickets.map((t) => ({
          ...t,
          status: t.status === 'TODO' ? 'To Do' : t.status === 'IN_PROGRESS' ? 'In Progress' : 'Done',
          commentsCount: t._count?.comments || 0,
        })),
      }));

      const allTickets = formattedColumns.flatMap((col) => col.tickets);

      return res.status(200).json({
        success: true,
        project,
        board: {
          id: board!.id,
          projectId: board!.projectId,
          name: board!.name,
          createdAt: board!.createdAt,
          columns: formattedColumns,
        },
        tickets: allTickets,
      });
    } catch (error: any) {
      console.error('[BoardColumnController.getProjectBoard] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async createColumn(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const auth = await AuthorizationService.authorize(req, PERMISSIONS.BOARD_MANAGE_COLUMNS, projectId);
      if (!auth.authorized) {
        return res.status(auth.status || 403).json({ success: false, error: auth.reason });
      }

      const parsed = createColumnSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: (parsed.error as any).issues?.[0]?.message || parsed.error.message,
        });
      }

      const { name, description, category, color } = parsed.data;

      let board = await prisma.board.findFirst({ where: { projectId } });
      if (!board) {
        board = await prisma.board.create({ data: { projectId, name: 'Main Board' } });
      }

      const existingCol = await prisma.boardColumn.findFirst({
        where: {
          boardId: board.id,
          name: { equals: name.trim(), mode: 'insensitive' },
        },
      });

      if (existingCol) {
        return res.status(409).json({
          success: false,
          error: `A column named "${name}" already exists on this board.`,
        });
      }

      const maxPosCol = await prisma.boardColumn.findFirst({
        where: { boardId: board.id },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      const nextPosition = (maxPosCol?.position ?? -1) + 1;

      let dbCat: TicketStatus = TicketStatus.TODO;
      if (category === 'In Progress' || category === 'IN_PROGRESS') {
        dbCat = TicketStatus.IN_PROGRESS;
      } else if (category === 'Done' || category === 'DONE') {
        dbCat = TicketStatus.DONE;
      }

      const column = await prisma.boardColumn.create({
        data: {
          boardId: board.id,
          name: name.trim(),
          description: description || null,
          category: dbCat,
          position: nextPosition,
          isDefault: false,
          color: color || '#526174',
        },
      });

      return res.status(201).json({
        success: true,
        column: {
          id: column.id,
          boardId: column.boardId,
          name: column.name,
          description: column.description,
          position: column.position,
          category: column.category === 'TODO' ? 'To Do' : column.category === 'IN_PROGRESS' ? 'In Progress' : 'Done',
          isDefault: column.isDefault,
          color: column.color,
          tickets: [],
        },
      });
    } catch (error: any) {
      console.error('[BoardColumnController.createColumn] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async reorderColumns(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const auth = await AuthorizationService.authorize(req, PERMISSIONS.BOARD_MANAGE_COLUMNS, projectId);
      if (!auth.authorized) {
        return res.status(auth.status || 403).json({ success: false, error: auth.reason });
      }

      const parsed = reorderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: (parsed.error as any).issues?.[0]?.message || parsed.error.message,
        });
      }

      const { columnOrders } = parsed.data;

      const board = await prisma.board.findFirst({ where: { projectId } });
      if (!board) {
        return res.status(404).json({ success: false, error: 'Board not found' });
      }

      await prisma.$transaction(
        columnOrders.map((item) =>
          prisma.boardColumn.update({
            where: { id: item.id },
            data: { position: item.position },
          })
        )
      );

      const updatedColumns = await prisma.boardColumn.findMany({
        where: { boardId: board.id },
        orderBy: { position: 'asc' },
      });

      return res.status(200).json({
        success: true,
        message: 'Columns reordered successfully',
        columns: updatedColumns,
      });
    } catch (error: any) {
      console.error('[BoardColumnController.reorderColumns] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async updateColumn(req: Request, res: Response) {
    try {
      const { id: projectId, columnId } = req.params;
      const auth = await AuthorizationService.authorize(req, PERMISSIONS.BOARD_MANAGE_COLUMNS, projectId);
      if (!auth.authorized) {
        return res.status(auth.status || 403).json({ success: false, error: auth.reason });
      }

      const parsed = updateColumnSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: (parsed.error as any).issues?.[0]?.message || parsed.error.message,
        });
      }

      const existingCol = await prisma.boardColumn.findUnique({
        where: { id: columnId },
        include: { board: true },
      });

      if (!existingCol || existingCol.board.projectId !== projectId) {
        return res.status(404).json({ success: false, error: 'Column not found on this project' });
      }

      const { name, description, category, color } = parsed.data;

      if (name && name.trim().toLowerCase() !== existingCol.name.toLowerCase()) {
        const dup = await prisma.boardColumn.findFirst({
          where: {
            boardId: existingCol.boardId,
            id: { not: columnId },
            name: { equals: name.trim(), mode: 'insensitive' },
          },
        });
        if (dup) {
          return res.status(409).json({
            success: false,
            error: `Another column named "${name}" already exists on this board`,
          });
        }
      }

      let dbCat: TicketStatus | undefined;
      if (category) {
        if (category === 'In Progress' || category === 'IN_PROGRESS') {
          dbCat = TicketStatus.IN_PROGRESS;
        } else if (category === 'Done' || category === 'DONE') {
          dbCat = TicketStatus.DONE;
        } else {
          dbCat = TicketStatus.TODO;
        }
      }

      const updated = await prisma.boardColumn.update({
        where: { id: columnId },
        data: {
          name: name ? name.trim() : undefined,
          description: description !== undefined ? description : undefined,
          category: dbCat,
          color: color !== undefined ? color : undefined,
        },
      });

      return res.status(200).json({
        success: true,
        column: {
          ...updated,
          category: updated.category === 'TODO' ? 'To Do' : updated.category === 'IN_PROGRESS' ? 'In Progress' : 'Done',
        },
      });
    } catch (error: any) {
      console.error('[BoardColumnController.updateColumn] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async deleteColumn(req: Request, res: Response) {
    try {
      const { id: projectId, columnId } = req.params;
      const auth = await AuthorizationService.authorize(req, PERMISSIONS.BOARD_MANAGE_COLUMNS, projectId);
      if (!auth.authorized) {
        return res.status(auth.status || 403).json({ success: false, error: auth.reason });
      }

      const fallbackColumnId = req.body?.fallbackColumnId || (req.query?.fallbackColumnId as string | undefined);

      const column = await prisma.boardColumn.findUnique({
        where: { id: columnId },
        include: {
          board: true,
          _count: { select: { tickets: true } },
        },
      });

      if (!column || column.board.projectId !== projectId) {
        return res.status(404).json({ success: false, error: 'Column not found on this project' });
      }

      const totalColumns = await prisma.boardColumn.count({
        where: { boardId: column.boardId },
      });
      if (totalColumns <= 1) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete the only column on the board.',
        });
      }

      const ticketCount = column._count.tickets;

      if (ticketCount > 0) {
        if (!fallbackColumnId) {
          return res.status(400).json({
            success: false,
            error: `This column contains ${ticketCount} ticket(s). Please specify a fallback destination column ID (fallbackColumnId) to safely reassign them before deletion.`,
            ticketCount,
          });
        }

        const fallbackCol = await prisma.boardColumn.findUnique({
          where: { id: fallbackColumnId },
        });

        if (!fallbackCol || fallbackCol.boardId !== column.boardId || fallbackCol.id === columnId) {
          return res.status(400).json({
            success: false,
            error: 'Invalid destination fallbackColumnId provided. Must belong to the same board.',
          });
        }

        await prisma.$transaction([
          prisma.ticket.updateMany({
            where: { columnId },
            data: {
              columnId: fallbackColumnId,
              status: fallbackCol.category,
            },
          }),
          prisma.boardColumn.delete({ where: { id: columnId } }),
        ]);

        return res.status(200).json({
          success: true,
          message: `Column "${column.name}" deleted and ${ticketCount} ticket(s) migrated to "${fallbackCol.name}".`,
        });
      }

      await prisma.boardColumn.delete({ where: { id: columnId } });

      return res.status(200).json({
        success: true,
        message: `Column "${column.name}" deleted successfully.`,
      });
    } catch (error: any) {
      console.error('[BoardColumnController.deleteColumn] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}
