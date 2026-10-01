import { Router } from 'express';
import { UsersController } from '../controllers/users.controller';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';

const router = Router();
const controller = new UsersController();

router.get('/me', authenticateToken, controller.getCurrentUser);
router.get('/', authenticateToken, requireRole('admin'), controller.listUsers);
router.put('/:id', authenticateToken, controller.updateProfile);

export const usersRouter = router;
