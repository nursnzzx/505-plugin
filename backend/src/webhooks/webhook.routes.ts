import { Router } from 'express';
import * as ctrl from './webhook.controller';

const router = Router();

router.post('/stripe', ctrl.stripeWebhook);
router.post('/crypto', ctrl.cryptoWebhook);
router.post('/telegram-stars', ctrl.telegramStarsWebhook);

export default router;
