import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateBody } from '../middlewares/validator.middleware';
import { loginSchema, registerSchema } from '../utils/validators';

const router = Router();
const controller = new AuthController();

router.post('/register', validateBody(registerSchema), controller.register);
router.post('/login', validateBody(loginSchema), controller.login);
router.post('/refresh', controller.refreshToken);

export const authRouter = router;
