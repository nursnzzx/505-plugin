import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { dashboard } from './admin.dashboard.controller';
import * as lic from './admin.licenses.controller';
import * as res from './admin.resources.controller';

const router = Router();

// Every admin route requires an admin principal.
router.use(requireAuth, requireAdmin());

// Dashboard
router.get('/dashboard', dashboard);

// Licenses + generator
router.get('/licenses', lic.list);
router.get('/licenses/export.csv', lic.exportCsv);
router.get('/licenses/:id', lic.detail);
router.post('/licenses/generate', validate({ body: lic.generateSchema }), lic.generate);
router.post('/licenses/:id/status', validate({ body: lic.transitionSchema }), lic.transition);
router.post('/licenses/:id/renew', lic.renew);
router.delete('/licenses/:id', requireAdmin('SUPER_ADMIN', 'ADMIN'), lic.remove);

// Users
router.get('/users', res.listUsers);
router.get('/users/:id', res.userDetail);
router.post('/users/:id/ban', res.setUserBan);

// Devices
router.get('/devices', res.listDevices);
router.delete('/devices/:id', res.resetDevice);

// Announcements
router.get('/announcements', res.listAnnouncements);
router.post('/announcements', validate({ body: res.createAnnouncementSchema }), res.createAnnouncement);
router.patch('/announcements/:id', validate({ body: res.updateAnnouncementSchema }), res.updateAnnouncement);
router.delete('/announcements/:id', res.deleteAnnouncement);

// Plugin versions
router.get('/plugins', res.listPluginVersions);
router.post('/plugins', validate({ body: res.createPluginVersionSchema }), res.createPluginVersion);
router.delete('/plugins/:id', res.deletePluginVersion);

// Promo codes
router.get('/promos', res.listPromos);
router.post('/promos', validate({ body: res.createPromoSchema }), res.createPromo);
router.delete('/promos/:id', res.deletePromo);

// Payments & subscriptions
router.get('/payments', res.listPayments);
router.get('/subscriptions', res.listSubscriptions);

// Audit logs
router.get('/logs', res.listAuditLogs);

// Broadcast
router.post('/broadcast', validate({ body: res.broadcastNotificationSchema }), res.broadcast);

export default router;
