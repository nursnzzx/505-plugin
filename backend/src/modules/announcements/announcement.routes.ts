import { Router } from 'express';
import * as ctrl from './announcement.controller';

const router = Router();

router.get('/', ctrl.list);
router.get('/:id', ctrl.detail);

export default router;
