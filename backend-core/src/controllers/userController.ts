import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export class UserController {
  static async getUsers(req: Request, res: Response) {
    try {
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
