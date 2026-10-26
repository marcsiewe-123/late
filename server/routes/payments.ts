/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { sasPayProvider } from '../saspay';
import {
  Currency,
  MobileMoneyOperator,
  PaymentOrder,
  PaymentOrderStatus,
} from '../../src/types';

export const paymentRouter = Router();

// Create Payment Order and Initialize with SasPay
paymentRouter.post('/initialize', async (req: Request, res: Response) => {
  try {
    const orgId = req.headers['x-org-id'] as string;
    if (!orgId) return res.status(400).json({ error: 'Organisation requise' });

    const org = db.getOrganizationById(orgId);
    if (!org) return res.status(404).json({ error: 'Organisation introuvable' });

    const { planId, phone, operator, currency, country, billingCycle = 'monthly' } = req.body;
    const plan = db.getPlanById(planId);
    if (!plan) return res.status(404).json({ error: 'Plan d’abonnement invalide' });

    if (!phone || !operator) {
      return res.status(400).json({
        error: 'Champs manquants',
        message: 'Numéro de téléphone et opérateur Mobile Money sont requis.',
      });
    }

    const orderCurrency: Currency = currency || org.currency || 'XAF';
    let baseAmount = orderCurrency === 'XOF' ? plan.priceXOF : plan.priceXAF;

    if (billingCycle === 'annual') {
      // 10 months paid for 12 months (2 months free)
      baseAmount = baseAmount * 10;
    }

    const orderRef = `SAS-${operator.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    const idempotencyKey = `idemp_${orderRef}_${Date.now()}`;

    // Initialize with SasPay Provider
    const initResponse = await sasPayProvider.initializePayment({
      orderReference: orderRef,
      amount: baseAmount,
      currency: orderCurrency,
      operator: operator as MobileMoneyOperator,
      phone,
      country: country || org.country,
      customerName: org.name,
      customerEmail: (req.headers['x-user-email'] as string) || 'contact@client.com',
      description: `Abonnement ${plan.name} (${billingCycle === 'annual' ? 'Annuel' : 'Mensuel'}) - ${org.name}`,
    });

    const order: PaymentOrder = {
      id: `order_${Date.now()}`,
      reference: orderRef,
      organizationId: org.id,
      organizationName: org.name,
      planId: plan.id,
      planName: `${plan.name} (${billingCycle === 'annual' ? 'Annuel' : 'Mensuel'})`,
      amount: baseAmount,
      currency: orderCurrency,
      phone,
      operator: operator as MobileMoneyOperator,
      country: country || org.country,
      status: 'pending',
      sasPayRef: initResponse.sasPayTransactionId,
      idempotencyKey,
      instructions: initResponse.instructions,
      createdAt: new Date().toISOString(),
      mode: sasPayProvider.getEnvironment() === 'production' ? 'live' : 'sandbox',
    };

    db.addPaymentOrder(order);

    return res.status(201).json({
      success: true,
      order,
      instructions: initResponse.instructions,
      ussdPromptCode: initResponse.ussdPromptCode,
      checkoutUrl: initResponse.checkoutUrl,
      deepLinkUrl: initResponse.checkoutUrl,
      mode: order.mode,
    });
  } catch (err: any) {
    console.error('Error in payment initialize:', err);
    return res.status(500).json({ error: 'Erreur paiement', message: err.message });
  }
});

// Official SasPay Webhook Endpoint (https://docs.saspay.me/)
paymentRouter.post('/webhook', async (req: Request, res: Response) => {
  try {
    const rawPayload = (req as any).rawBody || JSON.stringify(req.body);
    const signature =
      (req.headers['x-webhook-signature'] as string) ||
      (req.headers['x-saspay-signature'] as string) ||
      '';
    const timestamp = (req.headers['x-webhook-timestamp'] as string) || '';
    const eventType = (req.headers['x-webhook-event'] as string) || req.body.event || req.body.eventType || '';

    // Verify cryptographic signature according to docs.saspay.me (timestamp + '.' + rawBody)
    const isValidSignature = sasPayProvider.verifyWebhookSignature(rawPayload, signature, timestamp);
    const isSandboxSimulation = req.headers['x-sandbox-simulation'] === 'true';

    if (!isValidSignature && !isSandboxSimulation) {
      console.warn('Invalid SasPay webhook signature detected');
      db.addSystemIncident({
        id: `inc_sec_${Date.now()}`,
        component: 'SasPay Webhook Guard',
        description: 'Tentative de webhook rejetée : signature HMAC non valide ou timestamp expiré (>300s).',
        severity: 'error',
        errorDetails: `Signature reçue: ${signature.substring(0, 10)}... | Timestamp: ${timestamp}`,
        status: 'identified',
        canRepair: false,
        repairAuditLog: ['Rejet immédiat HTTP 401 conformément à docs.saspay.me'],
        createdAt: new Date().toISOString(),
      });
      return res.status(401).json({ error: 'Signature invalide ou timestamp expiré' });
    }

    // Support both direct payload and docs.saspay.me wrapped structure
    const dataObj = req.body.data || req.body;
    const orderReference = req.body.orderReference || dataObj.orderReference || dataObj.reference;
    const eventId = req.body.eventId || dataObj.id || `evt_${Date.now()}`;
    const status = dataObj.status || (eventType === 'transaction.success' ? 'SUCCESS' : 'PENDING');
    const sasPayTransactionId = dataObj.id || dataObj.sasPayTransactionId;
    const failureReason = req.body.failureReason || dataObj.failureReason;

    if (!orderReference) {
      return res.status(400).json({ error: 'Référence de commande manquante' });
    }

    // Idempotency check: prevent double processing
    if (eventId && sasPayProvider.isEventAlreadyProcessed(eventId)) {
      return res.status(200).json({ message: 'Événement déjà traité (Idempotent)' });
    }

    const order = db.getPaymentOrderById(orderReference);
    if (!order) {
      return res.status(404).json({ error: 'Commande introuvable' });
    }

    if (status === 'confirmed' || status === 'SUCCESS' || eventType === 'transaction.success') {
      if (order.status === 'confirmed') {
        return res.status(200).json({ message: 'Commande déjà confirmée' });
      }

      const now = new Date();
      const receiptNumber = `REC-${now.getFullYear()}-${order.currency}-${Math.floor(1000 + Math.random() * 9000)}`;

      db.updatePaymentOrder(order.id, {
        status: 'confirmed',
        confirmedAt: now.toISOString(),
        receiptNumber,
        sasPayRef: sasPayTransactionId || order.sasPayRef,
      });

      // Atomically activate or extend subscription
      const existingSub = db.getSubscriptionByOrg(order.organizationId);
      const plan = db.getPlanById(order.planId);
      const daysToAdd = order.planName.includes('Annuel') ? 365 : 30;

      let startsAt = now;
      let endsAt = new Date(now.getTime() + daysToAdd * 24 * 3600 * 1000);

      // If already active, extend from current endsAt
      if (existingSub && existingSub.status === 'active' && new Date(existingSub.endsAt) > now) {
        startsAt = new Date(existingSub.startsAt);
        endsAt = new Date(new Date(existingSub.endsAt).getTime() + daysToAdd * 24 * 3600 * 1000);
      }

      const updatedSub = existingSub
        ? db.updateSubscription(existingSub.id, {
            status: 'active',
            planId: plan ? plan.id : existingSub.planId,
            planCode: plan ? plan.code : 'business',
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            maxEmployees: plan ? plan.maxEmployees : 50,
            autoRenew: true,
            paymentMethod: `SasPay (${order.operator.toUpperCase()} ${order.country})`,
            lastPaymentOrderId: order.id,
          })
        : db.addSubscription({
            id: `sub_${Date.now()}`,
            organizationId: order.organizationId,
            planId: plan ? plan.id : 'plan_business',
            planCode: plan ? plan.code : 'business',
            status: 'active',
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            autoRenew: true,
            paymentMethod: `SasPay (${order.operator.toUpperCase()} ${order.country})`,
            lastPaymentOrderId: order.id,
            maxEmployees: plan ? plan.maxEmployees : 50,
          });

      // Audit Log
      db.addAuditLog({
        id: `aud_${Date.now()}`,
        organizationId: order.organizationId,
        organizationName: order.organizationName,
        actorId: 'saspay_webhook',
        actorName: 'Passerelle SasPay Mobile Money',
        actorRole: 'admin',
        action: 'PAYMENT_CONFIRMED_SUBSCRIPTION_ACTIVATED',
        targetEntity: 'Subscription',
        targetId: updatedSub?.id || 'sub',
        details: `Paiement de ${order.amount.toLocaleString('fr-FR')} ${order.currency} confirmé via ${order.operator}. Abonnement activé jusqu'au ${endsAt.toLocaleDateString('fr-FR')}.`,
        timestamp: now.toISOString(),
      });

      // Client Notification
      db.addNotification({
        id: `notif_${Date.now()}`,
        organizationId: order.organizationId,
        title: 'Abonnement activé avec succès !',
        message: `Votre paiement Mobile Money de ${order.amount.toLocaleString('fr-FR')} ${order.currency} a été validé. Reçu N° ${receiptNumber}.`,
        type: 'payment_confirmed',
        read: false,
        createdAt: now.toISOString(),
      });

      if (eventId) sasPayProvider.markEventProcessed(eventId);

      return res.status(200).json({
        success: true,
        message: 'Paiement confirmé et abonnement activé',
        receiptNumber,
      });
    } else {
      // Payment Failed or Expired
      db.updatePaymentOrder(order.id, {
        status: 'failed',
        failureReason: failureReason || 'Transaction refusée ou délai USSD expiré sur le téléphone.',
      });

      db.addNotification({
        id: `notif_${Date.now()}`,
        organizationId: order.organizationId,
        title: 'Échec du paiement Mobile Money',
        message: `La transaction pour ${order.planName} a échoué. Aucun montant n’a été débité.`,
        type: 'payment_failed',
        read: false,
        createdAt: new Date().toISOString(),
      });

      if (eventId) sasPayProvider.markEventProcessed(eventId);

      return res.status(200).json({ success: true, message: 'Statut échoué enregistré' });
    }
  } catch (err: any) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: 'Webhook processing error', message: err.message });
  }
});

