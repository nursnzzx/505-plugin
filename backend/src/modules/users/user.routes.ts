import { Router } from 'express';
import * as ctrl from './user.controller';
import { validate } from '../../middlewares/validate';
import { requireAuth, requireUser } from '../../middlewares/auth';

const router = Router();

router.use(requireAuth, requireUser);

router.get('/me', ctrl.getMe);
router.patch('/me', validate({ body: ctrl.updateProfileSchema }), ctrl.updateMe);
router.get('/me/activity', ctrl.myActivity);
router.get('/me/stats', ctrl.myStats);

export default router;
