import { Router } from 'express';
import * as ctrl from './telemetry.controller';
import { validate } from '../../middlewares/validate';
import { globalLimiter } from '../../middlewares/rate-limit';

const router = Router();

router.post('/crash', globalLimiter, validate({ body: ctrl.crashSchema }), ctrl.reportCrash);
router.post('/logs', globalLimiter, validate({ body: ctrl.logsSchema }), ctrl.uploadLogs);
router.get('/bootstrap', ctrl.bootstrap);

export default router;
