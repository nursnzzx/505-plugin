import { Router } from 'express';
import * as ctrl from './notification.controller';
import { requireAuth, requireUser } from '../../middlewares/auth';

const router = Router();

router.use(requireAuth, requireUser);

router.get('/', ctrl.list);
router.post('/:id/read', ctrl.read);
router.post('/read-all', ctrl.readAll);

export default router;
