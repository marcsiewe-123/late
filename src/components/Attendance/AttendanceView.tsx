/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { AttendanceRecord } from '../../types';
import {
  Clock,
  Calendar,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  X,
  FileCheck,
} from 'lucide-react';

export const AttendanceView: React.FC = () => {
  const { user, canPerformWriteActions } = useAuth();
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState<boolean>(true);

  // Correction Modal State
  const [correctionTarget, setCorrectionTarget] = useState<AttendanceRecord | null>(null);
  const [newCheckIn, setNewCheckIn] = useState<string>('');
  const [newCheckOut, setNewCheckOut] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadAttendance = async (date: string) => {
    try {
      setLoading(true);
      const res = await api.getReports({ period: 'custom', startDate: date, endDate: date });
      setAttendances(res.attendances || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance(selectedDate);
  }, [selectedDate]);

  const openCorrectionModal = (att: AttendanceRecord) => {
    setCorrectionTarget(att);
    setNewCheckIn(att.checkInTime || '08:00');
    setNewCheckOut(att.checkOutTime || '17:00');
    setCorrectionReason('');
    setStatusMsg(null);
  };

  const handleApplyCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionTarget || !correctionReason.trim()) return;

    if (!canPerformWriteActions) {
      setStatusMsg({ type: 'error', text: 'Action impossible : abonnement expiré.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      await api.submitManualCorrection({
        attendanceId: correctionTarget.id,
        newCheckInTime: newCheckIn,
        newCheckOutTime: newCheckOut,
        reason: correctionReason,
        authorName: user?.fullName || 'Responsable RH',
      });
      setStatusMsg({ type: 'success', text: 'Correction manuelle enregistrée et journalisée.' });
      setCorrectionTarget(null);
      await loadAttendance(selectedDate);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Erreur lors de la correction' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div>
          <h1 className="text-base font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            Registre des Pointages & Présences
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Consultez les heures d’arrivée, de départ, retards calculés et corrections manuelles.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500"
          />
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)}>
            <X className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
          </button>
        </div>
      )}

      {/* Attendance Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-800/40">
                <th className="py-3 px-4 font-medium">Matricule & Employé</th>
                <th className="py-3 px-4 font-medium">Département</th>
                <th className="py-3 px-4 font-medium">Arrivée Pointée</th>
                <th className="py-3 px-4 font-medium">Départ Pointé</th>
                <th className="py-3 px-4 font-medium">Statut Retard</th>
                <th className="py-3 px-4 font-medium">Source</th>
                <th className="py-3 px-4 text-right font-medium">Correction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Chargement des présences...
                  </td>
                </tr>
              ) : attendances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Aucun enregistrement de présence pour le {selectedDate}.
                  </td>
                </tr>
              ) : (
                attendances.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-medium text-white">{att.employeeName}</p>
                      <span className="text-[10px] text-slate-500 font-mono">{att.matricule}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{att.department || 'Général'}</td>
                    <td className="py-3 px-4 font-mono font-medium text-emerald-400">
                      {att.checkInTime || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {att.checkOutTime || '—'}
                    </td>
                    <td className="py-3 px-4">
                      {att.lateMinutes > 0 ? (
                        <div className="flex items-center gap-1.5 text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span className="font-semibold">+{att.lateMinutes} min</span>
                        </div>
                      ) : (
                        <span className="text-emerald-400 font-medium">À l’heure</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {att.source === 'manual_correction' ? (
                        <span className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded">
                          ✍️ Corrigé ({att.correctedBy})
                        </span>
                      ) : att.source === 'offline_sync' ? (
                        <span className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded">
                          📶 Synchro Hors-Ligne
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Normal</span>
                      )}
                      {att.correctionReason && (
                        <p className="text-[10px] text-slate-400 italic mt-0.5">
                          « {att.correctionReason} »
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openCorrectionModal(att)}
                        className="text-xs text-slate-400 hover:text-emerald-400 p-1 rounded hover:bg-slate-800 transition-colors inline-flex items-center gap-1"
                        title="Corriger manuellement cet horaire"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Rectifier</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Correction Modal */}
      {correctionTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                Rectification Manuelle d’Horaire
              </h2>
              <button onClick={() => setCorrectionTarget(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-lg text-xs space-y-1">
              <p className="text-white font-medium">{correctionTarget.employeeName} ({correctionTarget.matricule})</p>
              <p className="text-slate-400">Date : {correctionTarget.date}</p>
              <p className="text-slate-400">
                Valeurs actuelles : Arrivée = <span className="font-mono text-emerald-400">{correctionTarget.checkInTime || 'Non pointé'}</span> | Départ = <span className="font-mono text-slate-300">{correctionTarget.checkOutTime || 'Non pointé'}</span>
              </p>
            </div>

            <form onSubmit={handleApplyCorrection} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Nouvelle Arrivée</label>
                  <input
                    type="time"
                    step="1"
                    required
                    value={newCheckIn}
                    onChange={(e) => setNewCheckIn(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Nouveau Départ</label>
                  <input
                    type="time"
                    step="1"
                    value={newCheckOut}
                    onChange={(e) => setNewCheckOut(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Motif obligatoire de la correction *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ex : Oubli de pointage à l’arrivée, justification acceptée par la direction..."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Chaque correction enregistre votre nom, l’ancienne valeur et le motif dans les journaux d’audit.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCorrectionTarget(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !correctionReason.trim()}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                >
                  {isSubmitting ? 'Enregistrement...' : 'Valider la rectification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
