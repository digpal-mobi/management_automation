import { Router } from 'express';
import { TicketController } from '../controllers/ticketController.js';

const router = Router();

router.post('/', TicketController.createTicket);
router.get('/:id', TicketController.getTicketById);
router.patch('/:id', TicketController.updateTicket);
router.delete('/:id', TicketController.deleteTicket);

export default router;
