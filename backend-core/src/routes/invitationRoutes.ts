import { Router } from 'express';
import { InvitationController } from '../controllers/invitationController.js';

const router = Router();

router.get('/pending', InvitationController.listPending);
router.post('/:id/accept', InvitationController.accept);
router.post('/:id/decline', InvitationController.decline);

export default router;
