/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  Organization,
  Subscription,
  Plan,
  Employee,
  AttendanceRecord,
  BreakRecord,
  ManualCorrectionLog,
  PaymentOrder,
  SupportTicket,
  SupportMessage,
  SupportInternalNote,
  SystemIncident,
  AuditLog,
  AppNotification,
} from '../src/types';

interface DatabaseSchema {
  users: User[];
  organizations: Organization[];
  plans: Plan[];
  subscriptions: Subscription[];
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  breakRecords: BreakRecord[];
  manualCorrections: ManualCorrectionLog[];
  paymentOrders: PaymentOrder[];
  supportTickets: SupportTicket[];
  supportMessages: SupportMessage[];
  supportInternalNotes: SupportInternalNote[];
  systemIncidents: SystemIncident[];
  auditLogs: AuditLog[];
  notifications: AppNotification[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

// 72-hour trial in milliseconds
export const TRIAL_DURATION_MS = 72 * 60 * 60 * 1000;

class Database {
  private data: DatabaseSchema = {
    users: [],
    organizations: [],
    plans: [],
    subscriptions: [],
    employees: [],
    attendanceRecords: [],
    breakRecords: [],
    manualCorrections: [],
    paymentOrders: [],
    supportTickets: [],
    supportMessages: [],
    supportInternalNotes: [],
    systemIncidents: [],
    auditLogs: [],
    notifications: [],
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.seedInitialData();
        this.save();
      }
    } catch (err) {
      console.error('Error initializing database, seeding fallback:', err);
      this.seedInitialData();
      this.save();
    }
  }

