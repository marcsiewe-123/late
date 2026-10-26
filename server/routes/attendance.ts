/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import {
  AttendanceRecord,
  BreakRecord,
  ManualCorrectionLog,
  EventSource,
} from '../../src/types';

export const attendanceRouter = Router();

// Helper to check trial expiration
function checkOrganizationAccess(orgId: string) {
  return db.evaluateOrganizationSubscription(orgId);
}

// Helper to get time in HH:mm:ss format
function formatTime(d: Date): string {
  return d.toTimeString().split(' ')[0];
}

// Calculate late minutes
function computeLateMinutes(
  checkInTimeStr: string,
  scheduledStartStr: string,
  graceMinutes: number
): { lateMinutes: number; isLate: boolean } {
  const [ciH, ciM] = checkInTimeStr.split(':').map(Number);
  const [schH, schM] = scheduledStartStr.split(':').map(Number);

  const checkInTotalMin = ciH * 60 + ciM;
  const scheduledTotalMin = schH * 60 + schM;

  const diff = checkInTotalMin - scheduledTotalMin;
  if (diff > graceMinutes) {
    return { lateMinutes: diff, isLate: true };
  }
  return { lateMinutes: 0, isLate: false };
}

// Today's Real-time Dashboard Summary
attendanceRouter.get('/today', (req: Request, res: Response) => {
  const orgId = req.headers['x-org-id'] as string;
  if (!orgId) return res.status(400).json({ error: 'Organisation requise' });

  const todayStr = new Date().toISOString().split('T')[0];
  const employees = db.getEmployees(orgId);
  const attendances = db.getAttendance(orgId, todayStr);
  const breaks = db.getBreaks(orgId, todayStr);

  const presentCount = attendances.length;
  const lateCount = attendances.filter((a) => a.status === 'late').length;
  const activeBreaks = breaks.filter((b) => b.status === 'in_progress');
  const onBreakCount = activeBreaks.length;
  const absentCount = Math.max(0, employees.length - presentCount);

  const totalLateMinutes = attendances.reduce((acc, curr) => acc + (curr.lateMinutes || 0), 0);

  return res.json({
    date: todayStr,
    totalEmployees: employees.length,
    presentCount,
    lateCount,
    onBreakCount,
    absentCount,
    totalLateMinutes,
    attendances,
    breaks,
  });
});

