/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Employee } from '../../types';
import {
  Users,
  UserPlus,
  FileUp,
  Download,
  Search,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';

export const EmployeesView: React.FC<{ onOpenUpgrade: () => void }> = ({ onOpenUpgrade }) => {
  const { subscription, canPerformWriteActions } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // Modal states
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New employee form state
  const [formData, setFormData] = useState({
    matricule: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: 'Exploitation',
    position: 'Collaborateur',
    hireDate: new Date().toISOString().split('T')[0],
    scheduledStart: '08:00',
    scheduledEnd: '17:00',
  });

  // CSV Import state
  const [csvContent, setCsvContent] = useState<string>('');

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.getEmployees();
      setEmployees(res.employees || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));
  const maxAllowed = subscription?.maxEmployees || 5;
  const isQuotaReached = employees.length >= maxAllowed;

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.matricule.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.phone.includes(searchTerm);
    const matchesDept = departmentFilter === 'all' || emp.department === departmentFilter;
    return matchesSearch && matchesDept;
  });

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!canPerformWriteActions) {
      setErrorMsg('Abonnement expiré. Veuillez renouveler votre forfait.');
      return;
    }

    if (isQuotaReached) {
      setErrorMsg(`Quota atteint (${maxAllowed} employés max). Passez au forfait supérieur.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createEmployee(formData);
      setSuccessMsg(`Employé ${formData.firstName} ${formData.lastName} ajouté avec succès.`);
      setShowAddModal(false);
      setFormData({
        matricule: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        department: 'Exploitation',
        position: 'Collaborateur',
        hireDate: new Date().toISOString().split('T')[0],
        scheduledStart: '08:00',
        scheduledEnd: '17:00',
      });
      await loadEmployees();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.importEmployeesCsv(csvContent);
      setSuccessMsg(`${res.addedCount} employés importés avec succès !`);
      if (res.errors?.length > 0) {
        setErrorMsg(`Avertissements : ${res.errors.join(' | ')}`);
      }
      setShowImportModal(false);
      setCsvContent('');
      await loadEmployees();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de l’importation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!window.confirm(`Confirmez-vous la suppression de ${name} du registre ?`)) return;

    try {
      await api.deleteEmployee(id);
      await loadEmployees();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportCsv = () => {
    const headers = ['Matricule', 'Prénom', 'Nom', 'Téléphone', 'Email', 'Département', 'Poste', 'Horaire Début', 'Horaire Fin'];
    const rows = employees.map((e) => [
      e.matricule,
      e.firstName,
      e.lastName,
      e.phone,
      e.email || '',
      e.department,
      e.position,
      e.scheduledStart,
      e.scheduledEnd,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PointAfrik_Employes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quota */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div>
          <h1 className="text-base font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Répertoire du Personnel
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Gérez vos collaborateurs, leurs fiches, matricules et plannings de travail.
          </p>
        </div>

        {/* Quota Badge & Upgrade Button */}
        <div className="flex items-center gap-3">
          <div className="text-xs bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg">
            <span className="text-slate-400">Quota forfait : </span>
            <span className={`font-mono font-bold ${isQuotaReached ? 'text-amber-400' : 'text-emerald-400'}`}>
              {employees.length} / {maxAllowed}
            </span>
          </div>

          {isQuotaReached && (
            <button
              onClick={onOpenUpgrade}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Augmenter le quota
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <FileUp className="w-3.5 h-3.5" />
              Importer CSV
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              disabled={isQuotaReached || !canPerformWriteActions}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isQuotaReached || !canPerformWriteActions
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Ajouter un employé
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)}>
            <X className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
          </button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Rechercher par nom, matricule..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Tous les départements</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportCsv}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Exporter CSV
          </button>
        </div>
      </div>

      {/* Employees Directory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-800/40">
                <th className="py-3 px-4 font-medium">Matricule</th>
                <th className="py-3 px-4 font-medium">Collaborateur</th>
                <th className="py-3 px-4 font-medium">Département & Poste</th>
                <th className="py-3 px-4 font-medium">Téléphone</th>
                <th className="py-3 px-4 font-medium">Horaire Normal</th>
                <th className="py-3 px-4 font-medium">Date d’embauche</th>
                <th className="py-3 px-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Chargement du personnel...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Aucun employé trouvé.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-emerald-400">
                      {emp.matricule}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-white">{emp.firstName} {emp.lastName}</p>
                      {emp.email && <p className="text-[11px] text-slate-400">{emp.email}</p>}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-white">{emp.position}</p>
                      <p className="text-[11px] text-slate-400">{emp.department}</p>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {emp.phone}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {emp.scheduledStart} - {emp.scheduledEnd}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(emp.hireDate).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteEmployee(emp.id, `${emp.firstName} ${emp.lastName}`)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                        title="Archiver/Supprimer l'employé"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                Ajouter un nouveau collaborateur
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Matricule RH *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: EMP-009"
                    value={formData.matricule}
                    onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white uppercase focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Téléphone Mobile *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+237 6XX XX XX XX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Prénom *</label>
                  <input
                    type="text"
                    required
                    placeholder="Prénom"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Nom *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nom"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Département *</label>
                  <input
                    type="text"
                    required
                    placeholder="Logistique, Vente, RH..."
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Poste occupé *</label>
                  <input
                    type="text"
                    required
                    placeholder="Chauffeur, Assistant..."
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Heure Arrivée</label>
                  <input
                    type="time"
                    value={formData.scheduledStart}
                    onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Heure Départ</label>
                  <input
                    type="time"
                    value={formData.scheduledEnd}
                    onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Date Embauche</label>
                  <input
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Adresse E-mail (facultatif)</label>
                <input
                  type="email"
                  placeholder="nom@entreprise.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                >
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer le collaborateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileUp className="w-4 h-4 text-emerald-400" />
                Importation Groupée CSV
              </h2>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Collez vos données au format CSV (séparateur virgule). Format des colonnes :<br />
              <code className="text-emerald-400 text-[11px]">matricule,prenom,nom,telephone,departement,poste,heure_debut,heure_fin</code>
            </p>

            <form onSubmit={handleCsvImport} className="space-y-3">
              <textarea
                rows={6}
                required
                placeholder={`matricule,prenom,nom,telephone,departement,poste,heure_debut,heure_fin
TLC-010,Paul,Kamto,+237691223344,Atelier,Technicien,08:00,17:00
TLC-011,Nathalie,Biloa,+237677889900,Accueil,Hôtesse,08:00,17:00`}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-white font-mono placeholder-slate-600 focus:border-emerald-500"
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                >
                  {isSubmitting ? 'Importation...' : 'Lancer l’importation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
