import { Router } from 'express';
import * as ctrl from './payment.controller';
import { validate } from '../../middlewares/validate';
import { requireAuth, requireUser } from '../../middlewares/auth';

const router = Router();

router.get('/plans', ctrl.listPlans);

router.use(requireAuth, requireUser);
router.post('/invoice', validate({ body: ctrl.createInvoiceSchema }), ctrl.createInvoice);
router.get('/me', ctrl.myPayments);

export default router;
