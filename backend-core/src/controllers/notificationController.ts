import { Request, Response } from 'express';
import { authenticateRequest } from '../lib/auth.js';
import { handleControllerError } from '../lib/apiError.js';
import { NotificationService } from '../services/notificationService.js';

export class NotificationController {
  static async list(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const unreadOnly = req.query.unread === 'true';
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const notifications = await NotificationService.list(user.id, {
        unreadOnly,
        limit: Number.isFinite(limit) ? limit : 50,
      });
      return res.status(200).json({ success: true, notifications });
    } catch (error) {
      return handleControllerError(res, error, '[NotificationController.list]');
    }
  }

  static async unreadCount(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const count = await NotificationService.unreadCount(user.id);
      return res.status(200).json({ success: true, count });
    } catch (error) {
      return handleControllerError(res, error, '[NotificationController.unreadCount]');
    }
  }

  static async markRead(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const notification = await NotificationService.markRead(user.id, req.params.id);
      return res.status(200).json({ success: true, notification });
    } catch (error) {
      return handleControllerError(res, error, '[NotificationController.markRead]');
    }
  }

  static async markAllRead(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const updatedCount = await NotificationService.markAllRead(user.id);
      return res.status(200).json({ success: true, updatedCount });
    } catch (error) {
      return handleControllerError(res, error, '[NotificationController.markAllRead]');
    }
  }
}
