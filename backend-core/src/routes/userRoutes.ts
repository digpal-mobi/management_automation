import { Router } from 'express';
import { UserController } from '../controllers/userController.js';

const router = Router();

router.get('/me', UserController.getMe);
router.get('/search', UserController.searchUsers);
router.get('/', UserController.getUsers);

export default router;
