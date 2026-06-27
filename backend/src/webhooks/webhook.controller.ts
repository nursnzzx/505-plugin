import type { Request, Response } from 'express';
import { paymentService } from '../modules/payments/payment.service';
import { asyncHandler, ok } from '../utils/http';
import { logger } from '../config/logger';

/**
 * Generic payment webhook. In production each provider would verify its own
 * signature (Stripe-Signature header, crypto IPN HMAC, etc.). The handler maps
 * the provider event to our internal payment fulfillment.
 */
export const stripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const event = req.body as { type?: string; data?: { object?: { metadata?: { paymentId?: string }; id?: string } } };
  logger.info({ type: event.type }, 'Stripe webhook received');
  if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
    const paymentId = event.data?.object?.metadata?.paymentId;
    if (paymentId) await paymentService.fulfill(paymentId, event.data?.object?.id);
  }
  return ok(res, { received: true });
});

export const cryptoWebhook = asyncHandler(async (req: Request, res: Response) => {
  const { paymentId, status, txId } = req.body as { paymentId?: string; status?: string; txId?: string };
  if (paymentId && status === 'confirmed') await paymentService.fulfill(paymentId, txId);
  else if (paymentId && status === 'failed') await paymentService.fail(paymentId);
  return ok(res, { received: true });
});

export const telegramStarsWebhook = asyncHandler(async (req: Request, res: Response) => {
  // Telegram sends successful_payment inside a message update.
  const update = req.body as {
    message?: { successful_payment?: { invoice_payload?: string; telegram_payment_charge_id?: string } };
  };
  const payload = update.message?.successful_payment?.invoice_payload;
  if (payload) {
    await paymentService.fulfill(payload, update.message?.successful_payment?.telegram_payment_charge_id);
  }
  return ok(res, { received: true });
});
