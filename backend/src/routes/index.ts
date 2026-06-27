import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import userRoutes from '../modules/users/user.routes';
import licenseRoutes from '../modules/licenses/license.routes';
import pluginRoutes from '../modules/plugins/plugin.routes';
import telemetryRoutes from '../modules/plugins/telemetry.routes';
import announcementRoutes from '../modules/announcements/announcement.routes';
import notificationRoutes from '../modules/notifications/notification.routes';
import paymentRoutes from '../modules/payments/payment.routes';
import adminRoutes from '../modules/admin/admin.routes';
import webhookRoutes from '../webhooks/webhook.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/license', licenseRoutes);
router.use('/plugins', pluginRoutes);
router.use('/plugin', telemetryRoutes);
router.use('/news', announcementRoutes);
router.use('/notifications', notificationRoutes);
router.use('/payments', paymentRoutes);
router.use('/admin', adminRoutes);
router.use('/webhooks', webhookRoutes);

export default router;
