import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController.js';

const router = Router();

router.get('/', NotificationController.list);
router.get('/unread-count', NotificationController.unreadCount);
router.post('/read-all', NotificationController.markAllRead);
router.post('/:id/read', NotificationController.markRead);

export default router;
