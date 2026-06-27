import { Router } from 'express';
import * as ctrl from './plugin.controller';
import { validate } from '../../middlewares/validate';
import { optionalAuth } from '../../middlewares/auth';

const router = Router();

router.get('/', ctrl.list);
router.get('/:slug/versions', ctrl.versions);
router.get('/:slug/latest', ctrl.latest);
router.post('/check-update', validate({ body: ctrl.checkUpdateSchema }), ctrl.checkUpdate);
router.post('/:slug/download', optionalAuth, ctrl.download);

export default router;
