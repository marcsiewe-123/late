/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  SupportTicket,
  SupportMessage,
  SupportInternalNote,
  SystemIncident,
  AuditLog,
  PaymentOrder,
} from '../../types';
import {
  LayoutDashboard,
  BarChart3,
  Building,
  LifeBuoy,
  AlertTriangle,
  History,
  Users,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Send,
  Plus,
  RefreshCw,
  Download,
  Lock,
  Unlock,
  Sparkles,
  ExternalLink,
  X,
} from 'lucide-react';

interface AdminViewProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ activeTab, setActiveTab }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [financesData, setFinancesData] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [incidents, setIncidents] = useState<SystemIncident[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // 3-Pane Support State
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [ticketDetails, setTicketDetails] = useState<{
    ticket: SupportTicket;
    messages: SupportMessage[];
    internalNotes: SupportInternalNote[];
    clientContext: any;
  } | null>(null);
  const [adminReplyText, setAdminReplyText] = useState<string>('');
  const [internalNoteText, setInternalNoteText] = useState<string>('');
  const [ticketFilter, setTicketFilter] = useState<string>('all');
  const [isSendingReply, setIsSendingReply] = useState<boolean>(false);

  // Trial Extension Modal State
  const [extensionTarget, setExtensionTarget] = useState<any>(null);
  const [extensionHours, setExtensionHours] = useState<number>(48);
  const [extensionJustification, setExtensionJustification] = useState<string>('');
  const [isExtending, setIsExtending] = useState<boolean>(false);

  // Status message
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ovRes, finRes, cliRes, tckRes, incRes, audRes] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminFinances(),
        api.getAdminClients(),
        api.getAdminSupportTickets(),
        api.getAdminIncidents(),
        api.getAdminAuditLogs(),
      ]);

      setOverviewData(ovRes);
      setFinancesData(finRes);
      setClients(cliRes.clients || []);
      setTickets(tckRes.tickets || []);
      setIncidents(incRes.incidents || []);
      setAuditLogs(audRes.logs || []);

      if (tckRes.tickets?.length > 0 && !selectedTicketId) {
        loadTicketThread(tckRes.tickets[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', text: err.message || 'Erreur chargement admin' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadTicketThread = async (ticketId: string) => {
    setSelectedTicketId(ticketId);
    try {
      const res = await api.getAdminTicketDetails(ticketId);
      setTicketDetails(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !adminReplyText.trim()) return;

    setIsSendingReply(true);
    try {
      await api.sendTicketMessage(selectedTicketId, adminReplyText);
      setAdminReplyText('');
      await loadTicketThread(selectedTicketId);
      const tckRes = await api.getAdminSupportTickets();
      setTickets(tckRes.tickets || []);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !internalNoteText.trim()) return;

    try {
      await api.addAdminInternalNote(selectedTicketId, internalNoteText);
      setInternalNoteText('');
      await loadTicketThread(selectedTicketId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateTicketStatus = async (status: string) => {
    if (!selectedTicketId) return;
    try {
      await api.updateAdminTicket(selectedTicketId, { status });
      await loadTicketThread(selectedTicketId);
      const tckRes = await api.getAdminSupportTickets();
      setTickets(tckRes.tickets || []);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExecuteRepair = async (incidentId: string, actionType: string) => {
    try {
      const res = await api.repairAdminIncident(incidentId, actionType);
      setFeedback({ type: 'success', text: `Action contrôlée "${actionType}" exécutée avec succès.` });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleToggleClientStatus = async (client: any) => {
    const isSuspending = client.organization.status === 'active';
    const reason = prompt(
      `Indiquez le motif de ${isSuspending ? 'suspension' : 'réactivation'} pour ${client.organization.name} :`,
      'Action administrative contrôlée'
    );
    if (!reason) return;

    try {
      await api.toggleClientStatus(client.organization.id, reason);
      setFeedback({
        type: 'success',
        text: `Statut de ${client.organization.name} mis à jour : ${isSuspending ? 'Suspendu' : 'Actif'}.`,
      });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleConfirmTrialExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extensionTarget || !extensionJustification.trim()) return;

    setIsExtending(true);
    try {
      await api.extendClientTrial(
        extensionTarget.organization.id,
        extensionHours,
        extensionJustification
      );
      setFeedback({
        type: 'success',
        text: `Extension d'essai de +${extensionHours}h accordée à ${extensionTarget.organization.name}.`,
      });
      setExtensionTarget(null);
      setExtensionJustification('');
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsExtending(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (ticketFilter === 'urgent') return t.priority === 'urgent' || t.priority === 'high';
    if (ticketFilter === 'open') return t.status === 'new' || t.status === 'open' || t.status === 'in_progress';
    if (ticketFilter === 'resolved') return t.status === 'resolved' || t.status === 'closed';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Admin Title & Quick Sub-Nav */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded font-mono font-medium">
              ESPACE SUPER-ADMINISTRATEUR
            </span>
          </div>
          <h1 className="text-lg font-bold text-white mt-1">Supervision Centrale PointAfrik SaaS</h1>
          <p className="text-xs text-slate-400">
            Pilotage commercial, encaissements Mobile Money SasPay, support 3-volets et surveillance technique.
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualiser les données
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)}>
            <X className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
          </button>
        </div>
      )}

      {/* VIEW: OVERVIEW */}
      {activeTab === 'admin_overview' && overviewData && (
        <div className="space-y-6">
          {/* Key Metric Counters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Clients inscrits</span>
              <p className="text-2xl font-bold text-white mt-1">{overviewData.kpis.totalClients}</p>
              <p className="text-[11px] text-emerald-400 mt-1 font-medium">
                {overviewData.kpis.activeClients} comptes actifs
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Essais 72h en cours</span>
              <p className="text-2xl font-bold text-blue-400 mt-1">{overviewData.kpis.trialingCount}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {overviewData.kpis.expiredTrialCount} essais expirés
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Abonnements payants</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{overviewData.kpis.activePaidCount}</p>
              <p className="text-[11px] text-slate-500 mt-1">Renouvellements réguliers</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Tickets Support ouverts</span>
              <p className="text-2xl font-bold text-amber-400 mt-1">{overviewData.kpis.openTicketsCount}</p>
              <p className="text-[11px] text-rose-400 mt-1 font-semibold">
                {overviewData.kpis.urgentTicketsCount} demandes urgentes
              </p>
            </div>
          </div>

          {/* Real Collected Finances Overview */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Revenus Réels Encaissés (Distinction stricte espèces encaissées vs prévisionnel)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
                <span className="text-xs text-slate-400 block">Total Encaissé Réel (Afrique Centrale)</span>
                <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
                  {overviewData.finances.totalCollectedXAF.toLocaleString('fr-FR')} XAF
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block font-mono">
                  En attente validation USSD : {overviewData.finances.totalPendingXAF.toLocaleString('fr-FR')} XAF
                </span>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
                <span className="text-xs text-slate-400 block">Total Encaissé Réel (Afrique de l’Ouest)</span>
                <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
                  {overviewData.finances.totalCollectedXOF.toLocaleString('fr-FR')} XOF
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block font-mono">
                  En attente validation USSD : {overviewData.finances.totalPendingXOF.toLocaleString('fr-FR')} XOF
                </span>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
                <span className="text-xs text-slate-400 block">Revenu Récurrent Mensuel (MRR) Estimé</span>
                <span className="text-xl font-bold font-mono text-white mt-1 block">
                  {overviewData.finances.mrrEstimateXAF.toLocaleString('fr-FR')} XAF / {overviewData.finances.mrrEstimateXOF.toLocaleString('fr-FR')} XOF
                </span>
                <span className="text-[11px] text-emerald-400 mt-1 block font-medium">
                  {overviewData.finances.confirmedTransactionsCount} transactions réussies
                </span>
              </div>
            </div>
          </div>

          {/* Quick Tables: Recent Transactions & Incidents */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Orders */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-white">Dernières Transactions SasPay</h3>
                <button
                  onClick={() => setActiveTab('admin_finances')}
                  className="text-xs text-emerald-400 hover:underline"
                >
                  Voir tout
                </button>
              </div>
              <div className="space-y-2 text-xs">
                {overviewData.recentPayments.map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center p-2.5 bg-slate-800/40 rounded-lg">
                    <div>
                      <p className="font-semibold text-white">{p.organizationName}</p>
                      <p className="text-[10px] text-slate-400 uppercase">{p.operator} · {p.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-white">
                        {p.amount.toLocaleString('fr-FR')} {p.currency}
                      </p>
                      <span className={`text-[10px] ${p.status === 'confirmed' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {p.status === 'confirmed' ? 'Confirmé' : 'En attente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Alerts */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-white">Surveillance & Incidents Techniques</h3>
                <button
                  onClick={() => setActiveTab('admin_incidents')}
                  className="text-xs text-amber-400 hover:underline"
                >
                  Voir tout
                </button>
              </div>
              <div className="space-y-2 text-xs">
                {incidents.slice(0, 3).map((inc) => (
                  <div key={inc.id} className="p-2.5 bg-slate-800/40 rounded-lg border border-slate-700/50">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-amber-400">{inc.component}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(inc.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-300 mt-1 line-clamp-1">{inc.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: FINANCES */}
      {activeTab === 'admin_finances' && financesData && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-base font-bold text-white mb-2">Ventilation Financière par Pays & Opérateur</h2>
            <p className="text-xs text-slate-400 mb-6">
              Données de chiffre d'affaires certifiées issues exclusivement des transactions avec confirmation de réception SasPay.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* By Country */}
              <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                <h3 className="text-xs font-semibold text-white mb-3">Répartition par Pays</h3>
                <div className="space-y-2 text-xs">
                  {Object.entries(financesData.byCountry).map(([cName, data]: [string, any]) => (
                    <div key={cName} className="flex justify-between items-center py-1.5 border-b border-slate-800">
                      <span className="text-slate-300 font-medium">{cName}</span>
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-400">
                          {data.xaf > 0 ? `${data.xaf.toLocaleString('fr-FR')} XAF` : ''}
                          {data.xof > 0 ? `${data.xof.toLocaleString('fr-FR')} XOF` : ''}
                        </span>
                        <span className="text-[10px] text-slate-500 block">({data.count} paiements)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Operator */}
              <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                <h3 className="text-xs font-semibold text-white mb-3">Répartition par Opérateur Mobile Money</h3>
                <div className="space-y-2 text-xs">
                  {Object.entries(financesData.byOperator).map(([opName, data]: [string, any]) => (
                    <div key={opName} className="flex justify-between items-center py-1.5 border-b border-slate-800">
                      <span className="text-slate-300 font-medium uppercase">{opName.replace('_', ' ')}</span>
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-400">
                          {data.amount.toLocaleString('fr-FR')} FCFA
                        </span>
                        <span className="text-[10px] text-slate-500 block">({data.count} tx)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Full Transactions Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-white">Registre exhaustif des commandes & transactions</h3>
              <span className="text-xs text-slate-400">{financesData.orders?.length || 0} enregistrements</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-800/40">
                    <th className="py-2.5 px-3 font-medium">Réf Commande</th>
                    <th className="py-2.5 px-3 font-medium">Entreprise</th>
                    <th className="py-2.5 px-3 font-medium">Forfait</th>
                    <th className="py-2.5 px-3 font-medium">Opérateur</th>
                    <th className="py-2.5 px-3 font-medium">Montant</th>
                    <th className="py-2.5 px-3 font-medium">Statut</th>
                    <th className="py-2.5 px-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {financesData.orders.map((ord: PaymentOrder) => (
                    <tr key={ord.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-mono font-medium text-white">{ord.reference}</td>
                      <td className="py-2.5 px-3 text-slate-300">{ord.organizationName}</td>
                      <td className="py-2.5 px-3 text-slate-300">{ord.planName}</td>
                      <td className="py-2.5 px-3 uppercase text-slate-400">{ord.operator}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                        {ord.amount.toLocaleString('fr-FR')} {ord.currency}
                      </td>
                      <td className="py-2.5 px-3">
                        {ord.status === 'confirmed' ? (
                          <span className="text-emerald-400 font-semibold">Confirmé</span>
                        ) : ord.status === 'pending' ? (
                          <span className="text-amber-400 font-medium">En attente USSD</span>
                        ) : (
                          <span className="text-rose-400 font-medium">Échoué</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {new Date(ord.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: CLIENTS */}
      {activeTab === 'admin_clients' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white">Répertoire des Entreprises Clientes ({clients.length})</h3>
              <p className="text-xs text-slate-400">Suivi des abonnements, gestion des blocages et octroi d'extensions d'essai.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-800/40">
                    <th className="py-3 px-4 font-medium">Entreprise & Pays</th>
                    <th className="py-3 px-4 font-medium">Responsable</th>
                    <th className="py-3 px-4 font-medium">Offre & Statut</th>
                    <th className="py-3 px-4 font-medium">Échéance / Essai</th>
                    <th className="py-3 px-4 font-medium">Employés</th>
                    <th className="py-3 px-4 font-medium">Total Payé</th>
                    <th className="py-3 px-4 text-right font-medium">Actions Administrateur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {clients.map((c) => {
                    const isSuspended = c.organization.status === 'suspended';
                    return (
                      <tr key={c.organization.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-white">{c.organization.name}</p>
                          <p className="text-[10px] text-slate-400">{c.organization.country} ({c.currency})</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-white">{c.owner?.fullName || 'N/A'}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{c.owner?.phone}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-white capitalize block">{c.subscription.planCode}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded inline-block mt-0.5 ${
                              isSuspended
                                ? 'bg-rose-500/20 text-rose-300'
                                : c.isTrialExpired
                                ? 'bg-amber-500/20 text-amber-300'
                                : c.subscription.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-blue-500/20 text-blue-300'
                            }`}
                          >
                            {isSuspended
                              ? 'Compte Suspendu'
                              : c.isTrialExpired
                              ? 'Essai 72h Expiré'
                              : c.subscription.status === 'active'
                              ? 'Abonnement Actif'
                              : 'Essai en cours'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {c.subscription.trialEndsAt
                            ? new Date(c.subscription.trialEndsAt).toLocaleDateString('fr-FR')
                            : new Date(c.subscription.endsAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {c.employeesCount} employés
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          {c.totalPaid.toLocaleString('fr-FR')} {c.currency}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          {/* Extend Trial */}
                          {c.subscription.planCode === 'trial' && (
                            <button
                              onClick={() => {
                                setExtensionTarget(c);
                                setExtensionHours(48);
                                setExtensionJustification('');
                              }}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded text-[11px] inline-flex items-center gap-1"
                              title="Accorder une extension d'essai exceptionnelle avec motif journalisé"
                            >
                              <Sparkles className="w-3 h-3" />
                              Prolonger essai
                            </button>
                          )}

                          {/* Suspend / Unsuspend */}
                          <button
                            onClick={() => handleToggleClientStatus(c)}
                            className={`px-2 py-1 rounded text-[11px] border inline-flex items-center gap-1 ${
                              isSuspended
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {isSuspended ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                            {isSuspended ? 'Réactiver' : 'Suspendre'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: SUPPORT INBOX 3-VOLETS */}
      {activeTab === 'admin_support' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
            {[
              { id: 'all', label: 'Tous les tickets' },
              { id: 'urgent', label: 'Urgents & Prioritaires' },
              { id: 'open', label: 'Ouverts & En cours' },
              { id: 'resolved', label: 'Résolus' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setTicketFilter(f.id)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  ticketFilter === f.id
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* 3-Zone Support Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[600px]">
            {/* Zone 1: Ticket List (4 cols) */}
            <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
              <div className="p-3 border-b border-slate-800 bg-slate-800/40 flex justify-between items-center text-xs">
                <span className="font-semibold text-white">Boîte de Réception ({filteredTickets.length})</span>
              </div>
              <div className="divide-y divide-slate-800/60 overflow-y-auto max-h-[580px] flex-1">
                {filteredTickets.map((t) => {
                  const isSelected = selectedTicketId === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => loadTicketThread(t.id)}
                      className={`w-full text-left p-3.5 transition-colors flex flex-col gap-1 ${
                        isSelected ? 'bg-slate-800/90 border-l-2 border-emerald-400' : 'hover:bg-slate-800/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-emerald-400">
                          {t.organizationName}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            t.priority === 'urgent'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-white line-clamp-1">{t.subject}</p>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{t.lastMessageSnippet}</p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(t.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Zone 2: Conversation Thread & Admin Reply (5 cols) */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
              {ticketDetails ? (
                <>
                  {/* Header */}
                  <div className="p-3.5 border-b border-slate-800 bg-slate-800/40 flex justify-between items-center text-xs">
                    <div>
                      <h3 className="font-semibold text-white line-clamp-1">{ticketDetails.ticket.subject}</h3>
                      <p className="text-[11px] text-slate-400">{ticketDetails.ticket.userName} ({ticketDetails.ticket.userEmail})</p>
                    </div>

                    <select
                      value={ticketDetails.ticket.status}
                      onChange={(e) => handleUpdateTicketStatus(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    >
                      <option value="open">Ouvert</option>
                      <option value="in_progress">En cours</option>
                      <option value="waiting_client">En attente client</option>
                      <option value="resolved">Résolu</option>
                      <option value="closed">Fermé</option>
                    </select>
                  </div>

                  {/* Message Thread */}
                  <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[420px]">
                    {ticketDetails.messages.map((m) => {
                      const isAdmin = m.senderRole === 'support_admin';
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col max-w-[85%] ${
                            isAdmin ? 'ml-auto items-end' : 'mr-auto items-start'
                          }`}
                        >
                          <span className="text-[10px] text-slate-400 mb-1">
                            {isAdmin ? '🛡️ Vous (Support Admin)' : m.senderName} ·{' '}
                            {new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div
                            className={`p-3 rounded-xl text-xs leading-relaxed ${
                              isAdmin
                                ? 'bg-emerald-600 text-white rounded-tr-sm'
                                : 'bg-slate-800 text-white rounded-tl-sm border border-slate-700'
                            }`}
                          >
                            {m.content}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Admin Reply Form */}
                  <form onSubmit={handleSendAdminReply} className="p-3 border-t border-slate-800 bg-slate-800/40 flex gap-2">
                    <input
                      type="text"
                      placeholder="Répondre officiellement au client..."
                      value={adminReplyText}
                      onChange={(e) => setAdminReplyText(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={isSendingReply || !adminReplyText.trim()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Répondre</span>
                    </button>
                  </form>
                </>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 flex-1 flex items-center justify-center">
                  Sélectionnez un ticket pour afficher le fil de discussion.
                </div>
              )}
            </div>

            {/* Zone 3: Client Profile & Internal Private Notes (3 cols) */}
            <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
              {ticketDetails ? (
                <>
                  <div className="space-y-3 text-xs">
                    <h3 className="font-semibold text-white border-b border-slate-800 pb-2 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-emerald-400" />
                      Fiche Contextuelle Client
                    </h3>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Entreprise :</span>
                      <span className="font-semibold text-white">{ticketDetails.clientContext?.organization?.name}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Abonnement :</span>
                      <span className="text-emerald-400 font-medium">
                        {ticketDetails.clientContext?.subscription?.planCode?.toUpperCase()} (
                        {ticketDetails.clientContext?.subscription?.status})
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Contact :</span>
                      <span className="text-slate-200 font-mono">{ticketDetails.clientContext?.organization?.phone}</span>
                    </div>
                  </div>

                  {/* Private Internal Notes (IN-VISIBLE TO CLIENT) */}
                  <div className="pt-3 border-t border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Notes Internes (Secret Admin)
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 italic">
                      Ces notes sont strictement confidentielles et ne sont jamais affichées au client.
                    </p>

                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {ticketDetails.internalNotes.length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic">Aucune note interne pour l’instant.</p>
                      ) : (
                        ticketDetails.internalNotes.map((note) => (
                          <div key={note.id} className="p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg text-[11px]">
                            <p className="text-slate-300">{note.note}</p>
                            <span className="text-[9px] text-slate-500 block mt-1">
                              {note.authorName} · {new Date(note.createdAt).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={handleAddInternalNote} className="space-y-2">
                      <textarea
                        rows={2}
                        placeholder="Ajouter une note d’équipe interne..."
                        value={internalNoteText}
                        onChange={(e) => setInternalNoteText(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:border-amber-500"
                      />
                      <button
                        type="submit"
                        disabled={!internalNoteText.trim()}
                        className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 rounded text-xs font-medium"
                      >
                        Enregistrer la note interne
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-500 text-center my-auto">Fiche client contextuelle</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: INCIDENTS & CONTROLLED REPAIR */}
      {activeTab === 'admin_incidents' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Surveillance des Événements Techniques & Actions de Réparation Contrôlées
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Identifiez les incidents de webhooks ou synchronisations et déclenchez des procédures de remédiation traçables sans risque de double débit.
            </p>
          </div>

          <div className="space-y-4">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                        inc.severity === 'critical'
                          ? 'bg-rose-500/20 text-rose-300'
                          : inc.severity === 'error'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {inc.severity.toUpperCase()}
                    </span>
                    <h3 className="text-sm font-semibold text-white">{inc.component}</h3>
                  </div>

                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(inc.createdAt).toLocaleString('fr-FR')}
                  </span>
                </div>

                <p className="text-xs text-slate-300">{inc.description}</p>
                {inc.errorDetails && (
                  <p className="text-[11px] font-mono bg-slate-800/80 p-2.5 rounded text-rose-300/90 border border-slate-700">
                    {inc.errorDetails}
                  </p>
                )}

                {/* Repair Action */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800">
                  <div className="text-[11px] text-slate-400">
                    Statut : <span className="font-semibold text-white capitalize">{inc.status}</span>
                  </div>

                  {inc.canRepair && inc.status !== 'resolved' && (
                    <button
                      onClick={() => handleExecuteRepair(inc.id, inc.repairActionType || 'reverify_payment')}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Exécuter la vérification / réconciliation sécurisée
                    </button>
                  )}
                </div>

                {/* Audit Trail for this incident */}
                {inc.repairAuditLog?.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-300">Journal d’intervention :</p>
                    {inc.repairAuditLog.map((log, idx) => (
                      <p key={idx} className="font-mono">
                        • {log}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: AUDIT LOGS */}
      {activeTab === 'admin_audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white">Registre Inaltérable des Traces d'Audit</h3>
            <p className="text-xs text-slate-400">Traçabilité complète des actions sensibles exécutées sur la plateforme.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-800/40">
                  <th className="py-2.5 px-3 font-medium">Horodatage</th>
                  <th className="py-2.5 px-3 font-medium">Auteur</th>
                  <th className="py-2.5 px-3 font-medium">Action</th>
                  <th className="py-2.5 px-3 font-medium">Entité Cible</th>
                  <th className="py-2.5 px-3 font-medium">Détails de l’opération</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(log.timestamp).toLocaleString('fr-FR')}
                    </td>
                    <td className="py-2.5 px-3 text-white font-sans font-medium">
                      {log.actorName} ({log.actorRole})
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400 font-semibold">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-sans">
                      {log.targetEntity}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-sans">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Grant Trial Extension with Required Justification */}
      {extensionTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Prolongation Exceptionnelle d’Essai
              </h3>
              <button onClick={() => setExtensionTarget(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-lg text-xs">
              <p className="font-semibold text-white">{extensionTarget.organization.name}</p>
              <p className="text-slate-400">Responsable : {extensionTarget.owner?.fullName}</p>
            </div>

            <form onSubmit={handleConfirmTrialExtension} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Durée de l’extension</label>
                <select
                  value={extensionHours}
                  onChange={(e) => setExtensionHours(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                >
                  <option value={24}>+24 heures (1 jour supplémentaire)</option>
                  <option value={48}>+48 heures (2 jours supplémentaires)</option>
                  <option value={72}>+72 heures (3 jours supplémentaires)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Justification administrative obligatoire *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ex : Négociation commerciale en cours avec le DG, attente déblocage budget Mobile Money..."
                  value={extensionJustification}
                  onChange={(e) => setExtensionJustification(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Cette justification sera définitivement enregistrée dans les journaux d'audit et consultable par la direction.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setExtensionTarget(null)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isExtending || !extensionJustification.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold"
                >
                  {isExtending ? 'Validation...' : 'Confirmer et journaliser'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
