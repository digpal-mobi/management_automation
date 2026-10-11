import { Router } from 'express';
import { MessageController } from '../controllers/messageController.js';

const router = Router();

// Mounted on /api/tickets
router.get('/:id/messages', MessageController.getTicketMessages);
router.post('/:id/messages', MessageController.createMessage);
router.post('/:id/ai-chat', MessageController.askAi);

export default router;
