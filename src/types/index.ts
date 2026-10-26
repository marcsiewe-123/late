/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'superadmin' | 'owner' | 'admin' | 'hr_manager' | 'staff';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  organizationId?: string;
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export type Currency = 'XAF' | 'XOF' | 'EUR' | 'USD';

export interface Organization {
  id: string;
  name: string;
  legalNumber?: string;
  country: string;
  countryCode: string; // CM, CI, SN, etc.
  currency: Currency;
  phone: string;
  address?: string;
  timeZone: string; // e.g. Africa/Douala, Africa/Abidjan
  workStartTime: string; // e.g. "08:00"
  workEndTime: string; // e.g. "17:00"
  lateGraceMinutes: number; // e.g. 15
  workingDays: string[]; // ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  logoUrl?: string;
  status: 'active' | 'suspended';
  createdAt: string;
}

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'expired'
  | 'cancelled'
  | 'suspended';

export interface Plan {
  id: string;
  code: 'trial' | 'starter' | 'business' | 'premium';
  name: string;
  priceXAF: number;
  priceXOF: number;
  durationDays: number;
  maxEmployees: number;
  maxAdmins: number;
  features: string[];
  isActive: boolean;
  description: string;
}

export interface Subscription {
  id: string;
  organizationId: string;
  planId: string;
  planCode: 'trial' | 'starter' | 'business' | 'premium';
  status: SubscriptionStatus;
  trialStartedAt?: string;
  trialEndsAt?: string;
  startsAt: string;
  endsAt: string;
  autoRenew: boolean;
  paymentMethod?: string;
  lastPaymentOrderId?: string;
  maxEmployees: number;
  remainingTrialSeconds?: number;
  isTrialExpired?: boolean;
}

export type EmployeeStatus = 'active' | 'on_leave' | 'inactive';

export interface Employee {
  id: string;
  organizationId: string;
  matricule: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  department: string;
  position: string;
  hireDate: string;
  status: EmployeeStatus;
  scheduledStart: string; // "08:00"
  scheduledEnd: string; // "17:00"
  notes?: string;
  createdAt: string;
}

export type AttendanceEventType = 'check_in' | 'check_out';
export type AttendanceStatus = 'on_time' | 'late' | 'excused' | 'early_departure';
export type EventSource = 'normal' | 'manual_correction' | 'import' | 'offline_sync';

export interface AttendanceRecord {
  id: string;
  organizationId: string;
  employeeId: string;
  employeeName?: string;
  matricule?: string;
  department?: string;
  date: string; // YYYY-MM-DD
  checkInTime?: string; // HH:mm:ss
  checkOutTime?: string; // HH:mm:ss
  checkInTimestamp?: number;
  checkOutTimestamp?: number;
  lateMinutes: number;
  status: AttendanceStatus;
  source: EventSource;
  notes?: string;
  correctedBy?: string;
  correctionReason?: string;
}

export interface BreakRecord {
  id: string;
  organizationId: string;
  employeeId: string;
  employeeName?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm:ss
  endTime?: string; // HH:mm:ss
  startTimestamp: number;
  endTimestamp?: number;
  durationMinutes: number;
  status: 'in_progress' | 'completed';
  source: EventSource;
  notes?: string;
}

export interface ManualCorrectionLog {
  id: string;
  organizationId: string;
  entityType: 'attendance' | 'break' | 'employee';
  entityId: string;
  authorId: string;
  authorName: string;
  field: string;
  previousValue: string;
  newValue: string;
  reason: string;
  timestamp: string;
}

export type MobileMoneyOperator = 'orange_money' | 'mtn_momo' | 'moov_money' | 'wave';
export type PaymentOrderStatus =
  | 'pending'
  | 'processing'
  | 'confirmed'
  | 'failed'
  | 'cancelled'
  | 'expired';

export interface PaymentOrder {
  id: string;
  reference: string;
  organizationId: string;
  organizationName: string;
  planId: string;
  planName: string;
  amount: number;
  currency: Currency;
  phone: string;
  operator: MobileMoneyOperator;
  country: string;
  status: PaymentOrderStatus;
  sasPayRef?: string;
  idempotencyKey: string;
  instructions: string;
  failureReason?: string;
  createdAt: string;
  confirmedAt?: string;
  receiptNumber?: string;
  mode: 'sandbox' | 'live';
}

export interface SupportTicket {
  id: string;
  organizationId: string;
  organizationName: string;
  userId: string;
  userEmail: string;
  userName: string;
  subject: string;
  category:
    | 'technical'
    | 'payment'
    | 'subscription'
    | 'login'
    | 'sync'
    | 'hr'
    | 'feature_request'
    | 'other';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'new' | 'open' | 'in_progress' | 'waiting_client' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  assignedAdmin?: string;
  lastMessageSnippet?: string;
  unreadClientCount?: number;
  unreadAdminCount?: number;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: 'client' | 'support_admin';
  content: string;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: string;
}

export interface SupportInternalNote {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  note: string;
  createdAt: string;
}

export interface SystemIncident {
  id: string;
  component: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  errorDetails?: string;
  relatedOrganizationId?: string;
  relatedOrderId?: string;
  status: 'investigating' | 'identified' | 'resolved';
  canRepair: boolean;
  repairActionType?: 'reverify_payment' | 'replay_webhook' | 'reset_stuck_state' | 'retry_sync';
  repairAuditLog: string[];
  createdAt: string;
  resolvedAt?: string;
}

export interface AuditLog {
  id: string;
  organizationId?: string;
  organizationName?: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetEntity: string;
  targetId: string;
  details: string;
  timestamp: string;
}

export interface AppNotification {
  id: string;
  organizationId?: string;
  userId?: string;
  title: string;
  message: string;
  type: 'trial_warning' | 'trial_expired' | 'payment_confirmed' | 'payment_failed' | 'ticket_reply' | 'system_alert';
  read: boolean;
  createdAt: string;
}
