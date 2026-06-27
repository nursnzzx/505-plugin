import { Router } from 'express';
import * as ctrl from './auth.controller';
import { validate } from '../../middlewares/validate';
import { strictLimiter } from '../../middlewares/rate-limit';
import { env } from '../../config/env';

const router = Router();

router.post('/telegram', strictLimiter, validate({ body: ctrl.telegramLoginSchema }), ctrl.telegramLogin);
router.post('/admin/login', strictLimiter, validate({ body: ctrl.adminLoginSchema }), ctrl.adminLogin);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);

if (!env.isProd) {
  router.post('/dev', validate({ body: ctrl.devLoginSchema }), ctrl.devLogin);
}

export default router;