// Clock-in
attendanceRouter.post('/clock-in', (req: Request, res: Response) => {
  const orgId = req.headers['x-org-id'] as string;
  const evalSub = checkOrganizationAccess(orgId);
  if (!evalSub.canPerformWriteActions) {
    return res.status(403).json({
      error: 'TRIAL_OR_SUB_EXPIRED',
      message: 'Essai ou abonnement expiré. Le pointage est désactivé.',
    });
  }

  const { employeeId, customTime, notes, source = 'normal' } = req.body;
  const emp = db.getEmployeeById(employeeId);
  if (!emp || emp.organizationId !== orgId) {
    return res.status(404).json({ error: 'Employé introuvable' });
  }

  const org = db.getOrganizationById(orgId);
  const todayStr = new Date().toISOString().split('T')[0];

  // Prevent duplicate clock-in for the same day
  const existing = db
    .getAttendance(orgId, todayStr)
    .find((a) => a.employeeId === employeeId);
  if (existing) {
    return res.status(409).json({
      error: 'ALREADY_CHECKED_IN',
      message: `${emp.firstName} ${emp.lastName} a déjà pointé son arrivée aujourd’hui à ${existing.checkInTime}.`,
    });
  }

  const now = new Date();
  const checkInTime = customTime || formatTime(now);
  const scheduledStart = emp.scheduledStart || (org ? org.workStartTime : '08:00');
  const gracePeriod = org ? org.lateGraceMinutes : 15;

  const { lateMinutes, isLate } = computeLateMinutes(
    checkInTime,
    scheduledStart,
    gracePeriod
  );

  const record: AttendanceRecord = {
    id: `att_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    organizationId: orgId,
    employeeId: emp.id,
    employeeName: `${emp.firstName} ${emp.lastName}`,
    matricule: emp.matricule,
    department: emp.department,
    date: todayStr,
    checkInTime,
    checkInTimestamp: now.getTime(),
    lateMinutes,
    status: isLate ? 'late' : 'on_time',
    source: source as EventSource,
    notes,
  };

  db.addAttendance(record);

  return res.status(201).json({
    success: true,
    attendance: record,
    message: isLate
      ? `Arrivée enregistrée avec un retard de ${lateMinutes} minutes.`
      : 'Arrivée à l’heure enregistrée.',
  });
});

// Clock-out
attendanceRouter.post('/clock-out', (req: Request, res: Response) => {
  const orgId = req.headers['x-org-id'] as string;
  const evalSub = checkOrganizationAccess(orgId);
  if (!evalSub.canPerformWriteActions) {
    return res.status(403).json({
      error: 'TRIAL_OR_SUB_EXPIRED',
      message: 'Essai ou abonnement expiré. Le pointage est désactivé.',
    });
  }

  const { employeeId, customTime } = req.body;
  const todayStr = new Date().toISOString().split('T')[0];

  const attendance = db
    .getAttendance(orgId, todayStr)
    .find((a) => a.employeeId === employeeId);

  if (!attendance) {
    return res.status(400).json({
      error: 'NO_CHECKIN_FOUND',
      message: 'Aucun pointage d’arrivée trouvé pour cet employé aujourd’hui.',
    });
  }

  if (attendance.checkOutTime) {
    return res.status(409).json({
      error: 'ALREADY_CHECKED_OUT',
      message: `Le départ a déjà été enregistré à ${attendance.checkOutTime}.`,
    });
  }

  // End any in-progress break first
  const activeBreak = db
    .getBreaks(orgId, todayStr)
    .find((b) => b.employeeId === employeeId && b.status === 'in_progress');

  if (activeBreak) {
    const endNow = new Date();
    const duration = Math.max(
      1,
      Math.floor((endNow.getTime() - activeBreak.startTimestamp) / (60 * 1000))
    );
    db.updateBreak(activeBreak.id, {
      status: 'completed',
      endTime: formatTime(endNow),
      endTimestamp: endNow.getTime(),
      durationMinutes: duration,
    });
  }

  const now = new Date();
  const checkOutTime = customTime || formatTime(now);

  const updated = db.updateAttendance(attendance.id, {
    checkOutTime,
    checkOutTimestamp: now.getTime(),
  });

  return res.json({
    success: true,
    attendance: updated,
    message: 'Départ enregistré avec succès.',
  });
});

// Start Break
attendanceRouter.post('/breaks/start', (req: Request, res: Response) => {
  const orgId = req.headers['x-org-id'] as string;
  const evalSub = checkOrganizationAccess(orgId);
  if (!evalSub.canPerformWriteActions) {
    return res.status(403).json({
      error: 'TRIAL_OR_SUB_EXPIRED',
      message: 'Abonnement expiré.',
    });
  }

  const { employeeId, notes } = req.body;
  const emp = db.getEmployeeById(employeeId);
  if (!emp || emp.organizationId !== orgId) {
    return res.status(404).json({ error: 'Employé introuvable' });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // Prevent multiple simultaneous breaks for same employee
  const activeBreak = db
    .getBreaks(orgId, todayStr)
    .find((b) => b.employeeId === employeeId && b.status === 'in_progress');

  if (activeBreak) {
    return res.status(409).json({
      error: 'BREAK_ALREADY_ACTIVE',
      message: `${emp.firstName} ${emp.lastName} est déjà en pause depuis ${activeBreak.startTime}.`,
    });
  }

  const now = new Date();
  const breakRecord: BreakRecord = {
    id: `brk_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    organizationId: orgId,
    employeeId: emp.id,
    employeeName: `${emp.firstName} ${emp.lastName}`,
    date: todayStr,
    startTime: formatTime(now),
    startTimestamp: now.getTime(),
    durationMinutes: 0,
    status: 'in_progress',
    source: 'normal',
    notes: notes || 'Pause',
  };

  db.addBreak(breakRecord);

  return res.status(201).json({
    success: true,
    breakRecord,
    message: 'Début de pause enregistré.',
  });
});

