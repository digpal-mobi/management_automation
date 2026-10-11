import { Router } from 'express';
import { ProjectController } from '../controllers/projectController.js';

const router = Router();

router.post('/', ProjectController.createProject);
router.get('/', ProjectController.getProjects);
router.get('/:id', ProjectController.getProjectById);
router.get('/:id/board', ProjectController.getProjectBoard);
router.get('/:id/analytics', ProjectController.getProjectAnalytics);
router.delete('/:id', ProjectController.deleteProject);

export default router;
