/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';

export const subscriptionRouter = Router();

// Get public pricing plans
subscriptionRouter.get('/plans', (_req: Request, res: Response) => {
  const plans = db.getPlans();
  return res.json({ plans });
});

// Get current organization subscription status with exact server countdown
subscriptionRouter.get('/current', (req: Request, res: Response) => {
  const orgId = req.headers['x-org-id'] as string;
  if (!orgId) return res.status(400).json({ error: 'Organisation requise' });

  const evaluated = db.evaluateOrganizationSubscription(orgId);
  const plan = db.getPlanById(evaluated.subscription.planId);
  const employees = db.getEmployees(orgId);

  return res.json({
    subscription: evaluated.subscription,
    plan,
    remainingTrialSeconds: evaluated.remainingTrialSeconds,
    isTrialExpired: evaluated.isTrialExpired,
    canPerformWriteActions: evaluated.canPerformWriteActions,
    activeEmployeesCount: employees.length,
    maxEmployeesAllowed: evaluated.subscription.maxEmployees,
  });
});

// Update plan configuration (for Super-Admin)
subscriptionRouter.put('/plans/:id', (req: Request, res: Response) => {
  const { name, priceXAF, priceXOF, maxEmployees, features, description, isActive } = req.body;
  const updated = db.updatePlan(req.params.id, {
    ...(name && { name }),
    ...(priceXAF !== undefined && { priceXAF: Number(priceXAF) }),
    ...(priceXOF !== undefined && { priceXOF: Number(priceXOF) }),
    ...(maxEmployees !== undefined && { maxEmployees: Number(maxEmployees) }),
    ...(features && { features }),
    ...(description && { description }),
    ...(isActive !== undefined && { isActive }),
  });

  if (!updated) {
    return res.status(404).json({ error: 'Offre introuvable' });
  }

  return res.json({ success: true, plan: updated });
});
