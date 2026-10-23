import { Router } from 'express';
import { AuthorizationController } from '../controllers/authorizationController.js';

const router = Router();

router.get('/permissions', AuthorizationController.getPermissions);
router.get('/roles', AuthorizationController.getRoles);
router.post('/roles', AuthorizationController.createRole);
router.get('/roles/:id', AuthorizationController.getRoleById);
router.put('/roles/:id', AuthorizationController.updateRole);
router.delete('/roles/:id', AuthorizationController.deleteRole);

router.get('/user-permissions', AuthorizationController.getUserPermissions);
router.post('/assign', AuthorizationController.assignRole);
router.post('/unassign', AuthorizationController.unassignRole);

export default router;