// End Break
attendanceRouter.post('/breaks/end', (req: Request, res: Response) => {
  const orgId = req.headers['x-org-id'] as string;
  const evalSub = checkOrganizationAccess(orgId);
  if (!evalSub.canPerformWriteActions) {
    return res.status(403).json({
      error: 'TRIAL_OR_SUB_EXPIRED',
      message: 'Abonnement expiré.',
    });
  }

  const { employeeId } = req.body;
  const todayStr = new Date().toISOString().split('T')[0];

  const activeBreak = db
    .getBreaks(orgId, todayStr)
    .find((b) => b.employeeId === employeeId && b.status === 'in_progress');

  if (!activeBreak) {
    return res.status(400).json({
      error: 'NO_ACTIVE_BREAK',
      message: 'Aucune pause en cours trouvée pour cet employé.',
    });
  }

  const now = new Date();
  const duration = Math.max(
    1,
    Math.round((now.getTime() - activeBreak.startTimestamp) / (60 * 1000))
  );

  const updated = db.updateBreak(activeBreak.id, {
    status: 'completed',
    endTime: formatTime(now),
    endTimestamp: now.getTime(),
    durationMinutes: duration,
  });

  return res.json({
    success: true,
    breakRecord: updated,
    message: `Fin de pause enregistrée. Durée : ${duration} minutes.`,
  });
});

// Manual Correction with Required Audit Reason
attendanceRouter.post('/corrections', (req: Request, res: Response) => {
  const orgId = req.headers['x-org-id'] as string;
  const evalSub = checkOrganizationAccess(orgId);
  if (!evalSub.canPerformWriteActions) {
    return res.status(403).json({
      error: 'TRIAL_OR_SUB_EXPIRED',
      message: 'Abonnement expiré. Corrections désactivées.',
    });
  }

  const {
    attendanceId,
    newCheckInTime,
    newCheckOutTime,
    reason,
    authorName = 'Responsable RH',
  } = req.body;

  if (!attendanceId || !reason) {
    return res.status(400).json({
      error: 'MOTIF_REQUIRED',
      message: 'Le motif de la correction manuelle est obligatoire.',
    });
  }

  const attendance = db.getAttendance(orgId).find((a) => a.id === attendanceId);
  if (!attendance) {
    return res.status(404).json({ error: 'Fiche de présence introuvable' });
  }

  const previousValue = `Arrivée: ${attendance.checkInTime || 'Non pointé'}, Départ: ${attendance.checkOutTime || 'Non pointé'}`;

  const updates: Partial<AttendanceRecord> = {
    source: 'manual_correction',
    correctedBy: authorName,
    correctionReason: reason,
  };

  if (newCheckInTime) {
    updates.checkInTime = newCheckInTime;
    const org = db.getOrganizationById(orgId);
    const emp = db.getEmployeeById(attendance.employeeId);
    const scheduled = emp?.scheduledStart || org?.workStartTime || '08:00';
    const grace = org?.lateGraceMinutes || 15;
    const { lateMinutes, isLate } = computeLateMinutes(newCheckInTime, scheduled, grace);
    updates.lateMinutes = lateMinutes;
    updates.status = isLate ? 'late' : 'on_time';
  }

  if (newCheckOutTime) {
    updates.checkOutTime = newCheckOutTime;
  }

  const updated = db.updateAttendance(attendance.id, updates);

  const newValue = `Arrivée: ${updated?.checkInTime || 'Non pointé'}, Départ: ${updated?.checkOutTime || 'Non pointé'}`;

  // Log to permanent manual correction audit table
  const correctionLog: ManualCorrectionLog = {
    id: `corr_${Date.now()}`,
    organizationId: orgId,
    entityType: 'attendance',
    entityId: attendance.id,
    authorId: (req.headers['x-user-id'] as string) || 'hr_mgr',
    authorName,
    field: 'horaires_presence',
    previousValue,
    newValue,
    reason,
    timestamp: new Date().toISOString(),
  };

  db.addManualCorrection(correctionLog);

  db.addAuditLog({
    id: `aud_${Date.now()}`,
    organizationId: orgId,
    actorId: correctionLog.authorId,
    actorName: authorName,
    actorRole: 'hr_manager',
    action: 'ATTENDANCE_MANUALLY_CORRECTED',
    targetEntity: 'AttendanceRecord',
    targetId: attendance.id,
    details: `Correction horaire pour ${attendance.employeeName}. Motif : "${reason}"`,
    timestamp: new Date().toISOString(),
  });

  return res.json({
    success: true,
    attendance: updated,
    correctionLog,
  });
});

