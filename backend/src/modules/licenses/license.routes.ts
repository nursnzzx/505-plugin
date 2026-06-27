import { Router } from 'express';
import * as ctrl from './license.controller';
import { validate } from '../../middlewares/validate';
import { optionalAuth, requireAuth, requireUser } from '../../middlewares/auth';
import { strictLimiter, verifyLimiter } from '../../middlewares/rate-limit';
import {
  activateSchema,
  deactivateSchema,
  deviceDeleteSchema,
  renewSchema,
  statusQuerySchema,
  verifySchema,
} from './license.validators';

const router = Router();

// Plugin-facing endpoints (key-authenticated, optional JWT for account binding).
router.post('/activate', strictLimiter, optionalAuth, validate({ body: activateSchema }), ctrl.activate);
router.post('/verify', verifyLimiter, validate({ body: verifySchema }), ctrl.verify);
router.post('/heartbeat', verifyLimiter, validate({ body: verifySchema }), ctrl.heartbeat);
router.post('/deactivate', strictLimiter, optionalAuth, validate({ body: deactivateSchema }), ctrl.deactivate);
router.get('/status', validate({ query: statusQuerySchema }), ctrl.status);

// Account-facing endpoints (JWT required).
router.get('/me', requireAuth, requireUser, ctrl.me);
router.get('/history', requireAuth, ctrl.history);
router.get('/devices', requireAuth, ctrl.devices);
router.delete('/device', requireAuth, validate({ body: deviceDeleteSchema }), ctrl.removeDevice);
router.post('/renew', requireAuth, validate({ body: renewSchema }), ctrl.renew);

export default router;