  public save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database to file:', err);
    }
  }

  private seedInitialData() {
    const now = new Date();
    const nowIso = now.toISOString();
    const todayStr = now.toISOString().split('T')[0];

    // Standard Plans
    const plans: Plan[] = [
      {
        id: 'plan_trial',
        code: 'trial',
        name: 'Essai Gratuit 72h',
        priceXAF: 0,
        priceXOF: 0,
        durationDays: 3,
        maxEmployees: 5,
        maxAdmins: 1,
        features: [
          'Gestion jusqu’à 5 employés',
          'Pointage arrivées & départs',
          'Gestion des pauses en direct',
          'Calcul automatique des retards',
          'Support par chat aide',
        ],
        isActive: true,
        description: '3 jours complets pour découvrir la puissance de PointAfrik SaaS.',
      },
      {
        id: 'plan_starter',
        code: 'starter',
        name: 'Starter PME',
        priceXAF: 5000,
        priceXOF: 5000,
        durationDays: 30,
        maxEmployees: 15,
        maxAdmins: 2,
        features: [
          'Jusqu’à 15 employés',
          'Gestion complète présences & pauses',
          'Export rapports journaliers & hebdomadaires',
          'Notifications par e-mail & dans l’app',
          'Mode hors-ligne synchronisé',
        ],
        isActive: true,
        description: 'Idéal pour petits ateliers, boutiques et agences en démarrage.',
      },
      {
        id: 'plan_business',
        code: 'business',
        name: 'Business Pro',
        priceXAF: 10000,
        priceXOF: 10000,
        durationDays: 30,
        maxEmployees: 50,
        maxAdmins: 5,
        features: [
          'Jusqu’à 50 employés',
          'Rapports mensuels & individuels détaillés',
          'Export PDF & CSV officiels certifiés',
          'Gestion des plannings par département',
          'Support prioritaire par chat direct',
        ],
        isActive: true,
        description: 'Pour les entreprises en pleine expansion avec équipes multiples.',
      },
      {
        id: 'plan_premium',
        code: 'premium',
        name: 'Entreprise Illimité',
        priceXAF: 25000,
        priceXOF: 25000,
        durationDays: 30,
        maxEmployees: 500,
        maxAdmins: 20,
        features: [
          'Employés illimités',
          'Rapports analytiques avancés & audit',
          'Accès API & intégration ERP',
          'Gestionnaire de compte dédié',
          'Sauvegardes garanties & SLA 99.9%',
        ],
        isActive: true,
        description: 'Pour moyennes et grandes entreprises exigeant performance et suivi sur-mesure.',
      },
    ];

    // Organizations
    const org1: Organization = {
      id: 'org_cameroun_translog',
      name: 'TransLog Cameroun SARL',
      legalNumber: 'RC/DLA/2021/B/1842',
      country: 'Cameroun',
      countryCode: 'CM',
      currency: 'XAF',
      phone: '+237 671 23 45 67',
      address: 'Zone Industrielle de Bassa, Douala',
      timeZone: 'Africa/Douala',
      workStartTime: '08:00',
      workEndTime: '17:00',
      lateGraceMinutes: 15,
      workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      status: 'active',
      createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    };

    const org2: Organization = {
      id: 'org_ivoire_technova',
      name: 'TechNova Abidjan SAS',
      legalNumber: 'CI-ABJ-2022-B-9941',
      country: 'Côte d’Ivoire',
      countryCode: 'CI',
      currency: 'XOF',
      phone: '+225 07 48 92 11 00',
      address: 'Plateau Immeuble Trade Center, Abidjan',
      timeZone: 'Africa/Abidjan',
      workStartTime: '08:30',
      workEndTime: '17:30',
      lateGraceMinutes: 15,
      workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      status: 'active',
      createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    };

    const org3: Organization = {
      id: 'org_dakar_btp',
      name: 'Dakar BTP Solutions',
      legalNumber: 'SN-DKR-2020-B-4412',
      country: 'Sénégal',
      countryCode: 'SN',
      currency: 'XOF',
      phone: '+221 77 654 32 10',
      address: 'Route des Almadies, Dakar',
      timeZone: 'Africa/Dakar',
      workStartTime: '08:00',
      workEndTime: '16:30',
      lateGraceMinutes: 10,
      workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      status: 'active',
      createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    };

    // Subscriptions
    // Org1 is on Trial (started 24h ago, 48h remaining)
    const org1TrialStart = new Date(Date.now() - 24 * 3600 * 1000);
    const org1TrialEnd = new Date(org1TrialStart.getTime() + TRIAL_DURATION_MS);
    const sub1: Subscription = {
      id: 'sub_org1_trial',
      organizationId: org1.id,
      planId: 'plan_trial',
      planCode: 'trial',
      status: 'trialing',
      trialStartedAt: org1TrialStart.toISOString(),
      trialEndsAt: org1TrialEnd.toISOString(),
      startsAt: org1TrialStart.toISOString(),
      endsAt: org1TrialEnd.toISOString(),
      autoRenew: false,
      maxEmployees: 5,
    };

    // Org2 is on Paid Business plan (paid via SasPay Wave, active for next 20 days)
    const org2Start = new Date(Date.now() - 10 * 24 * 3600 * 1000);
    const org2End = new Date(Date.now() + 20 * 24 * 3600 * 1000);
    const sub2: Subscription = {
      id: 'sub_org2_business',
      organizationId: org2.id,
      planId: 'plan_business',
      planCode: 'business',
      status: 'active',
      startsAt: org2Start.toISOString(),
      endsAt: org2End.toISOString(),
      autoRenew: true,
      paymentMethod: 'SasPay (Wave Côte d’Ivoire)',
      lastPaymentOrderId: 'pay_order_wave_8832',
      maxEmployees: 50,
    };

    // Org3 has EXPIRED Trial (started 5 days ago, expired 2 days ago)
    const org3TrialStart = new Date(Date.now() - 5 * 24 * 3600 * 1000);
    const org3TrialEnd = new Date(org3TrialStart.getTime() + TRIAL_DURATION_MS);
    const sub3: Subscription = {
      id: 'sub_org3_expired',
      organizationId: org3.id,
      planId: 'plan_trial',
      planCode: 'trial',
      status: 'expired',
      trialStartedAt: org3TrialStart.toISOString(),
      trialEndsAt: org3TrialEnd.toISOString(),
      startsAt: org3TrialStart.toISOString(),
      endsAt: org3TrialEnd.toISOString(),
      autoRenew: false,
      maxEmployees: 5,
    };

    // Users
    const users: User[] = [
      {
        id: 'user_superadmin',
        email: 'admin@pointafrik.com',
        fullName: 'Marc Siewe (Directeur SaaS)',
        phone: '+237 690 00 00 01',
        role: 'superadmin',
        createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
        lastLoginAt: nowIso,
      },
      {
        id: 'user_marc_translog',
        email: 'marcsiewe326@gmail.com',
        fullName: 'Marc Siewe',
        phone: '+237 671 23 45 67',
        role: 'owner',
        organizationId: org1.id,
        createdAt: org1.createdAt,
        lastLoginAt: nowIso,
      },
      {
        id: 'user_kone_technova',
        email: 'kone@technova-ci.com',
        fullName: 'Amadou Koné',
        phone: '+225 07 48 92 11 00',
        role: 'owner',
        organizationId: org2.id,
        createdAt: org2.createdAt,
        lastLoginAt: nowIso,
      },
      {
        id: 'user_fatou_dakar',
        email: 'fatou@dakarbtp.sn',
        fullName: 'Fatou Diop',
        phone: '+221 77 654 32 10',
        role: 'owner',
        organizationId: org3.id,
        createdAt: org3.createdAt,
        lastLoginAt: nowIso,
      },
    ];

    // Employees for Org 1 (TransLog Cameroun)
    const employeesOrg1: Employee[] = [
      {
        id: 'emp_1',
        organizationId: org1.id,
        matricule: 'TLC-001',
        firstName: 'Jean-Paul',
        lastName: 'Ewane',
        email: 'jp.ewane@translog-cm.com',
        phone: '+237 670 11 22 33',
        department: 'Logistique & Flotte',
        position: 'Responsable Expéditions',
        hireDate: '2023-01-15',
        status: 'active',
        scheduledStart: '08:00',
        scheduledEnd: '17:00',
        createdAt: org1.createdAt,
      },
      {
        id: 'emp_2',
        organizationId: org1.id,
        matricule: 'TLC-002',
        firstName: 'Béatrice',
        lastName: 'Mvondo',
        email: 'b.mvondo@translog-cm.com',
        phone: '+237 699 44 55 66',
        department: 'Comptabilité & Facturation',
        position: 'Comptable Fournisseurs',
        hireDate: '2023-03-01',
        status: 'active',
        scheduledStart: '08:00',
        scheduledEnd: '17:00',
        createdAt: org1.createdAt,
      },
      {
        id: 'emp_3',
        organizationId: org1.id,
        matricule: 'TLC-003',
        firstName: 'Alain',
        lastName: 'Ndjock',
        email: 'a.ndjock@translog-cm.com',
        phone: '+237 655 77 88 99',
        department: 'Opérations Terrain',
        position: 'Chauffeur Poids Lourd',
        hireDate: '2023-06-20',
        status: 'active',
        scheduledStart: '08:00',
        scheduledEnd: '17:00',
        createdAt: org1.createdAt,
      },
      {
        id: 'emp_4',
        organizationId: org1.id,
        matricule: 'TLC-004',
        firstName: 'Chantal',
        lastName: 'Kamga',
        email: 'c.kamga@translog-cm.com',
        phone: '+237 674 12 34 56',
        department: 'Ressources Humaines',
        position: 'Gestionnaire Paie & RH',
        hireDate: '2023-09-01',
        status: 'active',
        scheduledStart: '08:00',
        scheduledEnd: '17:00',
        createdAt: org1.createdAt,
      },
      {
        id: 'emp_5',
        organizationId: org1.id,
        matricule: 'TLC-005',
        firstName: 'Samuel',
        lastName: 'Fotso',
        email: 's.fotso@translog-cm.com',
        phone: '+237 691 98 76 54',
        department: 'Maintenance & Dépôt',
        position: 'Technicien Mécanique',
        hireDate: '2024-02-10',
        status: 'active',
        scheduledStart: '08:00',
        scheduledEnd: '17:00',
        createdAt: org1.createdAt,
      },
    ];

    // Attendance for today
    const attendanceRecords: AttendanceRecord[] = [
      {
        id: 'att_1',
        organizationId: org1.id,
        employeeId: 'emp_1',
        employeeName: 'Jean-Paul Ewane',
        matricule: 'TLC-001',
        department: 'Logistique & Flotte',
        date: todayStr,
        checkInTime: '07:54:12',
        checkInTimestamp: new Date(`${todayStr}T07:54:12`).getTime(),
        lateMinutes: 0,
        status: 'on_time',
        source: 'normal',
      },
      {
        id: 'att_2',
        organizationId: org1.id,
        employeeId: 'emp_2',
        employeeName: 'Béatrice Mvondo',
        matricule: 'TLC-002',
        department: 'Comptabilité & Facturation',
        date: todayStr,
        checkInTime: '08:04:30',
        checkInTimestamp: new Date(`${todayStr}T08:04:30`).getTime(),
        lateMinutes: 0, // within 15m grace period
        status: 'on_time',
        source: 'normal',
      },
      {
        id: 'att_3',
        organizationId: org1.id,
        employeeId: 'emp_3',
        employeeName: 'Alain Ndjock',
        matricule: 'TLC-003',
        department: 'Opérations Terrain',
        date: todayStr,
        checkInTime: '08:35:10',
        checkInTimestamp: new Date(`${todayStr}T08:35:10`).getTime(),
        lateMinutes: 35, // Late by 35 minutes!
        status: 'late',
        source: 'normal',
        notes: 'Embouteillages carrefour Ndokoti',
      },
      {
        id: 'att_4',
        organizationId: org1.id,
        employeeId: 'emp_4',
        employeeName: 'Chantal Kamga',
        matricule: 'TLC-004',
        department: 'Ressources Humaines',
        date: todayStr,
        checkInTime: '07:50:00',
        checkInTimestamp: new Date(`${todayStr}T07:50:00`).getTime(),
        lateMinutes: 0,
        status: 'on_time',
        source: 'normal',
      },
    ];

    // Break for today (emp_2 is currently on break)
    const breakRecords: BreakRecord[] = [
      {
        id: 'brk_1',
        organizationId: org1.id,
        employeeId: 'emp_2',
        employeeName: 'Béatrice Mvondo',
        date: todayStr,
        startTime: '12:15:00',
        startTimestamp: new Date(`${todayStr}T12:15:00`).getTime(),
        durationMinutes: 25,
        status: 'in_progress',
        source: 'normal',
        notes: 'Pause déjeuner',
      },
      {
        id: 'brk_2',
        organizationId: org1.id,
        employeeId: 'emp_1',
        employeeName: 'Jean-Paul Ewane',
        date: todayStr,
        startTime: '10:15:00',
        endTime: '10:30:00',
        startTimestamp: new Date(`${todayStr}T10:15:00`).getTime(),
        endTimestamp: new Date(`${todayStr}T10:30:00`).getTime(),
        durationMinutes: 15,
        status: 'completed',
        source: 'normal',
        notes: 'Pause café',
      },
    ];

    // Real Payment Orders
    const paymentOrders: PaymentOrder[] = [
      {
        id: 'pay_order_wave_8832',
        reference: 'SAS-WAVE-CI-2026-8832',
        organizationId: org2.id,
        organizationName: org2.name,
        planId: 'plan_business',
        planName: 'Business Pro',
        amount: 10000,
        currency: 'XOF',
        phone: '+2250748921100',
        operator: 'wave',
        country: 'Côte d’Ivoire',
        status: 'confirmed',
        sasPayRef: 'SP_TX_WAVE_998124',
        idempotencyKey: 'idemp_wave_ci_org2_8832',
        instructions: 'Paiement confirmé avec succès via le lien direct Wave QR.',
        createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
        confirmedAt: new Date(Date.now() - 10 * 24 * 3600 * 1000 + 45000).toISOString(),
        receiptNumber: 'REC-2026-XOF-0012',
        mode: 'live',
      },
      {
        id: 'pay_order_om_cm_1904',
        reference: 'SAS-OM-CM-2026-1904',
        organizationId: org1.id,
        organizationName: org1.name,
        planId: 'plan_starter',
        planName: 'Starter PME',
        amount: 5000,
        currency: 'XAF',
        phone: '+237671234567',
        operator: 'orange_money',
        country: 'Cameroun',
        status: 'pending',
        sasPayRef: 'SP_TX_OM_CM_55102',
        idempotencyKey: 'idemp_om_cm_org1_1904',
        instructions: 'Tapez #150# sur votre téléphone Orange, puis choisissez 1 pour valider le prélèvement de 5 000 FCFA.',
        createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
        mode: 'sandbox',
      },
    ];

    // Support Tickets
    const supportTickets: SupportTicket[] = [
      {
        id: 'ticket_1',
        organizationId: org1.id,
        organizationName: org1.name,
        userId: 'user_marc_translog',
        userEmail: 'marcsiewe326@gmail.com',
        userName: 'Marc Siewe',
        subject: 'Comment configurer deux horaires distincts pour l’équipe de nuit ?',
        category: 'hr',
        priority: 'normal',
        status: 'in_progress',
        createdAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        assignedAdmin: 'Marc Siewe (Directeur SaaS)',
        lastMessageSnippet: 'Bonjour Marc, vous pouvez définir des horaires personnalisés par employé...',
        unreadClientCount: 0,
        unreadAdminCount: 0,
      },
      {
        id: 'ticket_2',
        organizationId: org3.id,
        organizationName: org3.name,
        userId: 'user_fatou_dakar',
        userEmail: 'fatou@dakarbtp.sn',
        userName: 'Fatou Diop',
        subject: 'Notre période d’essai a expiré, comment payer par Orange Money Sénégal ?',
        category: 'payment',
        priority: 'urgent',
        status: 'open',
        createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        lastMessageSnippet: 'Bonjour, notre essai est bloqué ce matin, merci de nous guider.',
        unreadClientCount: 0,
        unreadAdminCount: 1,
      },
    ];

    const supportMessages: SupportMessage[] = [
      {
        id: 'msg_1_1',
        ticketId: 'ticket_1',
        senderId: 'user_marc_translog',
        senderName: 'Marc Siewe',
        senderRole: 'client',
        content:
          'Bonjour l’équipe PointAfrik, nous avons des chauffeurs qui débutent à 20h et terminent à 05h. Comment les gérer sans fausser le calcul des retards ?',
        createdAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
      },
      {
        id: 'msg_1_2',
        ticketId: 'ticket_1',
        senderId: 'user_superadmin',
        senderName: 'Support PointAfrik',
        senderRole: 'support_admin',
        content:
          'Bonjour Marc ! C’est une excellente question. Dans la section Employés, vous pouvez attribuer des horaires personnalisés par shift à chaque collaborateur. Le calcul du retard s’adaptera automatiquement.',
        createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      },
      {
        id: 'msg_2_1',
        ticketId: 'ticket_2',
        senderId: 'user_fatou_dakar',
        senderName: 'Fatou Diop',
        senderRole: 'client',
        content:
          'Bonjour, notre période d’essai de 72h s’est terminée hier. Nous souhaitons souscrire au forfait Business Pro à 10 000 FCFA avec Orange Money Sénégal. Pouvez-vous nous confirmer la procédure ?',
        createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      },
    ];

    const supportInternalNotes: SupportInternalNote[] = [
      {
        id: 'note_1',
        ticketId: 'ticket_2',
        authorId: 'user_superadmin',
        authorName: 'Marc Siewe (Directeur SaaS)',
        note: 'Client à fort potentiel (BTP avec ~35 employés). Si besoin, leur accorder une extension exceptionnelle de 48h pour finaliser leur paiement.',
        createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      },
    ];

    // System Incidents
    const systemIncidents: SystemIncident[] = [
      {
        id: 'inc_1',
        component: 'SasPay Gateway - MTN MoMo CM',
        description:
          'Webhook de confirmation retardé de 12 secondes lors de la crête réseau de midi.',
        severity: 'warning',
        errorDetails:
          'Timeout transitoire 504 sur endpoint amqp SasPay. Traité avec succès via le retry automatique idempotent.',
        relatedOrganizationId: org1.id,
        relatedOrderId: 'pay_order_om_cm_1904',
        status: 'identified',
        canRepair: true,
        repairActionType: 'reverify_payment',
        repairAuditLog: [
          '2026-10-26T07:15:00Z - Détection automatique de latence webhook.',
          '2026-10-26T07:15:30Z - Enregistrement de l’incident et file d’attente sécurisée.',
        ],
        createdAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      },
    ];

    // Audit Logs
    const auditLogs: AuditLog[] = [
      {
        id: 'aud_1',
        actorId: 'user_superadmin',
        actorName: 'Marc Siewe (Directeur SaaS)',
        actorRole: 'superadmin',
        action: 'INITIALIZE_SYSTEM',
        targetEntity: 'System',
        targetId: 'root',
        details: 'Initialisation de la plateforme PointAfrik SaaS v1.0 avec passerelle SasPay.',
        timestamp: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'aud_2',
        organizationId: org2.id,
        organizationName: org2.name,
        actorId: 'user_kone_technova',
        actorName: 'Amadou Koné',
        actorRole: 'owner',
        action: 'SUBSCRIPTION_ACTIVATED',
        targetEntity: 'Subscription',
        targetId: sub2.id,
        details: 'Activation du forfait Business Pro (10 000 XOF) suite à validation SasPay Wave.',
        timestamp: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
      },
    ];

    const notifications: AppNotification[] = [
      {
        id: 'notif_1',
        organizationId: org1.id,
        userId: 'user_marc_translog',
        title: 'Période d’essai en cours',
        message: 'Il vous reste 48 heures d’essai gratuit complet sur PointAfrik.',
        type: 'trial_warning',
        read: false,
        createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      },
      {
        id: 'notif_2',
        organizationId: org2.id,
        userId: 'user_kone_technova',
        title: 'Paiement confirmé',
        message: 'Votre abonnement Business Pro a été renouvelé avec succès pour 30 jours.',
        type: 'payment_confirmed',
        read: true,
        createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
      },
    ];

    this.data = {
      users,
      organizations: [org1, org2, org3],
      plans,
      subscriptions: [sub1, sub2, sub3],
      employees: employeesOrg1,
      attendanceRecords,
      breakRecords,
      manualCorrections: [],
      paymentOrders,
      supportTickets,
      supportMessages,
      supportInternalNotes,
      systemIncidents,
      auditLogs,
      notifications,
    };
  }

  // Core Accessors
  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public addUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      this.data.users[idx] = { ...this.data.users[idx], ...updates };
      this.save();
      return this.data.users[idx];
    }
    return undefined;
  }

  public getOrganizations(): Organization[] {
    return this.data.organizations;
  }

  public getOrganizationById(id: string): Organization | undefined {
    return this.data.organizations.find((o) => o.id === id);
  }

  public addOrganization(org: Organization): Organization {
    this.data.organizations.push(org);
    this.save();
    return org;
  }

  public updateOrganization(id: string, updates: Partial<Organization>): Organization | undefined {
    const idx = this.data.organizations.findIndex((o) => o.id === id);
    if (idx !== -1) {
      this.data.organizations[idx] = { ...this.data.organizations[idx], ...updates };
      this.save();
      return this.data.organizations[idx];
    }
    return undefined;
  }

  public getPlans(): Plan[] {
    return this.data.plans;
  }

  public getPlanById(id: string): Plan | undefined {
    return this.data.plans.find((p) => p.id === id || p.code === id);
  }

  public updatePlan(id: string, updates: Partial<Plan>): Plan | undefined {
    const idx = this.data.plans.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.data.plans[idx] = { ...this.data.plans[idx], ...updates };
      this.save();
      return this.data.plans[idx];
    }
    return undefined;
  }

  public getSubscriptions(): Subscription[] {
    return this.data.subscriptions;
  }

  public getSubscriptionByOrg(orgId: string): Subscription | undefined {
    // Return latest subscription for this organization
    const subs = this.data.subscriptions.filter((s) => s.organizationId === orgId);
    if (subs.length === 0) return undefined;
    return subs[subs.length - 1];
  }

  public addSubscription(sub: Subscription): Subscription {
    this.data.subscriptions.push(sub);
    this.save();
    return sub;
  }

  public updateSubscription(id: string, updates: Partial<Subscription>): Subscription | undefined {
    const idx = this.data.subscriptions.findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.data.subscriptions[idx] = { ...this.data.subscriptions[idx], ...updates };
      this.save();
      return this.data.subscriptions[idx];
    }
    return undefined;
  }

  // Employees
  public getEmployees(orgId: string): Employee[] {
    return this.data.employees.filter((e) => e.organizationId === orgId);
  }

  public getEmployeeById(id: string): Employee | undefined {
    return this.data.employees.find((e) => e.id === id);
  }

  public addEmployee(emp: Employee): Employee {
    this.data.employees.push(emp);
    this.save();
    return emp;
  }

  public updateEmployee(id: string, updates: Partial<Employee>): Employee | undefined {
    const idx = this.data.employees.findIndex((e) => e.id === id);
    if (idx !== -1) {
      this.data.employees[idx] = { ...this.data.employees[idx], ...updates };
      this.save();
      return this.data.employees[idx];
    }
    return undefined;
  }

  public deleteEmployee(id: string): boolean {
    const before = this.data.employees.length;
    this.data.employees = this.data.employees.filter((e) => e.id !== id);
    const deleted = this.data.employees.length < before;
    if (deleted) this.save();
    return deleted;
  }

  // Attendance
  public getAttendance(orgId: string, date?: string): AttendanceRecord[] {
    return this.data.attendanceRecords.filter(
      (a) => a.organizationId === orgId && (!date || a.date === date)
    );
  }

  public addAttendance(rec: AttendanceRecord): AttendanceRecord {
    this.data.attendanceRecords.push(rec);
    this.save();
    return rec;
  }

  public updateAttendance(id: string, updates: Partial<AttendanceRecord>): AttendanceRecord | undefined {
    const idx = this.data.attendanceRecords.findIndex((a) => a.id === id);
    if (idx !== -1) {
      this.data.attendanceRecords[idx] = { ...this.data.attendanceRecords[idx], ...updates };
      this.save();
      return this.data.attendanceRecords[idx];
    }
    return undefined;
  }

  // Breaks
  public getBreaks(orgId: string, date?: string): BreakRecord[] {
    return this.data.breakRecords.filter(
      (b) => b.organizationId === orgId && (!date || b.date === date)
    );
  }

  public addBreak(brk: BreakRecord): BreakRecord {
    this.data.breakRecords.push(brk);
    this.save();
    return brk;
  }

  public updateBreak(id: string, updates: Partial<BreakRecord>): BreakRecord | undefined {
    const idx = this.data.breakRecords.findIndex((b) => b.id === id);
    if (idx !== -1) {
      this.data.breakRecords[idx] = { ...this.data.breakRecords[idx], ...updates };
      this.save();
      return this.data.breakRecords[idx];
    }
    return undefined;
  }

  // Manual Corrections
  public addManualCorrection(log: ManualCorrectionLog): ManualCorrectionLog {
    this.data.manualCorrections.push(log);
    this.save();
    return log;
  }

  public getManualCorrections(orgId: string): ManualCorrectionLog[] {
    return this.data.manualCorrections.filter((c) => c.organizationId === orgId);
  }

  // Payment Orders
  public getPaymentOrders(orgId?: string): PaymentOrder[] {
    if (orgId) {
      return this.data.paymentOrders.filter((p) => p.organizationId === orgId);
    }
    return this.data.paymentOrders;
  }

  public getPaymentOrderById(id: string): PaymentOrder | undefined {
    return this.data.paymentOrders.find((p) => p.id === id || p.reference === id);
  }

  public addPaymentOrder(order: PaymentOrder): PaymentOrder {
    this.data.paymentOrders.push(order);
    this.save();
    return order;
  }

  public updatePaymentOrder(id: string, updates: Partial<PaymentOrder>): PaymentOrder | undefined {
    const idx = this.data.paymentOrders.findIndex((p) => p.id === id || p.reference === id);
    if (idx !== -1) {
      this.data.paymentOrders[idx] = { ...this.data.paymentOrders[idx], ...updates };
      this.save();
      return this.data.paymentOrders[idx];
    }
    return undefined;
  }

  // Support Tickets
  public getSupportTickets(orgId?: string): SupportTicket[] {
    if (orgId) {
      return this.data.supportTickets.filter((t) => t.organizationId === orgId);
    }
    return this.data.supportTickets;
  }

  public getSupportTicketById(id: string): SupportTicket | undefined {
    return this.data.supportTickets.find((t) => t.id === id);
  }

  public addSupportTicket(ticket: SupportTicket): SupportTicket {
    this.data.supportTickets.unshift(ticket);
    this.save();
    return ticket;
  }

  public updateSupportTicket(id: string, updates: Partial<SupportTicket>): SupportTicket | undefined {
    const idx = this.data.supportTickets.findIndex((t) => t.id === id);
    if (idx !== -1) {
      this.data.supportTickets[idx] = { ...this.data.supportTickets[idx], ...updates };
      this.save();
      return this.data.supportTickets[idx];
    }
    return undefined;
  }

  // Support Messages
  public getSupportMessages(ticketId: string): SupportMessage[] {
    return this.data.supportMessages
      .filter((m) => m.ticketId === ticketId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public addSupportMessage(msg: SupportMessage): SupportMessage {
    this.data.supportMessages.push(msg);
    this.save();
    return msg;
  }

  // Support Internal Notes
  public getSupportInternalNotes(ticketId: string): SupportInternalNote[] {
    return this.data.supportInternalNotes
      .filter((n) => n.ticketId === ticketId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public addSupportInternalNote(note: SupportInternalNote): SupportInternalNote {
    this.data.supportInternalNotes.push(note);
    this.save();
    return note;
  }

  // Incidents
  public getSystemIncidents(): SystemIncident[] {
    return this.data.systemIncidents;
  }

  public getSystemIncidentById(id: string): SystemIncident | undefined {
    return this.data.systemIncidents.find((i) => i.id === id);
  }

  public addSystemIncident(incident: SystemIncident): SystemIncident {
    this.data.systemIncidents.unshift(incident);
    this.save();
    return incident;
  }

  public updateSystemIncident(id: string, updates: Partial<SystemIncident>): SystemIncident | undefined {
    const idx = this.data.systemIncidents.findIndex((i) => i.id === id);
    if (idx !== -1) {
      this.data.systemIncidents[idx] = { ...this.data.systemIncidents[idx], ...updates };
      this.save();
      return this.data.systemIncidents[idx];
    }
    return undefined;
  }

  // Audit Logs
  public getAuditLogs(orgId?: string): AuditLog[] {
    if (orgId) {
      return this.data.auditLogs.filter((a) => a.organizationId === orgId);
    }
    return this.data.auditLogs;
  }

  public addAuditLog(log: AuditLog): AuditLog {
    this.data.auditLogs.unshift(log);
    this.save();
    return log;
  }

  // Notifications
  public getNotifications(userId?: string, orgId?: string): AppNotification[] {
    return this.data.notifications.filter(
      (n) => (!userId || n.userId === userId) && (!orgId || n.organizationId === orgId)
    );
  }

  public addNotification(notif: AppNotification): AppNotification {
    this.data.notifications.unshift(notif);
    this.save();
    return notif;
  }

  public markNotificationRead(id: string): void {
    const notif = this.data.notifications.find((n) => n.id === id);
    if (notif) {
      notif.read = true;
      this.save();
    }
  }

  /**
   * Evaluates subscription and 72-hour trial state on the server.
   * Server-authoritative: client system clock cannot forge remaining time.
   */
  public evaluateOrganizationSubscription(orgId: string): {
    subscription: Subscription;
    isTrialExpired: boolean;
    remainingTrialSeconds: number;
    canPerformWriteActions: boolean;
  } {
    const sub = this.getSubscriptionByOrg(orgId);
    if (!sub) {
      throw new Error(`Subscription record not found for org ${orgId}`);
    }

    const now = Date.now();

    // If active paid subscription
    if (sub.status === 'active' && sub.planCode !== 'trial') {
      const endsAtMs = new Date(sub.endsAt).getTime();
      if (now > endsAtMs) {
        // Expired paid plan
        sub.status = 'expired';
        this.updateSubscription(sub.id, { status: 'expired' });
        return {
          subscription: sub,
          isTrialExpired: false,
          remainingTrialSeconds: 0,
          canPerformWriteActions: false,
        };
      }
      return {
        subscription: sub,
        isTrialExpired: false,
        remainingTrialSeconds: 0,
        canPerformWriteActions: true,
      };
    }

    // Trial Plan
    if (sub.planCode === 'trial' || sub.status === 'trialing') {
      const trialEndsAtMs = sub.trialEndsAt
        ? new Date(sub.trialEndsAt).getTime()
        : new Date(sub.startsAt).getTime() + TRIAL_DURATION_MS;
      const remainingMs = trialEndsAtMs - now;

      if (remainingMs <= 0) {
        // TRIAL EXPIRED
        if (sub.status !== 'expired') {
          sub.status = 'expired';
          this.updateSubscription(sub.id, { status: 'expired' });
          this.addSystemIncident({
            id: `inc_trial_exp_${orgId}_${Date.now()}`,
            component: 'Subscription Engine',
            description: `Fin de la période d'essai 72h pour l'organisation ${orgId}`,
            severity: 'info',
            relatedOrganizationId: orgId,
            status: 'resolved',
            canRepair: false,
            repairAuditLog: [`Passage automatique du compte en mode lecture seule à ${new Date().toISOString()}`],
            createdAt: new Date().toISOString(),
          });
        }
        return {
          subscription: { ...sub, remainingTrialSeconds: 0, isTrialExpired: true },
          isTrialExpired: true,
          remainingTrialSeconds: 0,
          canPerformWriteActions: false,
        };
      } else {
        const remainingSeconds = Math.floor(remainingMs / 1000);
        return {
          subscription: { ...sub, remainingTrialSeconds: remainingSeconds, isTrialExpired: false },
          isTrialExpired: false,
          remainingTrialSeconds: remainingSeconds,
          canPerformWriteActions: true,
        };
      }
    }

    return {
      subscription: sub,
      isTrialExpired: sub.status === 'expired',
      remainingTrialSeconds: 0,
      canPerformWriteActions: sub.status === 'active',
    };
  }
}

export const db = new Database();
