/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import { db, TRIAL_DURATION_MS } from '../db';
import { sasPayProvider } from '../saspay';
import { SupportInternalNote } from '../../src/types';

export const adminRouter = Router();

// Middleware: Guard Super-Admin Access
function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const userRole = req.headers['x-user-role'] as string;
  const userId = req.headers['x-user-id'] as string;

  if (userRole === 'superadmin') {
    return next();
  }

  if (userId) {
    const user = db.getUserById(userId);
    if (user && user.role === 'superadmin') {
      return next();
    }
  }

  return res.status(403).json({
    error: 'ACCÈS_INTERDIT',
    message: 'Espace réservé exclusivement au propriétaire et super-administrateur du SaaS.',
  });
}

adminRouter.use(requireSuperAdmin);

// A. Overview KPI
adminRouter.get('/overview', (req: Request, res: Response) => {
  const orgs = db.getOrganizations();
  const subs = db.getSubscriptions();
  const paymentOrders = db.getPaymentOrders();
  const tickets = db.getSupportTickets();
  const incidents = db.getSystemIncidents();

  let activeCount = 0;
  let trialingCount = 0;
  let expiredTrialCount = 0;
  let activePaidCount = 0;
  let suspendedCount = 0;

  for (const org of orgs) {
    if (org.status === 'suspended') {
      suspendedCount++;
      continue;
    }
    const evalSub = db.evaluateOrganizationSubscription(org.id);
    if (evalSub.subscription.planCode === 'trial') {
      if (evalSub.isTrialExpired) expiredTrialCount++;
      else trialingCount++;
    } else if (evalSub.subscription.status === 'active') {
      activePaidCount++;
      activeCount++;
    }
  }

  // Real collected cash (confirmed orders only!)
  const confirmedOrders = paymentOrders.filter((o) => o.status === 'confirmed');
  const pendingOrders = paymentOrders.filter((o) => o.status === 'pending');

  const totalCollectedXAF = confirmedOrders
    .filter((o) => o.currency === 'XAF')
    .reduce((acc, o) => acc + o.amount, 0);

  const totalCollectedXOF = confirmedOrders
    .filter((o) => o.currency === 'XOF')
    .reduce((acc, o) => acc + o.amount, 0);

  const totalPendingXAF = pendingOrders
    .filter((o) => o.currency === 'XAF')
    .reduce((acc, o) => acc + o.amount, 0);

  const totalPendingXOF = pendingOrders
    .filter((o) => o.currency === 'XOF')
    .reduce((acc, o) => acc + o.amount, 0);

  // MRR estimation (active monthly value)
  let mrrEstimateXAF = 0;
  let mrrEstimateXOF = 0;
  for (const org of orgs) {
    const evalSub = db.evaluateOrganizationSubscription(org.id);
    if (evalSub.subscription.status === 'active' && evalSub.subscription.planCode !== 'trial') {
      const plan = db.getPlanById(evalSub.subscription.planId);
      if (plan) {
        if (org.currency === 'XOF') mrrEstimateXOF += plan.priceXOF;
        else mrrEstimateXAF += plan.priceXAF;
      }
    }
  }

  const urgentTicketsCount = tickets.filter(
    (t) => (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'resolved' && t.status !== 'closed'
  ).length;

  const openTicketsCount = tickets.filter(
    (t) => t.status === 'new' || t.status === 'open' || t.status === 'in_progress'
  ).length;

  return res.json({
    kpis: {
      totalClients: orgs.length,
      activeClients: activeCount + trialingCount,
      trialingCount,
      expiredTrialCount,
      activePaidCount,
      suspendedCount,
      openTicketsCount,
      urgentTicketsCount,
      unresolvedIncidentsCount: incidents.filter((i) => i.status !== 'resolved').length,
    },
    finances: {
      totalCollectedXAF,
      totalCollectedXOF,
      totalPendingXAF,
      totalPendingXOF,
      mrrEstimateXAF,
      mrrEstimateXOF,
      confirmedTransactionsCount: confirmedOrders.length,
      pendingTransactionsCount: pendingOrders.length,
    },
    recentPayments: paymentOrders.slice(0, 5),
    recentClients: orgs.slice(0, 5),
  });
});

// B. Financial Breakdown & Analytics
adminRouter.get('/finances', (req: Request, res: Response) => {
  const orders = db.getPaymentOrders();
  const confirmed = orders.filter((o) => o.status === 'confirmed');

  // Breakdown by country
  const byCountry: Record<string, { xaf: number; xof: number; count: number }> = {};
  for (const ord of confirmed) {
    const c = ord.country || 'Inconnu';
    if (!byCountry[c]) byCountry[c] = { xaf: 0, xof: 0, count: 0 };
    if (ord.currency === 'XOF') byCountry[c].xof += ord.amount;
    else byCountry[c].xaf += ord.amount;
    byCountry[c].count++;
  }

  // Breakdown by operator
  const byOperator: Record<string, { amount: number; count: number }> = {};
  for (const ord of confirmed) {
    const op = ord.operator || 'Autre';
    if (!byOperator[op]) byOperator[op] = { amount: 0, count: 0 };
    byOperator[op].amount += ord.amount;
    byOperator[op].count++;
  }

  // Breakdown by plan
  const byPlan: Record<string, { amount: number; count: number }> = {};
  for (const ord of confirmed) {
    const p = ord.planName || 'Plan';
    if (!byPlan[p]) byPlan[p] = { amount: 0, count: 0 };
    byPlan[p].amount += ord.amount;
    byPlan[p].count++;
  }

  return res.json({
    orders,
    byCountry,
    byOperator,
    byPlan,
  });
});

// C. Clients Management List
adminRouter.get('/clients', (req: Request, res: Response) => {
  const orgs = db.getOrganizations();
  const users = db.getUsers();
  const orders = db.getPaymentOrders();
  const tickets = db.getSupportTickets();

  const clients = orgs.map((org) => {
    const owner = users.find((u) => u.organizationId === org.id && u.role === 'owner');
    const evalSub = db.evaluateOrganizationSubscription(org.id);
    const orgOrders = orders.filter((o) => o.organizationId === org.id && o.status === 'confirmed');
    const totalPaid = orgOrders.reduce((acc, o) => acc + o.amount, 0);
    const lastPayment = orgOrders[0]?.confirmedAt;
    const openTickets = tickets.filter(
      (t) => t.organizationId === org.id && t.status !== 'resolved' && t.status !== 'closed'
    ).length;
    const employeesCount = db.getEmployees(org.id).length;

    return {
      organization: org,
      owner,
      subscription: evalSub.subscription,
      isTrialExpired: evalSub.isTrialExpired,
      remainingTrialSeconds: evalSub.remainingTrialSeconds,
      totalPaid,
      currency: org.currency,
      lastPayment,
      openTickets,
      employeesCount,
    };
  });

  return res.json({ clients });
});

// Client Actions: Extend Trial
adminRouter.post('/clients/:id/extend-trial', (req: Request, res: Response) => {
  const org = db.getOrganizationById(req.params.id);
  if (!org) return res.status(404).json({ error: 'Client introuvable' });

  const { extensionHours = 48, justification } = req.body;
  if (!justification) {
    return res.status(400).json({
      error: 'JUSTIFICATION_REQUIRED',
      message: 'Une justification écrite est obligatoire pour prolonger exceptionnellement un essai gratuit.',
    });
  }

  const sub = db.getSubscriptionByOrg(org.id);
  if (!sub) return res.status(404).json({ error: 'Abonnement introuvable' });

  const now = Date.now();
  // Extend from either current trialEndsAt or from now
  const baseTime = sub.trialEndsAt && new Date(sub.trialEndsAt).getTime() > now
    ? new Date(sub.trialEndsAt).getTime()
    : now;

  const newTrialEndsAt = new Date(baseTime + extensionHours * 3600 * 1000).toISOString();

  db.updateSubscription(sub.id, {
    status: 'trialing',
    trialEndsAt: newTrialEndsAt,
    endsAt: newTrialEndsAt,
  });

  // Mandatory Audit Log
  db.addAuditLog({
    id: `aud_${Date.now()}`,
    organizationId: org.id,
    organizationName: org.name,
    actorId: (req.headers['x-user-id'] as string) || 'admin_super',
    actorName: (req.headers['x-user-name'] as string) || 'Super-Administrateur',
    actorRole: 'superadmin',
    action: 'TRIAL_MANUALLY_EXTENDED',
    targetEntity: 'Subscription',
    targetId: sub.id,
    details: `Extension d'essai de +${extensionHours}h accordée. Nouvelle échéance: ${new Date(newTrialEndsAt).toLocaleString('fr-FR')}. Motif : "${justification}"`,
    timestamp: new Date().toISOString(),
  });

  db.addNotification({
    id: `notif_${Date.now()}`,
    organizationId: org.id,
    title: 'Période d’essai prolongée !',
    message: `Une extension exceptionnelle de ${extensionHours} heures vous a été accordée par la direction. Motif : ${justification}.`,
    type: 'trial_warning',
    read: false,
    createdAt: new Date().toISOString(),
  });

  return res.json({
    success: true,
    message: `Essai prolongé de ${extensionHours} heures avec succès.`,
    newTrialEndsAt,
  });
});

// Client Actions: Suspend / Unsuspend
adminRouter.post('/clients/:id/toggle-status', (req: Request, res: Response) => {
  const org = db.getOrganizationById(req.params.id);
  if (!org) return res.status(404).json({ error: 'Client introuvable' });

  const newStatus = org.status === 'active' ? 'suspended' : 'active';
  const { reason = 'Action administrative manuelle' } = req.body;

  db.updateOrganization(org.id, { status: newStatus });

  db.addAuditLog({
    id: `aud_${Date.now()}`,
    organizationId: org.id,
    organizationName: org.name,
    actorId: (req.headers['x-user-id'] as string) || 'admin_super',
    actorName: (req.headers['x-user-name'] as string) || 'Super-Administrateur',
    actorRole: 'superadmin',
    action: newStatus === 'suspended' ? 'ORGANIZATION_SUSPENDED' : 'ORGANIZATION_UNSUSPENDED',
    targetEntity: 'Organization',
    targetId: org.id,
    details: `Statut changé vers ${newStatus}. Raison : "${reason}"`,
    timestamp: new Date().toISOString(),
  });

  return res.json({ success: true, status: newStatus });
});

// Support Inbox (Admin perspective with internal notes & client details)
adminRouter.get('/support/tickets', (req: Request, res: Response) => {
  const tickets = db.getSupportTickets();
  return res.json({ tickets });
});

adminRouter.get('/support/tickets/:id', (req: Request, res: Response) => {
  const ticket = db.getSupportTicketById(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });

  const messages = db.getSupportMessages(ticket.id);
  const internalNotes = db.getSupportInternalNotes(ticket.id);
  const org = db.getOrganizationById(ticket.organizationId);
  const sub = org ? db.getSubscriptionByOrg(org.id) : null;
  const recentOrders = org ? db.getPaymentOrders(org.id) : [];

  // Reset admin unread
  db.updateSupportTicket(ticket.id, { unreadAdminCount: 0 });

  return res.json({
    ticket,
    messages,
    internalNotes,
    clientContext: {
      organization: org,
      subscription: sub,
      recentOrders: recentOrders.slice(0, 3),
    },
  });
});

