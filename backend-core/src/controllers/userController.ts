import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateRequest } from '../lib/auth.js';
import { assertRateLimit } from '../lib/rateLimit.js';
import { handleControllerError } from '../lib/apiError.js';

export class UserController {
  static async getMe(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      return res.status(200).json({ success: true, user });
    } catch (error) {
      return handleControllerError(res, error, '[UserController.getMe]');
    }
  }

  static async searchUsers(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

      assertRateLimit(`user-search:${user.id}`, 60, 60_000);

      const query = String(req.query.q || '').trim().toLowerCase();
      if (query.length < 2) {
        return res.status(200).json({ success: true, users: [] });
      }

      const users = await prisma.user.findMany({
        where: {
          id: { not: user.id },
          OR: [
            { email: { contains: query, mode: 'insensitive' } },
            { username: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 8,
        orderBy: { username: 'asc' },
        select: { id: true, username: true, email: true, avatarUrl: true },
      });

      return res.status(200).json({ success: true, users });
    } catch (error) {
      return handleControllerError(res, error, '[UserController.searchUsers]');
    }
  }

  static async getUsers(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const users = await prisma.user.findMany({
        orderBy: { username: 'asc' },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
        },
      });
      return res.status(200).json({ success: true, users });
    } catch (error: any) {
      console.error('[UserController.getUsers] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}
