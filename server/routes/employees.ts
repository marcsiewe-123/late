/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { Employee } from '../../src/types';

export const employeeRouter = Router();

// Middleware helper to check subscription rights
function checkOrganizationAccess(orgId: string) {
  return db.evaluateOrganizationSubscription(orgId);
}

// List employees
employeeRouter.get('/', (req: Request, res: Response) => {
  const orgId = req.headers['x-org-id'] as string;
  if (!orgId) {
    return res.status(400).json({ error: 'Organisation non spécifiée' });
  }

  const employees = db.getEmployees(orgId);
  return res.json({ employees });
});

// Create employee
employeeRouter.post('/', (req: Request, res: Response) => {
  const orgId = req.headers['x-org-id'] as string;
  if (!orgId) {
    return res.status(400).json({ error: 'Organisation non spécifiée' });
  }

  const evalSub = checkOrganizationAccess(orgId);
  if (!evalSub.canPerformWriteActions) {
    return res.status(403).json({
      error: 'TRIAL_OR_SUB_EXPIRED',
      message:
        'Votre abonnement ou essai gratuit a expiré. Veuillez régulariser votre abonnement pour ajouter des collaborateurs.',
    });
  }

  const existingEmployees = db.getEmployees(orgId);
  const maxAllowed = evalSub.subscription.maxEmployees || 5;

  if (existingEmployees.length >= maxAllowed) {
    return res.status(403).json({
      error: 'MAX_EMPLOYEES_REACHED',
      message: `Votre offre actuelle est limitée à ${maxAllowed} employés. Veuillez passer au forfait supérieur (Starter ou Business) pour ajouter d'autres employés.`,
    });
  }

  const {
    matricule,
    firstName,
    lastName,
    email,
    phone,
    department,
    position,
    hireDate,
    scheduledStart = '08:00',
    scheduledEnd = '17:00',
    notes,
  } = req.body;

  if (!matricule || !firstName || !lastName || !phone || !department || !position) {
    return res.status(400).json({
      error: 'Champs obligatoires manquants',
      message: 'Matricule, nom, prénom, téléphone, département et poste sont requis.',
    });
  }

  // Check unique matricule in org
  const duplicateMatricule = existingEmployees.find(
    (e) => e.matricule.toLowerCase() === matricule.trim().toLowerCase()
  );
  if (duplicateMatricule) {
    return res.status(409).json({
      error: 'MATRICULE_EXISTS',
      message: `Le matricule ${matricule} est déjà attribué à un employé de votre entreprise.`,
    });
  }

  const newEmp: Employee = {
    id: `emp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    organizationId: orgId,
    matricule: matricule.trim().toUpperCase(),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email ? email.trim() : undefined,
    phone: phone.trim(),
    department: department.trim(),
    position: position.trim(),
    hireDate: hireDate || new Date().toISOString().split('T')[0],
    status: 'active',
    scheduledStart,
    scheduledEnd,
    notes,
    createdAt: new Date().toISOString(),
  };

  db.addEmployee(newEmp);

  db.addAuditLog({
    id: `aud_${Date.now()}`,
    organizationId: orgId,
    actorId: (req.headers['x-user-id'] as string) || 'system',
    actorName: (req.headers['x-user-name'] as string) || 'Admin',
    actorRole: 'admin',
    action: 'EMPLOYEE_CREATED',
    targetEntity: 'Employee',
    targetId: newEmp.id,
    details: `Création de l'employé ${newEmp.firstName} ${newEmp.lastName} (${newEmp.matricule})`,
    timestamp: new Date().toISOString(),
  });

  return res.status(201).json({ success: true, employee: newEmp });
});