// Add Internal Note (Only visible to Super-Admin, never in client interface!)
adminRouter.post('/support/tickets/:id/internal-notes', (req: Request, res: Response) => {
  const ticket = db.getSupportTicketById(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });

  const { note } = req.body;
  if (!note) return res.status(400).json({ error: 'Note vide' });

  const internalNote: SupportInternalNote = {
    id: `note_${Date.now()}`,
    ticketId: ticket.id,
    authorId: (req.headers['x-user-id'] as string) || 'admin_super',
    authorName: (req.headers['x-user-name'] as string) || 'Super-Administrateur',
    note: note.trim(),
    createdAt: new Date().toISOString(),
  };

  db.addSupportInternalNote(internalNote);

  return res.status(201).json({ success: true, note: internalNote });
});

// Update Ticket Status/Priority from Admin
adminRouter.patch('/support/tickets/:id', (req: Request, res: Response) => {
  const ticket = db.getSupportTicketById(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });

  const { status, priority, assignedAdmin } = req.body;

  const updated = db.updateSupportTicket(ticket.id, {
    ...(status && { status }),
    ...(priority && { priority }),
    ...(assignedAdmin && { assignedAdmin }),
    updatedAt: new Date().toISOString(),
    ...(status === 'resolved' || status === 'closed' ? { resolvedAt: new Date().toISOString() } : {}),
  });

  return res.json({ success: true, ticket: updated });
});

