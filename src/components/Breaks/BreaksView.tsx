/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { BreakRecord, Employee } from '../../types';
import {
  Coffee,
  Play,
  Square,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export const BreaksView: React.FC = () => {
  const { canPerformWriteActions } = useAuth();
  const [breaks, setBreaks] = useState<BreakRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [breakNotes, setBreakNotes] = useState<string>('Pause déjeuner');
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [todayRes, empRes] = await Promise.all([
        api.getTodayAttendance(),
        api.getEmployees(),
      ]);
      setBreaks(todayRes.breaks || []);
      setEmployees(empRes.employees || []);
      if (empRes.employees?.length > 0 && !selectedEmpId) {
        setSelectedEmpId(empRes.employees[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeBreaks = breaks.filter((b) => b.status === 'in_progress');
  const completedBreaks = breaks.filter((b) => b.status === 'completed');

  const handleStartBreak = async () => {
    if (!selectedEmpId) return;
    if (!canPerformWriteActions) {
      setFeedback({ type: 'error', text: 'Abonnement expiré. Actions bloquées.' });
      return;
    }

    try {
      const res = await api.startBreak({
        employeeId: selectedEmpId,
        notes: breakNotes,
      });
      setFeedback({ type: 'success', text: res.message });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Impossible de démarrer la pause' });
    }
  };

  const handleEndBreak = async (empId: string) => {
    if (!canPerformWriteActions) {
      setFeedback({ type: 'error', text: 'Abonnement expiré. Actions bloquées.' });
      return;
    }

    try {
      const res = await api.endBreak({ employeeId: empId });
      setFeedback({ type: 'success', text: res.message });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Impossible de terminer la pause' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold text-white flex items-center gap-2">
            <Coffee className="w-4 h-4 text-blue-400" />
            Gestion des Pauses du Personnel
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Suivi en temps réel des temps de repos, pauses café et repas selon la politique de l’entreprise.
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Start Break Trigger Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Play className="w-4 h-4 text-emerald-400" />
          Déclencher une nouvelle pause
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Collaborateur</label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.matricule} — {e.firstName} {e.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Motif / Type de pause</label>
            <input
              type="text"
              value={breakNotes}
              onChange={(e) => setBreakNotes(e.target.value)}
              placeholder="Ex: Pause déjeuner, Pause café..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleStartBreak}
              disabled={!canPerformWriteActions}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              Démarrer le chronomètre
            </button>
          </div>
        </div>
      </div>

      {/* Active Breaks Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
          Pauses actuellement en cours ({activeBreaks.length})
        </h2>

        {activeBreaks.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-xs text-slate-500">
            Aucun employé n’est actuellement en pause.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeBreaks.map((brk) => (
              <div
                key={brk.id}
                className="bg-slate-900 border border-blue-500/30 rounded-xl p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">{brk.employeeName}</span>
                    <span className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded">
                      En cours
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Débutée à : <span className="font-mono text-white">{brk.startTime}</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    Motif : <span className="text-slate-300">{brk.notes || 'Pause'}</span>
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    Enregistrée
                  </span>
                  <button
                    onClick={() => handleEndBreak(brk.employeeId)}
                    disabled={!canPerformWriteActions}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <Square className="w-3 h-3" />
                    Terminer la pause
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Breaks History */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white">Historique des pauses terminées aujourd’hui</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-800/40">
                <th className="py-2.5 px-4 font-medium">Collaborateur</th>
                <th className="py-2.5 px-4 font-medium">Début</th>
                <th className="py-2.5 px-4 font-medium">Fin</th>
                <th className="py-2.5 px-4 font-medium">Durée totale</th>
                <th className="py-2.5 px-4 font-medium">Motif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {completedBreaks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    Aucune pause terminée enregistrée aujourd’hui.
                  </td>
                </tr>
              ) : (
                completedBreaks.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-4 font-medium text-white">{b.employeeName}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-300">{b.startTime}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-300">{b.endTime || '—'}</td>
                    <td className="py-2.5 px-4 font-mono text-emerald-400 font-semibold">
                      {b.durationMinutes} min
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">{b.notes || 'Pause'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
