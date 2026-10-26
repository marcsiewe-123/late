/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { db, TRIAL_DURATION_MS } from '../db';
import { User, Organization, Subscription, Currency } from '../../src/types';

export const authRouter = Router();

// Registration
authRouter.post('/register', (req: Request, res: Response) => {
  try {
    const {
      fullName,
      companyName,
      email,
      phone,
      country,
      password,
      currency = 'XAF',
      timeZone,
    } = req.body;

    if (!fullName || !companyName || !email || !password || !phone || !country) {
      return res.status(400).json({
        error: 'Champs obligatoires manquants',
        message: 'Veuillez remplir tous les champs du formulaire d’inscription.',
      });
    }

    // Check duplicate email
    const existing = db.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({
        error: 'Email déjà utilisé',
        message: 'Un compte existe déjà avec cette adresse email.',
      });
    }

    const orgId = `org_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const now = new Date();
    const trialStart = now;
    const trialEnd = new Date(trialStart.getTime() + TRIAL_DURATION_MS);

    // Auto-detect currency and timezone if not explicitly provided
    let finalCurrency: Currency = currency;
    let finalTz = timeZone || 'Africa/Douala';
    if (['Sénégal', 'Senegal', 'Côte d’Ivoire', 'Cote d\'Ivoire', 'Mali', 'Burkina Faso', 'Togo', 'Bénin'].includes(country)) {
      finalCurrency = 'XOF';
      finalTz = 'Africa/Abidjan';
    }

    // Create Organization
    const organization: Organization = {
      id: orgId,
      name: companyName,
      country,
      countryCode: country.substring(0, 2).toUpperCase(),
      currency: finalCurrency,
      phone,
      timeZone: finalTz,
      workStartTime: '08:00',
      workEndTime: '17:00',
      lateGraceMinutes: 15,
      workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      status: 'active',
      createdAt: now.toISOString(),
    };
    db.addOrganization(organization);

    // Create 72h Trial Subscription
    const subscription: Subscription = {
      id: `sub_${Date.now()}`,
      organizationId: orgId,
      planId: 'plan_trial',
      planCode: 'trial',
      status: 'trialing',
      trialStartedAt: trialStart.toISOString(),
      trialEndsAt: trialEnd.toISOString(),
      startsAt: trialStart.toISOString(),
      endsAt: trialEnd.toISOString(),
      autoRenew: false,
      maxEmployees: 5,
    };
    db.addSubscription(subscription);

    // Create User (Owner)
    const user: User = {
      id: `user_${Date.now()}`,
      email: email.trim().toLowerCase(),
      fullName: fullName.trim(),
      phone: phone.trim(),
      role: 'owner',
      organizationId: orgId,
      createdAt: now.toISOString(),
      lastLoginAt: now.toISOString(),
    };
    db.addUser(user);

    // Initial Welcome Notification
    db.addNotification({
      id: `notif_${Date.now()}`,
      organizationId: orgId,
      userId: user.id,
      title: 'Bienvenue sur PointAfrik SaaS !',
      message: `Votre période d'essai de 72 heures a débuté. Profitez de toutes les fonctionnalités jusqu’au ${trialEnd.toLocaleDateString('fr-FR')} à ${trialEnd.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`,
      type: 'trial_warning',
      read: false,
      createdAt: now.toISOString(),
    });

    db.addAuditLog({
      id: `aud_${Date.now()}`,
      organizationId: orgId,
      organizationName: companyName,
      actorId: user.id,
      actorName: user.fullName,
      actorRole: 'owner',
      action: 'ORGANIZATION_REGISTERED',
      targetEntity: 'Organization',
      targetId: orgId,
      details: `Création de l'organisation ${companyName} (${country}) avec essai de 72h`,
      timestamp: now.toISOString(),
    });

    const evaluated = db.evaluateOrganizationSubscription(orgId);

    return res.status(201).json({
      success: true,
      user,
      organization,
      subscription: evaluated.subscription,
      remainingTrialSeconds: evaluated.remainingTrialSeconds,
    });
  } catch (err: any) {
    console.error('Error in /register:', err);
    return res.status(500).json({ error: 'Erreur serveur', message: err.message });
  }
});

// Login
authRouter.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const user = db.getUserByEmail(email.trim());
    if (!user) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    // In production, compare with bcrypt. Here we accept valid credentials
    db.updateUser(user.id, { lastLoginAt: new Date().toISOString() });

    let organization: Organization | undefined;
    let subscription: Subscription | undefined;
    let remainingTrialSeconds = 0;
    let isTrialExpired = false;

    if (user.organizationId) {
      organization = db.getOrganizationById(user.organizationId);
      if (organization) {
        const evaluated = db.evaluateOrganizationSubscription(user.organizationId);
        subscription = evaluated.subscription;
        remainingTrialSeconds = evaluated.remainingTrialSeconds;
        isTrialExpired = evaluated.isTrialExpired;
      }
    }

    return res.json({
      success: true,
      user,
      organization,
      subscription,
      remainingTrialSeconds,
      isTrialExpired,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erreur serveur', message: err.message });
  }
});

// Get current session status & re-evaluate 72h trial countdown
authRouter.get('/me', (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const user = db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    let organization: Organization | undefined;
    let subscription: Subscription | undefined;
    let remainingTrialSeconds = 0;
    let isTrialExpired = false;
    let canPerformWriteActions = true;

    if (user.organizationId) {
      organization = db.getOrganizationById(user.organizationId);
      if (organization) {
        const evaluated = db.evaluateOrganizationSubscription(user.organizationId);
        subscription = evaluated.subscription;
        remainingTrialSeconds = evaluated.remainingTrialSeconds;
        isTrialExpired = evaluated.isTrialExpired;
        canPerformWriteActions = evaluated.canPerformWriteActions;
      }
    }

    return res.json({
      user,
      organization,
      subscription,
      remainingTrialSeconds,
      isTrialExpired,
      canPerformWriteActions,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erreur serveur', message: err.message });
  }
});

// Demo account switcher for convenient verification of all roles and states
authRouter.get('/demo-accounts', (req: Request, res: Response) => {
  const users = db.getUsers().map((u) => {
    const org = u.organizationId ? db.getOrganizationById(u.organizationId) : null;
    let sub = u.organizationId ? db.getSubscriptionByOrg(u.organizationId) : null;
    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      organizationId: u.organizationId,
      organizationName: org ? org.name : 'Super Administration',
      planCode: sub ? sub.planCode : 'N/A',
      subStatus: sub ? sub.status : 'active',
      country: org ? org.country : 'Afrique',
    };
  });
  return res.json({ accounts: users });
});
