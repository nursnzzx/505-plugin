import type { PaymentProvider } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { licenseService } from '../licenses/license.service';
import { createNotification } from '../../services/notification.service';
import { logActivity } from '../../services/activity.service';
import { NotFoundError } from '../../utils/errors';

interface CreateInvoiceInput {
  userId: string;
  planId: string;
  provider: PaymentProvider;
}

/**
 * Provider-agnostic payment flow. Each provider (Telegram Stars, Stripe, Crypto,
 * Manual) creates a PENDING payment, then a webhook marks it PAID and fulfills
 * the order (issues/renews a license + subscription).
 */
export const paymentService = {
  async createInvoice({ userId, planId, provider }: CreateInvoiceInput) {
    const plan = await prisma.licensePlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundError('Plan not found');

    const payment = await prisma.payment.create({
      data: {
        userId,
        provider,
        status: 'PENDING',
        amountCents: plan.priceCents,
        currency: plan.currency,
        description: `${plan.name} (${plan.code})`,
        meta: { planId },
      },
    });

    // Real integrations would build a provider checkout/invoice URL here.
    const invoiceUrl = buildInvoiceUrl(provider, payment.id, plan.priceCents, plan.currency);
    await prisma.payment.update({ where: { id: payment.id }, data: { invoiceUrl } });

    return { paymentId: payment.id, invoiceUrl, amountCents: plan.priceCents, currency: plan.currency };
  },

  /** Marks a payment PAID and fulfills the associated plan. Idempotent. */
  async fulfill(paymentId: string, externalId?: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError('Payment not found');
    if (payment.status === 'PAID') return payment;

    const planId = (payment.meta as { planId?: string } | null)?.planId;
    const plan = planId ? await prisma.licensePlan.findUnique({ where: { id: planId } }) : null;

    const paid = await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'PAID', paidAt: new Date(), externalId },
    });

    if (plan) {
      // Issue (or extend) the user's license for this plan's tier.
      const existing = await prisma.license.findFirst({
        where: { userId: payment.userId, tier: plan.tier },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) {
        await licenseService.renew(existing.id, plan.durationDays || 30, { type: 'SYSTEM' });
        await prisma.payment.update({ where: { id: paymentId }, data: { licenseId: existing.id } });
      } else {
        const license = await licenseService.createLicense({
          tier: plan.tier,
          userId: payment.userId,
          planId: plan.id,
          durationDays: plan.durationDays || null,
          maxDevices: plan.maxDevices,
          status: 'ACTIVE',
          actor: { type: 'SYSTEM' },
        });
        await prisma.payment.update({ where: { id: paymentId }, data: { licenseId: license.id } });
      }

      // Maintain a subscription record for recurring plans.
      if (plan.durationDays > 0) {
        await prisma.subscription.create({
          data: {
            userId: payment.userId,
            planId: plan.id,
            provider: payment.provider,
            status: 'ACTIVE',
            currentPeriodEnd: new Date(Date.now() + plan.durationDays * 86_400_000),
          },
        });
      }
    }

    const user = await prisma.user.findUnique({ where: { id: payment.userId } });
    if (user) {
      await createNotification({
        userId: user.id,
        type: 'PAYMENT',
        title: 'Payment received',
        body: `Your payment of ${(payment.amountCents / 100).toFixed(2)} ${payment.currency} was successful.`,
        channel: 'TELEGRAM',
        telegramId: user.telegramId,
      });
    }
    logActivity({ type: 'PAYMENT', userId: payment.userId, message: `Paid ${payment.amountCents}` });

    return paid;
  },

  async fail(paymentId: string) {
    return prisma.payment.update({ where: { id: paymentId }, data: { status: 'FAILED' } });
  },
};

function buildInvoiceUrl(provider: PaymentProvider, paymentId: string, amount: number, currency: string): string {
  switch (provider) {
    case 'STRIPE':
      return `https://checkout.stripe.example/pay/${paymentId}`;
    case 'TELEGRAM_STARS':
      return `tg://invoice/${paymentId}`;
    case 'CRYPTO':
      return `https://pay.crypto.example/${paymentId}?amount=${amount}&currency=${currency}`;
    case 'MANUAL':
    default:
      return `manual:${paymentId}`;
  }
}