// System Incidents Monitoring
adminRouter.get('/incidents', (req: Request, res: Response) => {
  const incidents = db.getSystemIncidents();
  return res.json({ incidents });
});

// Controlled Repair Action on System Incident
adminRouter.post('/incidents/:id/repair', async (req: Request, res: Response) => {
  const incident = db.getSystemIncidentById(req.params.id);
  if (!incident) return res.status(404).json({ error: 'Incident introuvable' });

  const { actionType } = req.body;
  const now = new Date().toISOString();
  const repairLogs = [...incident.repairAuditLog];

  if (actionType === 'reverify_payment' && incident.relatedOrderId) {
    const order = db.getPaymentOrderById(incident.relatedOrderId);
    if (order) {
      // Re-query SasPay status
      const verifyRes = await sasPayProvider.queryTransactionStatus(order.sasPayRef || order.reference);
      repairLogs.push(`${now} - Vérification manuelle SasPay exécutée : statut = ${verifyRes.status}`);

      if (verifyRes.status === 'confirmed' && order.status !== 'confirmed') {
        db.updatePaymentOrder(order.id, {
          status: 'confirmed',
          confirmedAt: now,
          receiptNumber: `REC-${new Date().getFullYear()}-${order.currency}-${Math.floor(1000 + Math.random() * 9000)}`,
        });
        repairLogs.push(`${now} - Réconciliation automatique réussie : Abonnement régularisé sans second débit.`);
      }
    }
  } else {
    repairLogs.push(`${now} - Action de réparation exécutée : ${actionType}`);
  }

  const updated = db.updateSystemIncident(incident.id, {
    status: 'resolved',
    resolvedAt: now,
    repairAuditLog: repairLogs,
  });

  db.addAuditLog({
    id: `aud_${Date.now()}`,
    actorId: (req.headers['x-user-id'] as string) || 'admin_super',
    actorName: (req.headers['x-user-name'] as string) || 'Super-Administrateur',
    actorRole: 'superadmin',
    action: 'INCIDENT_REPAIRED',
    targetEntity: 'SystemIncident',
    targetId: incident.id,
    details: `Action contrôlée ${actionType} exécutée avec succès`,
    timestamp: now,
  });

  return res.json({ success: true, incident: updated });
});

// Audit Logs
adminRouter.get('/audit-logs', (req: Request, res: Response) => {
  const logs = db.getAuditLogs();
  return res.json({ logs });
});
