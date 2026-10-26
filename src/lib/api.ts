/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class ApiError extends Error {
  code?: string;
  status: number;
  constructor(message: string, status: number = 500, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

class ApiClient {
  private userId: string = '';
  private userRole: string = '';
  private userName: string = '';
  private orgId: string = '';

  public setAuth(userId: string, role: string, name: string, orgId?: string) {
    this.userId = userId;
    this.userRole = role;
    this.userName = name;
    this.orgId = orgId || '';
  }

  public clearAuth() {
    this.userId = '';
    this.userRole = '';
    this.userName = '';
    this.orgId = '';
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.userId) headers['x-user-id'] = this.userId;
    if (this.userRole) headers['x-user-role'] = this.userRole;
    if (this.userName) headers['x-user-name'] = encodeURIComponent(this.userName);
    if (this.orgId) headers['x-org-id'] = this.orgId;

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new ApiError(
          data.message || data.error || `Erreur serveur (${response.status})`,
          response.status,
          data.error
        );
      }

      return data as T;
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        !navigator.onLine
          ? 'Vous êtes actuellement hors-ligne. Votre action sera synchronisée dès le retour du réseau.'
          : err.message || 'Erreur réseau inconnue',
        0
      );
    }
  }

  // Auth
  public register(payload: any) {
    return this.request<any>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public login(payload: any) {
    return this.request<any>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public getMe() {
    return this.request<any>('/api/auth/me');
  }

  public getDemoAccounts() {
    return this.request<any>('/api/auth/demo-accounts');
  }

  // Organizations
  public getOrganization(id: string) {
    return this.request<any>(`/api/organizations/${id}`);
  }

  public updateOrganization(id: string, payload: any) {
    return this.request<any>(`/api/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // Employees
  public getEmployees() {
    return this.request<any>('/api/employees');
  }

  public createEmployee(payload: any) {
    return this.request<any>('/api/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public updateEmployee(id: string, payload: any) {
    return this.request<any>(`/api/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  public deleteEmployee(id: string) {
    return this.request<any>(`/api/employees/${id}`, {
      method: 'DELETE',
    });
  }

  public importEmployeesCsv(csvText: string) {
    return this.request<any>('/api/employees/import-csv', {
      method: 'POST',
      body: JSON.stringify({ csvText }),
    });
  }

  // Attendance
  public getTodayAttendance() {
    return this.request<any>('/api/attendance/today');
  }

  public clockIn(payload: any) {
    return this.request<any>('/api/attendance/clock-in', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public clockOut(payload: any) {
    return this.request<any>('/api/attendance/clock-out', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public startBreak(payload: any) {
    return this.request<any>('/api/attendance/breaks/start', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public endBreak(payload: any) {
    return this.request<any>('/api/attendance/breaks/end', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public submitManualCorrection(payload: any) {
    return this.request<any>('/api/attendance/corrections', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public syncOfflineAttendance(queue: any[]) {
    return this.request<any>('/api/attendance/sync-offline', {
      method: 'POST',
      body: JSON.stringify({ queue }),
    });
  }

  public getReports(params: Record<string, string>) {
    const qs = new URLSearchParams(params).toString();
    return this.request<any>(`/api/attendance/reports?${qs}`);
  }

  // Subscriptions & Plans
  public getPlans() {
    return this.request<any>('/api/subscriptions/plans');
  }

  public getCurrentSubscription() {
    return this.request<any>('/api/subscriptions/current');
  }

  // Payments & Mobile Money
  public initializePayment(payload: any) {
    return this.request<any>('/api/payments/initialize', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public simulateSandboxPayment(orderReference: string, simulateStatus: string, failureReason?: string) {
    return this.request<any>('/api/payments/sandbox-simulate', {
      method: 'POST',
      body: JSON.stringify({ orderReference, simulateStatus, failureReason }),
    });
  }

  public getPaymentHistory() {
    return this.request<any>('/api/payments/history');
  }

  // Support Tickets
  public getSupportTickets() {
    return this.request<any>('/api/support/tickets');
  }

  public createSupportTicket(payload: any) {
    return this.request<any>('/api/support/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public getTicketThread(id: string) {
    return this.request<any>(`/api/support/tickets/${id}`);
  }

  public sendTicketMessage(ticketId: string, content: string, attachmentUrl?: string) {
    return this.request<any>(`/api/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, attachmentUrl }),
    });
  }

  public updateTicketStatus(ticketId: string, status: string) {
    return this.request<any>(`/api/support/tickets/${ticketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Super-Admin
  public getAdminOverview() {
    return this.request<any>('/api/admin/overview');
  }

  public getAdminFinances() {
    return this.request<any>('/api/admin/finances');
  }

  public getAdminClients() {
    return this.request<any>('/api/admin/clients');
  }

  public extendClientTrial(clientId: string, extensionHours: number, justification: string) {
    return this.request<any>(`/api/admin/clients/${clientId}/extend-trial`, {
      method: 'POST',
      body: JSON.stringify({ extensionHours, justification }),
    });
  }

  public toggleClientStatus(clientId: string, reason: string) {
    return this.request<any>(`/api/admin/clients/${clientId}/toggle-status`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  public getAdminSupportTickets() {
    return this.request<any>('/api/admin/support/tickets');
  }

  public getAdminTicketDetails(ticketId: string) {
    return this.request<any>(`/api/admin/support/tickets/${ticketId}`);
  }

  public addAdminInternalNote(ticketId: string, note: string) {
    return this.request<any>(`/api/admin/support/tickets/${ticketId}/internal-notes`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  }

  public updateAdminTicket(ticketId: string, payload: any) {
    return this.request<any>(`/api/admin/support/tickets/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  public getAdminIncidents() {
    return this.request<any>('/api/admin/incidents');
  }

  public repairAdminIncident(incidentId: string, actionType: string) {
    return this.request<any>(`/api/admin/incidents/${incidentId}/repair`, {
      method: 'POST',
      body: JSON.stringify({ actionType }),
    });
  }

  public getAdminAuditLogs() {
    return this.request<any>('/api/admin/audit-logs');
  }
}

export const api = new ApiClient();
