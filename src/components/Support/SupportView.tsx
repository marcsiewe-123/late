/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { SupportTicket, SupportMessage } from '../../types';
import {
  LifeBuoy,
  Plus,
  Send,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  User,
  ShieldCheck,
} from 'lucide-react';

export const SupportView: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyContent, setReplyContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);

  // New ticket modal state
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [newSubject, setNewSubject] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('technical');
  const [newPriority, setNewPriority] = useState<string>('normal');
  const [newInitialMsg, setNewInitialMsg] = useState<string>('');

  const loadTickets = async () => {
    try {
      setLoading(true);
      const res = await api.getSupportTickets();
      setTickets(res.tickets || []);
      if (res.tickets?.length > 0 && !activeTicket) {
        selectTicket(res.tickets[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const selectTicket = async (ticket: SupportTicket) => {
    setActiveTicket(ticket);
    try {
      const res = await api.getTicketThread(ticket.id);
      setMessages(res.messages || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyContent.trim()) return;

    setIsSending(true);
    try {
      await api.sendTicketMessage(activeTicket.id, replyContent);
      setReplyContent('');
      const threadRes = await api.getTicketThread(activeTicket.id);
      setMessages(threadRes.messages || []);
      await loadTickets();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newInitialMsg.trim()) return;

    try {
      const res = await api.createSupportTicket({
        subject: newSubject,
        category: newCategory,
        priority: newPriority,
        message: newInitialMsg,
      });

      setShowNewModal(false);
      setNewSubject('');
      setNewInitialMsg('');
      await loadTickets();
      if (res.ticket) {
        selectTicket(res.ticket);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResolveTicket = async () => {
    if (!activeTicket) return;
    try {
      await api.updateTicketStatus(activeTicket.id, 'resolved');
      setActiveTicket({ ...activeTicket, status: 'resolved' });
      await loadTickets();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold text-white flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-emerald-400" />
            Centre d’Aide & Chat Support Direct
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Échangez directement avec l’équipe technique PointAfrik en cas de question ou d’incident.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow"
        >
          <Plus className="w-3.5 h-3.5" />
          Ouvrir un nouveau ticket
        </button>
      </div>

      {/* Main 2-Pane Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px]">
        {/* Left Pane: Ticket List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-slate-800 bg-slate-800/40">
            <h2 className="text-xs font-semibold text-white">Vos tickets d’assistance</h2>
          </div>

          <div className="divide-y divide-slate-800/60 overflow-y-auto max-h-[540px] flex-1">
            {loading ? (
              <p className="p-4 text-xs text-slate-500 text-center">Chargement des tickets...</p>
            ) : tickets.length === 0 ? (
              <p className="p-6 text-xs text-slate-500 text-center">
                Aucun ticket ouvert. Cliquez sur « Ouvrir un nouveau ticket » pour contacter le support.
              </p>
            ) : (
              tickets.map((t) => {
                const isSelected = activeTicket?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => selectTicket(t)}
                    className={`w-full text-left p-3.5 transition-colors flex flex-col gap-1.5 ${
                      isSelected ? 'bg-slate-800/90 border-l-2 border-emerald-400' : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500 uppercase">
                        {t.category}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          t.status === 'resolved'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : t.priority === 'urgent'
                            ? 'bg-rose-500/10 text-rose-400'
                            : 'bg-blue-500/10 text-blue-400'
                        }`}
                      >
                        {t.status === 'resolved'
                          ? 'Résolu'
                          : t.status === 'waiting_client'
                          ? 'Réponse reçue'
                          : t.status === 'in_progress'
                          ? 'En cours'
                          : 'Ouvert'}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-white line-clamp-1">{t.subject}</p>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{t.lastMessageSnippet}</p>

                    <span className="text-[10px] text-slate-500 font-mono mt-1">
                      {new Date(t.updatedAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Thread */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col lg:col-span-2 overflow-hidden">
          {activeTicket ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-800/40 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{activeTicket.subject}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Catégorie : <span className="text-slate-300 capitalize">{activeTicket.category}</span> · Priorité : <span className="text-slate-300 capitalize">{activeTicket.priority}</span>
                  </p>
                </div>

                {activeTicket.status !== 'resolved' && (
                  <button
                    onClick={handleResolveTicket}
                    className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-xs font-medium flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirmer résolu
                  </button>
                )}
              </div>

              {/* Message List */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[400px]">
                {messages.map((msg) => {
                  const isAdmin = msg.senderRole === 'support_admin';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[85%] ${
                        isAdmin ? 'mr-auto items-start' : 'ml-auto items-end'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
                        {isAdmin ? (
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <User className="w-3 h-3 text-slate-400" />
                        )}
                        <span className="font-medium text-slate-300">{msg.senderName}</span>
                        <span className="font-mono text-[10px]">
                          {new Date(msg.createdAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed ${
                          isAdmin
                            ? 'bg-slate-800 text-white rounded-tl-sm border border-slate-700'
                            : 'bg-emerald-600 text-white rounded-tr-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Message Reply Box */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-800/40 flex gap-2">
                <input
                  type="text"
                  placeholder="Écrivez votre message..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={isSending || !replyContent.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Envoyer</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex items-center justify-center flex-1 p-8 text-center text-xs text-slate-500">
              Sélectionnez un ticket pour afficher la conversation.
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Créer un ticket d’assistance
              </h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Objet de la demande *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex : Question sur le paiement Orange Money, problème de pointage..."
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Catégorie</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                  >
                    <option value="technical">Problème Technique</option>
                    <option value="payment">Paiement Mobile Money</option>
                    <option value="subscription">Abonnement & Facturation</option>
                    <option value="hr">Gestion du Personnel</option>
                    <option value="sync">Synchronisation Hors-Ligne</option>
                    <option value="feature_request">Demande de Fonctionnalité</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Gravité / Urgence</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                  >
                    <option value="low">Faible</option>
                    <option value="normal">Normale</option>
                    <option value="high">Haute</option>
                    <option value="urgent">Urgente (Bloquant)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Détails du message *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Décrivez votre situation en détail..."
                  value={newInitialMsg}
                  onChange={(e) => setNewInitialMsg(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                >
                  Envoyer le ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
