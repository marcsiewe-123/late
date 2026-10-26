/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  Settings,
  Building2,
  Clock,
  Shield,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { organization, refreshMe } = useAuth();

  const [formData, setFormData] = useState({
    name: organization?.name || '',
    legalNumber: organization?.legalNumber || '',
    phone: organization?.phone || '',
    address: organization?.address || '',
    timeZone: organization?.timeZone || 'Africa/Douala',
    workStartTime: organization?.workStartTime || '08:00',
    workEndTime: organization?.workEndTime || '17:00',
    lateGraceMinutes: organization?.lateGraceMinutes || 15,
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      await api.updateOrganization(organization.id, formData);
      setFeedback({ type: 'success', text: 'Paramètres enregistrés avec succès.' });
      await refreshMe();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erreur lors de l’enregistrement' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h1 className="text-base font-semibold text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-emerald-400" />
          Paramètres de l’Entreprise & Horaires
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Configurez les horaires de travail de référence, la tolérance de retard et les coordonnées légales.
        </p>
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

      <form onSubmit={handleSave} className="space-y-6">
        {/* Coordonnées & Juridique */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Building2 className="w-4 h-4 text-emerald-400" />
            Informations Légales & Contact
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Raison Sociale / Nom Entreprise
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                N° RCCM / Registre du Commerce
              </label>
              <input
                type="text"
                placeholder="Ex: RC/DLA/2021/B/1842"
                value={formData.legalNumber}
                onChange={(e) => setFormData({ ...formData, legalNumber: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Téléphone de Contact
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Adresse & Siège Social
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Règles de Travail & Retards */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Clock className="w-4 h-4 text-emerald-400" />
            Horaires de Référence & Tolérance de Retard
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Fuseau Horaire
              </label>
              <select
                value={formData.timeZone}
                onChange={(e) => setFormData({ ...formData, timeZone: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
              >
                <option value="Africa/Douala">GMT+1 (Douala, Yaoundé, Lagos, Libreville)</option>
                <option value="Africa/Abidjan">GMT+0 (Abidjan, Dakar, Bamako, Ouagadougou)</option>
                <option value="Africa/Kinshasa">GMT+1 (Kinshasa, Brazzaville)</option>
                <option value="Africa/Lubumbashi">GMT+2 (Lubumbashi, Goma)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tolérance de retard (minutes)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={formData.lateGraceMinutes}
                onChange={(e) => setFormData({ ...formData, lateGraceMinutes: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Arrivée considérée comme « À l’heure » tant qu’elle ne dépasse pas cette marge.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Heure d’arrivée standard
              </label>
              <input
                type="time"
                value={formData.workStartTime}
                onChange={(e) => setFormData({ ...formData, workStartTime: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Heure de départ standard
              </label>
              <input
                type="time"
                value={formData.workEndTime}
                onChange={(e) => setFormData({ ...formData, workEndTime: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
    </div>
  );
};
