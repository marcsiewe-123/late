/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, ApiError } from '../../lib/api';
import { offlineQueue } from '../../lib/offlineQueue';
import {
  Users,
  Clock,
  Coffee,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export const DashboardView: React.FC<{ onOpenUpgrade: () => void }> = ({ onOpenUpgrade }) => {
  const { organization, isTrialExpired, canPerformWriteActions } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [pointageAction, setPointageAction] = useState<'check_in' | 'check_out' | 'break_start' | 'break_end'>('check_in');
  const [actionNotes, setActionNotes] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchTodayData = async () => {
    try {
      const [todayRes, empRes] = await Promise.all([
        api.getTodayAttendance(),
        api.getEmployees(),
      ]);
      setData(todayRes);
      setEmployees(empRes.employees || []);
      if (empRes.employees?.length > 0 && !selectedEmpId) {
        setSelectedEmpId(empRes.employees[0].id);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayData();
  }, []);

  const handlePointage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) return;

    if (!canPerformWriteActions) {
      setFeedbackMsg({
        type: 'error',
        text: 'Votre période d’essai de 72h a expiré. Activez votre abonnement pour enregistrer des présences.',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedbackMsg(null);

    const emp = employees.find((x) => x.id === selectedEmpId);
    const empName = emp ? `${emp.firstName} ${emp.lastName}` : 'Employé';

    try {
      if (!navigator.onLine) {
        // Enqueue offline
        if (pointageAction === 'check_in' || pointageAction === 'check_out') {
          offlineQueue.enqueue({
            type: pointageAction,
            employeeId: selectedEmpId,
            employeeName: empName,
            timestamp: Date.now(),
            notes: actionNotes,
          });
          setFeedbackMsg({
            type: 'success',
            text: `[Hors-ligne] Pointage enregistré localement pour ${empName}. Synchronisation automatique dès reconnexion.`,
          });
          setActionNotes('');
        }
        return;
      }

      if (pointageAction === 'check_in') {
        const res = await api.clockIn({
          employeeId: selectedEmpId,
          notes: actionNotes,
        });
        setFeedbackMsg({ type: 'success', text: res.message });
      } else if (pointageAction === 'check_out') {
        const res = await api.clockOut({
          employeeId: selectedEmpId,
        });
        setFeedbackMsg({ type: 'success', text: res.message });
      } else if (pointageAction === 'break_start') {
        const res = await api.startBreak({
          employeeId: selectedEmpId,
          notes: actionNotes || 'Pause café/déjeuner',
        });
        setFeedbackMsg({ type: 'success', text: res.message });
      } else if (pointageAction === 'break_end') {
        const res = await api.endBreak({
          employeeId: selectedEmpId,
        });
        setFeedbackMsg({ type: 'success', text: res.message });
      }

      setActionNotes('');
      await fetchTodayData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Une erreur est survenue' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const attendances = data?.attendances || [];
  const breaks = data?.breaks || [];
  const activeBreaks = breaks.filter((b: any) => b.status === 'in_progress');

  return (
    <div className="space-y-6">
      {/* Expiration Banner if trial ended */}
      {isTrialExpired && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
            <div>
              <p className="font-semibold text-rose-300 text-sm">Période d’essai de 72h terminée</p>
              <p className="text-xs text-rose-200/80">
                Vos données sont conservées en toute sécurité. Les actions d’écriture (pointage, ajouts d’employés) sont temporairement bloquées.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenUpgrade}
            className="whitespace-nowrap px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Activer l’accès complet par Mobile Money
          </button>
        </div>
      )}

      {/* Real-time KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Présents</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{data?.presentCount || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">sur {data?.totalEmployees || 0} employés</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">En retard</span>
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-2">{data?.lateCount || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Tolérance: {organization?.lateGraceMinutes || 15} min</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">En pause active</span>
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
          </div>
          <p className="text-2xl font-bold text-blue-400 mt-2">{data?.onBreakCount || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Actuellement au repos</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Absents</span>
            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
          </div>
          <p className="text-2xl font-bold text-slate-300 mt-2">{data?.absentCount || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Non encore pointés</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Retards cumulés</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2 font-mono">
            {data?.totalLateMinutes || 0} <span className="text-xs text-slate-400 font-normal">min</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Aujourd’hui</p>
        </div>
      </div>

      {/* Main Grid: Quick Clock-In Box + Live Stream Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Pointage Terminal */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 lg:col-span-1">
          <h2 className="font-semibold text-white text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            Module de Pointage Rapide
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Enregistrez l’arrivée, le départ ou une pause en un clic.
          </p>

          <form onSubmit={handlePointage} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Sélectionner l’employé
              </label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.matricule} — {emp.firstName} {emp.lastName} ({emp.department})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Type d’opération
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPointageAction('check_in')}
                  className={`px-3 py-2 text-xs rounded-lg font-medium border text-center transition-colors ${
                    pointageAction === 'check_in'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  🟢 Arrivée (Pointage)
                </button>
                <button
                  type="button"
                  onClick={() => setPointageAction('check_out')}
                  className={`px-3 py-2 text-xs rounded-lg font-medium border text-center transition-colors ${
                    pointageAction === 'check_out'
                      ? 'bg-slate-700 text-white border-slate-600'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  🏁 Départ
                </button>
                <button
                  type="button"
                  onClick={() => setPointageAction('break_start')}
                  className={`px-3 py-2 text-xs rounded-lg font-medium border text-center transition-colors ${
                    pointageAction === 'break_start'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  ☕ Début Pause
                </button>
                <button
                  type="button"
                  onClick={() => setPointageAction('break_end')}
                  className={`px-3 py-2 text-xs rounded-lg font-medium border text-center transition-colors ${
                    pointageAction === 'break_end'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  ⏳ Fin Pause
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Note facultative
              </label>
              <input
                type="text"
                placeholder="Ex : Mission extérieure, bouchons..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {feedbackMsg && (
              <div
                className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                  feedbackMsg.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                }`}
              >
                {feedbackMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                )}
                <span>{feedbackMsg.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !canPerformWriteActions}
              className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 ${
                !canPerformWriteActions
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isSubmitting ? (
                'Validation en cours...'
              ) : (
                <>
                  <span>Valider l’opération</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Attendance Stream & Anomalies */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-white text-sm">Registre des Présences d’Aujourd’hui</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Horaires d’entreprise : {organization?.workStartTime || '08:00'} - {organization?.workEndTime || '17:00'}
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2.5 font-medium">Employé</th>
                    <th className="pb-2.5 font-medium">Département</th>
                    <th className="pb-2.5 font-medium">Arrivée</th>
                    <th className="pb-2.5 font-medium">Départ</th>
                    <th className="pb-2.5 font-medium">Statut</th>
                    <th className="pb-2.5 font-medium">Retard</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {attendances.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        Aucun pointage enregistré pour l’instant aujourd’hui.
                      </td>
                    </tr>
                  ) : (
                    attendances.map((att: any) => (
                      <tr key={att.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5">
                          <p className="font-medium text-white">{att.employeeName}</p>
                          <span className="text-[10px] text-slate-500 font-mono">{att.matricule}</span>
                        </td>
                        <td className="py-2.5 text-slate-300">{att.department || 'Général'}</td>
                        <td className="py-2.5 font-mono text-emerald-400">{att.checkInTime || '—'}</td>
                        <td className="py-2.5 font-mono text-slate-400">{att.checkOutTime || '—'}</td>
                        <td className="py-2.5">
                          {att.status === 'late' ? (
                            <span className="text-[11px] text-amber-400 font-medium">
                              ⚠️ En retard
                            </span>
                          ) : (
                            <span className="text-[11px] text-emerald-400 font-medium">
                              ✅ À l’heure
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 font-mono text-xs">
                          {att.lateMinutes > 0 ? (
                            <span className="text-amber-400 font-semibold">+{att.lateMinutes} min</span>
                          ) : (
                            <span className="text-slate-500">0 min</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Breaks Callout */}
          {activeBreaks.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-800">
              <p className="text-xs font-semibold text-blue-400 mb-2 flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5" />
                Collaborateurs actuellement en pause :
              </p>
              <div className="flex flex-wrap gap-2">
                {activeBreaks.map((brk: any) => (
                  <div
                    key={brk.id}
                    className="bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs px-2.5 py-1 rounded-lg flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
                    <span className="font-medium">{brk.employeeName}</span>
                    <span className="text-[11px] text-slate-400 font-mono">depuis {brk.startTime}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