// Sandbox Simulator: Trigger test callback with valid signature
paymentRouter.post('/sandbox-simulate', async (req: Request, res: Response) => {
  try {
    const { orderReference, simulateStatus = 'confirmed', failureReason } = req.body;
    const order = db.getPaymentOrderById(orderReference);
    if (!order) {
      return res.status(404).json({ error: 'Commande introuvable pour test sandbox' });
    }

    const timestampSeconds = Math.floor(Date.now() / 1000).toString();
    const eventType = simulateStatus === 'confirmed' ? 'transaction.success' : 'transaction.failed';

    const eventPayload = {
      event: eventType,
      data: {
        id: `SP_TX_${Date.now()}`,
        status: simulateStatus === 'confirmed' ? 'SUCCESS' : 'FAILED',
        amount: order.amount.toFixed(2),
        currency: order.currency,
        reference: order.reference,
        net_amount: order.amount.toFixed(2),
        failureReason: failureReason || (simulateStatus === 'failed' ? 'Paiement annulé par l’utilisateur' : undefined),
      },
      orderReference: order.reference,
    };

    const payloadString = JSON.stringify(eventPayload);
    const signature = sasPayProvider.generateTestSignature(payloadString, timestampSeconds);

    // Call our own webhook handler logic directly with signed payload
    const mockReq = {
      body: eventPayload,
      rawBody: Buffer.from(payloadString, 'utf-8'),
      headers: {
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestampSeconds,
        'x-webhook-event': eventType,
        'x-sandbox-simulation': 'true',
      },
    } as any;

    let responseResult: any = null;
    const mockRes = {
      status: (code: number) => ({
        json: (data: any) => {
          responseResult = { code, data };
        },
      }),
    } as any;

    // Execute internal handler
    const handler = (paymentRouter as any).stack.find(
      (r: any) => r.route && r.route.path === '/webhook' && r.route.methods.post
    );

    if (handler) {
      await handler.route.stack[0].handle(mockReq, mockRes);
    }

    const updatedOrder = db.getPaymentOrderById(orderReference);
    const updatedSub = db.getSubscriptionByOrg(order.organizationId);

    return res.json({
      success: true,
      simulationResult: responseResult,
      order: updatedOrder,
      subscription: updatedSub,
      message:
        simulateStatus === 'confirmed'
          ? 'Simulation Sandbox réussie (HMAC SHA-256 validé) : abonnement activé.'
          : 'Simulation Sandbox réussie : échec enregistré sans débit.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erreur simulateur sandbox', message: err.message });
  }
});

// Verification / Reconciliation (GET /api/v1/payments/{payment_id}/verify/ per docs.saspay.me)
paymentRouter.get('/verify/:id', async (req: Request, res: Response) => {
  const order = db.getPaymentOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Commande introuvable' });

  // Query status via provider verify endpoint
  const verifyRes = await sasPayProvider.queryTransactionStatus(order.sasPayRef || order.reference);

  if (verifyRes.status === 'confirmed' && order.status !== 'confirmed') {
    db.updatePaymentOrder(order.id, {
      status: 'confirmed',
      confirmedAt: verifyRes.confirmedAt || new Date().toISOString(),
      receiptNumber: `REC-${new Date().getFullYear()}-${order.currency}-${Math.floor(1000 + Math.random() * 9000)}`,
    });
  }

  const refreshedOrder = db.getPaymentOrderById(order.id);

  return res.json({
    order: refreshedOrder,
    isConfirmed: refreshedOrder?.status === 'confirmed',
    gatewayVerification: verifyRes,
  });
});

// Client Payment History
paymentRouter.get('/history', (req: Request, res: Response) => {
  const orgId = req.headers['x-org-id'] as string;
  const orders = db.getPaymentOrders(orgId);
  return res.json({ orders });
});
