/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';

export const organizationRouter = Router();

// Get organization details
organizationRouter.get('/:id', (req: Request, res: Response) => {
  const org = db.getOrganizationById(req.params.id);
  if (!org) {
    return res.status(404).json({ error: 'Organisation introuvable' });
  }

  const evaluated = db.evaluateOrganizationSubscription(org.id);
  return res.json({
    organization: org,
    subscription: evaluated.subscription,
    remainingTrialSeconds: evaluated.remainingTrialSeconds,
    isTrialExpired: evaluated.isTrialExpired,
  });
});

// Update organization settings
organizationRouter.put('/:id', (req: Request, res: Response) => {
  const org = db.getOrganizationById(req.params.id);
  if (!org) {
    return res.status(404).json({ error: 'Organisation introuvable' });
  }

  const {
    name,
    legalNumber,
    phone,
    address,
    timeZone,
    workStartTime,
    workEndTime,
    lateGraceMinutes,
    workingDays,
    logoUrl,
  } = req.body;

  const updated = db.updateOrganization(org.id, {
    ...(name && { name }),
    ...(legalNumber !== undefined && { legalNumber }),
    ...(phone && { phone }),
    ...(address !== undefined && { address }),
    ...(timeZone && { timeZone }),
    ...(workStartTime && { workStartTime }),
    ...(workEndTime && { workEndTime }),
    ...(lateGraceMinutes !== undefined && { lateGraceMinutes: Number(lateGraceMinutes) }),
    ...(workingDays && { workingDays }),
    ...(logoUrl !== undefined && { logoUrl }),
  });

  db.addAuditLog({
    id: `aud_${Date.now()}`,
    organizationId: org.id,
    organizationName: org.name,
    actorId: (req.headers['x-user-id'] as string) || 'unknown',
    actorName: (req.headers['x-user-name'] as string) || 'Administrateur',
    actorRole: 'admin',
    action: 'ORGANIZATION_SETTINGS_UPDATED',
    targetEntity: 'Organization',
    targetId: org.id,
    details: 'Mise à jour des paramètres horaires et coordonnées de l’entreprise',
    timestamp: new Date().toISOString(),
  });

  return res.json({ success: true, organization: updated });
});
