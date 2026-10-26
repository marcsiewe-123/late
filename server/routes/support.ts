/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { SupportTicket, SupportMessage } from '../../src/types';

export const supportRouter = Router();

// List tickets for organization
supportRouter.get('/tickets', (req: Request, res: Response) => {
  const orgId = req.headers['x-org-id'] as string;
  if (!orgId) return res.status(400).json({ error: 'Organisation requise' });

  const tickets = db.getSupportTickets(orgId);
  return res.json({ tickets });
});

// Create new support ticket
supportRouter.post('/tickets', (req: Request, res: Response) => {
  const orgId = req.headers['x-org-id'] as string;
  const userId = req.headers['x-user-id'] as string;
  const org = db.getOrganizationById(orgId);
  const user = db.getUserById(userId);

  if (!org || !user) {
    return res.status(400).json({ error: 'Organisation ou utilisateur non identifié' });
  }

  const { subject, category = 'technical', priority = 'normal', message, attachmentUrl } = req.body;

  if (!subject || !message) {
    return res.status(400).json({
      error: 'Champs manquants',
      message: 'Veuillez saisir un objet et votre message.',
    });
  }

  const now = new Date().toISOString();
  const ticketId = `ticket_${Date.now()}`;

  const ticket: SupportTicket = {
    id: ticketId,
    organizationId: org.id,
    organizationName: org.name,
    userId: user.id,
    userEmail: user.email,
    userName: user.fullName,
    subject: subject.trim(),
    category,
    priority,
    status: 'new',
    createdAt: now,
    updatedAt: now,
    lastMessageSnippet: message.substring(0, 80),
    unreadClientCount: 0,
    unreadAdminCount: 1,
  };

  db.addSupportTicket(ticket);

  const initialMessage: SupportMessage = {
    id: `msg_${Date.now()}`,
    ticketId,
    senderId: user.id,
    senderName: user.fullName,
    senderRole: 'client',
    content: message.trim(),
    attachmentUrl,
    createdAt: now,
  };

  db.addSupportMessage(initialMessage);

  db.addNotification({
    id: `notif_${Date.now()}`,
    organizationId: org.id,
    userId: user.id,
    title: 'Ticket de support créé',
    message: `Votre demande "${subject}" a été transmise à l’équipe support PointAfrik.`,
    type: 'ticket_reply',
    read: true,
    createdAt: now,
  });

  return res.status(201).json({ success: true, ticket, message: initialMessage });
});

// Get ticket details and conversation thread
supportRouter.get('/tickets/:id', (req: Request, res: Response) => {
  const orgId = req.headers['x-org-id'] as string;
  const ticket = db.getSupportTicketById(req.params.id);

  if (!ticket || (orgId && ticket.organizationId !== orgId)) {
    return res.status(404).json({ error: 'Ticket introuvable' });
  }

  const messages = db.getSupportMessages(ticket.id);

  // Clear unread for client
  if (orgId) {
    db.updateSupportTicket(ticket.id, { unreadClientCount: 0 });
  }

  return res.json({ ticket, messages });
});

// Post a reply message to a ticket
supportRouter.post('/tickets/:id/messages', (req: Request, res: Response) => {
  const orgId = req.headers['x-org-id'] as string;
  const userId = req.headers['x-user-id'] as string;
  const user = db.getUserById(userId);
  const ticket = db.getSupportTicketById(req.params.id);

  if (!ticket || (orgId && ticket.organizationId !== orgId)) {
    return res.status(404).json({ error: 'Ticket introuvable' });
  }

  const { content, attachmentUrl } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Message vide' });
  }

  const now = new Date().toISOString();
  const isSupportAdmin = user?.role === 'superadmin';

  const newMsg: SupportMessage = {
    id: `msg_${Date.now()}`,
    ticketId: ticket.id,
    senderId: user ? user.id : 'unknown',
    senderName: user ? user.fullName : isSupportAdmin ? 'Support PointAfrik' : 'Client',
    senderRole: isSupportAdmin ? 'support_admin' : 'client',
    content: content.trim(),
    attachmentUrl,
    createdAt: now,
  };

  db.addSupportMessage(newMsg);

  db.updateSupportTicket(ticket.id, {
    updatedAt: now,
    lastMessageSnippet: content.substring(0, 80),
    status: isSupportAdmin ? 'waiting_client' : 'open',
    unreadClientCount: isSupportAdmin ? (ticket.unreadClientCount || 0) + 1 : 0,
    unreadAdminCount: isSupportAdmin ? 0 : (ticket.unreadAdminCount || 0) + 1,
  });

  return res.status(201).json({ success: true, message: newMsg });
});

// Update ticket status (e.g. client confirms resolution)
supportRouter.patch('/tickets/:id/status', (req: Request, res: Response) => {
  const ticket = db.getSupportTicketById(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });

  const { status } = req.body;
  const updated = db.updateSupportTicket(ticket.id, {
    status,
    updatedAt: new Date().toISOString(),
    ...(status === 'resolved' || status === 'closed' ? { resolvedAt: new Date().toISOString() } : {}),
  });

  return res.json({ success: true, ticket: updated });
});