// Offline Queue Synchronization
attendanceRouter.post('/sync-offline', (req: Request, res: Response) => {
  const orgId = req.headers['x-org-id'] as string;
  const { queue } = req.body;

  if (!Array.isArray(queue) || queue.length === 0) {
    return res.json({ success: true, syncedCount: 0 });
  }

  let syncedCount = 0;
  const conflicts: any[] = [];

  for (const item of queue) {
    try {
      const { type, employeeId, timestamp, localId, notes } = item;
      const emp = db.getEmployeeById(employeeId);
      if (!emp || emp.organizationId !== orgId) {
        conflicts.push({ localId, error: 'Employé introuvable' });
        continue;
      }

      const dateStr = new Date(timestamp).toISOString().split('T')[0];
      const timeStr = formatTime(new Date(timestamp));

      if (type === 'check_in') {
        const existing = db
          .getAttendance(orgId, dateStr)
          .find((a) => a.employeeId === employeeId);

        if (existing) {
          conflicts.push({
            localId,
            error: 'Pointage déjà enregistré pour cette date sur le serveur',
          });
          continue;
        }

        const org = db.getOrganizationById(orgId);
        const scheduled = emp.scheduledStart || org?.workStartTime || '08:00';
        const grace = org?.lateGraceMinutes || 15;
        const { lateMinutes, isLate } = computeLateMinutes(timeStr, scheduled, grace);

        db.addAttendance({
          id: `att_sync_${Date.now()}_${localId}`,
          organizationId: orgId,
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          matricule: emp.matricule,
          department: emp.department,
          date: dateStr,
          checkInTime: timeStr,
          checkInTimestamp: timestamp,
          lateMinutes,
          status: isLate ? 'late' : 'on_time',
          source: 'offline_sync',
          notes: notes ? `[Offline Sync] ${notes}` : '[Offline Sync]',
        });
        syncedCount++;
      }
    } catch (err: any) {
      conflicts.push({ localId: item.localId, error: err.message });
    }
  }

  return res.json({
    success: true,
    syncedCount,
    conflicts,
  });
});

// Reports Endpoint
attendanceRouter.get('/reports', (req: Request, res: Response) => {
  const orgId = req.headers['x-org-id'] as string;
  if (!orgId) return res.status(400).json({ error: 'Organisation requise' });

  const { period = 'today', startDate, endDate, department, employeeId } = req.query;

  let attendances = db.getAttendance(orgId);
  let breaks = db.getBreaks(orgId);
  const employees = db.getEmployees(orgId);

  // Filter by date
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (period === 'today') {
    attendances = attendances.filter((a) => a.date === todayStr);
    breaks = breaks.filter((b) => b.date === todayStr);
  } else if (period === 'week') {
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000)
      .toISOString()
      .split('T')[0];
    attendances = attendances.filter((a) => a.date >= oneWeekAgo && a.date <= todayStr);
    breaks = breaks.filter((b) => b.date >= oneWeekAgo && b.date <= todayStr);
  } else if (period === 'month') {
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000)
      .toISOString()
      .split('T')[0];
    attendances = attendances.filter((a) => a.date >= oneMonthAgo && a.date <= todayStr);
    breaks = breaks.filter((b) => b.date >= oneMonthAgo && b.date <= todayStr);
  } else if (startDate && endDate) {
    attendances = attendances.filter(
      (a) => a.date >= (startDate as string) && a.date <= (endDate as string)
    );
    breaks = breaks.filter(
      (b) => b.date >= (startDate as string) && b.date <= (endDate as string)
    );
  }

  if (department) {
    attendances = attendances.filter((a) => a.department === department);
  }
  if (employeeId) {
    attendances = attendances.filter((a) => a.employeeId === employeeId);
    breaks = breaks.filter((b) => b.employeeId === employeeId);
  }

  const totalLateMinutes = attendances.reduce((acc, a) => acc + (a.lateMinutes || 0), 0);
  const totalBreakMinutes = breaks.reduce((acc, b) => acc + (b.durationMinutes || 0), 0);

  return res.json({
    period,
    totalRecords: attendances.length,
    totalEmployees: employees.length,
    lateRecordsCount: attendances.filter((a) => a.status === 'late').length,
    totalLateMinutes,
    totalBreakMinutes,
    attendances,
    breaks,
  });
});