// Update employee
employeeRouter.put('/:id', (req: Request, res: Response) => {
  const orgId = req.headers['x-org-id'] as string;
  const emp = db.getEmployeeById(req.params.id);

  if (!emp || emp.organizationId !== orgId) {
    return res.status(404).json({ error: 'Employé introuvable' });
  }

  const evalSub = checkOrganizationAccess(orgId);
  if (!evalSub.canPerformWriteActions) {
    return res.status(403).json({
      error: 'TRIAL_OR_SUB_EXPIRED',
      message: 'Compte expiré. Modifications bloquées.',
    });
  }

  const updated = db.updateEmployee(emp.id, req.body);
  return res.json({ success: true, employee: updated });
});

// Delete / Archive employee
employeeRouter.delete('/:id', (req: Request, res: Response) => {
  const orgId = req.headers['x-org-id'] as string;
  const emp = db.getEmployeeById(req.params.id);

  if (!emp || emp.organizationId !== orgId) {
    return res.status(404).json({ error: 'Employé introuvable' });
  }

  db.deleteEmployee(emp.id);

  db.addAuditLog({
    id: `aud_${Date.now()}`,
    organizationId: orgId,
    actorId: (req.headers['x-user-id'] as string) || 'system',
    actorName: (req.headers['x-user-name'] as string) || 'Admin',
    actorRole: 'admin',
    action: 'EMPLOYEE_DELETED',
    targetEntity: 'Employee',
    targetId: emp.id,
    details: `Suppression de l'employé ${emp.firstName} ${emp.lastName} (${emp.matricule})`,
    timestamp: new Date().toISOString(),
  });

  return res.json({ success: true });
});

// Bulk Import CSV
employeeRouter.post('/import-csv', (req: Request, res: Response) => {
  const orgId = req.headers['x-org-id'] as string;
  const evalSub = checkOrganizationAccess(orgId);

  if (!evalSub.canPerformWriteActions) {
    return res.status(403).json({
      error: 'TRIAL_OR_SUB_EXPIRED',
      message: 'Compte expiré. Impossible d’importer des employés.',
    });
  }

  const { csvText } = req.body;
  if (!csvText) {
    return res.status(400).json({ error: 'Contenu CSV vide' });
  }

  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    return res.status(400).json({ error: 'Format CSV invalide : au moins un en-tête et une ligne requis.' });
  }

  const existingEmployees = db.getEmployees(orgId);
  const maxAllowed = evalSub.subscription.maxEmployees || 5;

  let addedCount = 0;
  const errors: string[] = [];

  // Expected columns: matricule, firstName, lastName, phone, department, position, scheduledStart, scheduledEnd
  for (let i = 1; i < lines.length; i++) {
    if (existingEmployees.length + addedCount >= maxAllowed) {
      errors.push(`Limite du forfait atteinte (${maxAllowed} employés max). Arrêt à la ligne ${i}.`);
      break;
    }

    const row = lines[i].split(',').map((c: string) => c.trim().replace(/^["']|["']$/g, ''));
    if (row.length < 5) continue;

    const [matricule, firstName, lastName, phone, department, position, scheduledStart, scheduledEnd] = row;
    if (!matricule || !firstName || !lastName || !phone) {
      errors.push(`Ligne ${i + 1} ignorée : informations incomplètes.`);
      continue;
    }

    if (existingEmployees.some((e) => e.matricule.toLowerCase() === matricule.toLowerCase())) {
      errors.push(`Matricule ${matricule} déjà existant.`);
      continue;
    }

    const newEmp: Employee = {
      id: `emp_${Date.now()}_${i}`,
      organizationId: orgId,
      matricule: matricule.toUpperCase(),
      firstName,
      lastName,
      phone,
      department: department || 'Général',
      position: position || 'Employé',
      hireDate: new Date().toISOString().split('T')[0],
      status: 'active',
      scheduledStart: scheduledStart || '08:00',
      scheduledEnd: scheduledEnd || '17:00',
      createdAt: new Date().toISOString(),
    };

    db.addEmployee(newEmp);
    addedCount++;
  }

  return res.json({
    success: true,
    addedCount,
    errors,
  });
});
