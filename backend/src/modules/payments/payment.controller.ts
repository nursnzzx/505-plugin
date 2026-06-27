import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma';
import { paymentService } from './payment.service';
import { asyncHandler, ok, parsePagination } from '../../utils/http';

export const createInvoiceSchema = z.object({
  planId: z.string().cuid(),
  provider: z.enum(['TELEGRAM_STARS', 'STRIPE', 'CRYPTO', 'MANUAL']).default('TELEGRAM_STARS'),
});

/** GET /plans — public pricing. */
export const listPlans = asyncHandler(async (_req: Request, res: Response) => {
  const plans = await prisma.licensePlan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  return ok(res, plans);
});

/** POST /payments/invoice — start a checkout. */
export const createInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { planId, provider } = req.body as z.infer<typeof createInvoiceSchema>;
  const result = await paymentService.createInvoice({ userId: req.auth!.sub, planId, provider });
  return ok(res, result, undefined, 201);
});

/** GET /payments/me */
export const myPayments = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, pageSize } = parsePagination(req.query);
  const [items, total] = await Promise.all([
    prisma.payment.findMany({ where: { userId: req.auth!.sub }, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.payment.count({ where: { userId: req.auth!.sub } }),
  ]);
  return ok(res, items, { page, pageSize, total });
});
