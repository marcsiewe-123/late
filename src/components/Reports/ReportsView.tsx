/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Filter,
  Users,
  Clock,
  TrendingDown,
  CheckCircle,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { organization } = useAuth();
  const [period, setPeriod] = useState<string>('month');
  const [department, setDepartment] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [reportData, setReportData] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [res, empRes] = await Promise.all([
        api.getReports({
          period,
          ...(department !== 'all' ? { department } : {}),
        }),
        api.getEmployees(),
      ]);
      setReportData(res);
      setEmployees(empRes.employees || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [period, department]);

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));
  const attendances = reportData?.attendances || [];

  const handleExportCsv = () => {
    const headers = ['Date', 'Matricule', 'Employé', 'Département', 'Heure Arrivée', 'Heure Départ', 'Statut Retard', 'Minutes Retard', 'Source'];
    const rows = attendances.map((a: any) => [
      a.date,
      a.matricule || '',
      a.employeeName,
      a.department || '',
      a.checkInTime || '',
      a.checkOutTime || '',
      a.status === 'late' ? 'En Retard' : 'À l’heure',
      a.lateMinutes || 0,
      a.source || 'normal',
    ]);

    const csv = [headers.join(','), ...rows.map((r: any) => r.map((c: any) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `Rapport_Presences_${organization?.name || 'PointAfrik'}_${period}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header with Print & CSV buttons */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-base font-semibold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Rapports & Synthèses RH
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Génération de feuilles de présence officielles, analyse des retards et exports certifiés.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Télécharger CSV
          </button>
          <button
            onClick={handlePrintPdf}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimer / Exporter PDF
          </button>
        </div>
      </div>

      {/* Filters (Hidden in print) */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3 print:hidden">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Calendar className="w-3.5 h-3.5" />
          <span>Période :</span>
        </div>
        <div className="flex gap-1">
          {[
            { id: 'today', label: 'Aujourd’hui' },
            { id: 'week', label: '7 derniers jours' },
            { id: 'month', label: 'Ce mois-ci' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                period === p.id
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <span className="text-slate-700">|</span>

        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Filter className="w-3.5 h-3.5" />
          <span>Département :</span>
        </div>
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:border-emerald-500"
        >
          <option value="all">Tous les services</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Official Formatted Document Wrapper (Supports Print and Screen) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 print:bg-white print:text-black print:border-none print:p-0 space-y-6">
        {/* Printable Formal Header */}
        <div className="border-b border-slate-800 print:border-slate-300 pb-5">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-white print:text-black tracking-tight">
                {organization?.name || 'Entreprise'}
              </h2>
              <p className="text-xs text-slate-400 print:text-slate-600 mt-0.5">
                {organization?.legalNumber ? `N° RCCM / Immatriculation : ${organization.legalNumber} · ` : ''}
                {organization?.address || organization?.country}
              </p>
              <p className="text-xs text-slate-400 print:text-slate-600 font-mono">
                Téléphone : {organization?.phone || '+237 / +225'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-800 print:bg-slate-100 text-slate-300 print:text-slate-800 border border-slate-700 print:border-slate-200">
                RAPPORT OFFICIEL DE PRÉSENCES
              </span>
              <p className="text-[11px] text-slate-400 print:text-slate-500 mt-1 font-mono">
                Édité le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-[11px] text-emerald-400 print:text-emerald-700 font-medium">
                Période : {period === 'today' ? 'Journalière' : period === 'week' ? 'Hebdomadaire' : 'Mensuelle'}
              </p>
            </div>
          </div>

          {/* Metric Summary Bar */}
          <div className="grid grid-cols-4 gap-4 mt-6 bg-slate-800/40 print:bg-slate-50 p-3 rounded-lg border border-slate-800 print:border-slate-200 text-xs">
            <div>
              <p className="text-slate-400 print:text-slate-500">Lignes de présence</p>
              <p className="text-base font-bold text-white print:text-black">{reportData?.totalRecords || 0}</p>
            </div>
            <div>
              <p className="text-slate-400 print:text-slate-500">Retards enregistrés</p>
              <p className="text-base font-bold text-amber-400 print:text-amber-700">{reportData?.lateRecordsCount || 0}</p>
            </div>
            <div>
              <p className="text-slate-400 print:text-slate-500">Minutes de retard cumulées</p>
              <p className="text-base font-bold text-rose-400 print:text-rose-700">{reportData?.totalLateMinutes || 0} min</p>
            </div>
            <div>
              <p className="text-slate-400 print:text-slate-500">Temps total de pause</p>
              <p className="text-base font-bold text-blue-400 print:text-blue-700">{reportData?.totalBreakMinutes || 0} min</p>
            </div>
          </div>
        </div>

        {/* Attendance Records Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 print:border-slate-300 text-slate-400 print:text-slate-700 bg-slate-800/20 print:bg-slate-100">
                <th className="py-2.5 px-3 font-semibold">Date</th>
                <th className="py-2.5 px-3 font-semibold">Matricule</th>
                <th className="py-2.5 px-3 font-semibold">Collaborateur</th>
                <th className="py-2.5 px-3 font-semibold">Département</th>
                <th className="py-2.5 px-3 font-semibold">Arrivée</th>
                <th className="py-2.5 px-3 font-semibold">Départ</th>
                <th className="py-2.5 px-3 font-semibold">Statut</th>
                <th className="py-2.5 px-3 font-semibold">Retard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
              {attendances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Aucune donnée de présence trouvée pour cette période.
                  </td>
                </tr>
              ) : (
                attendances.map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-800/20 print:hover:bg-transparent">
                    <td className="py-2 px-3 font-mono text-slate-400 print:text-slate-600">{a.date}</td>
                    <td className="py-2 px-3 font-mono font-medium text-emerald-400 print:text-emerald-800">{a.matricule || '—'}</td>
                    <td className="py-2 px-3 font-medium text-white print:text-black">{a.employeeName}</td>
                    <td className="py-2 px-3 text-slate-300 print:text-slate-700">{a.department || 'Général'}</td>
                    <td className="py-2 px-3 font-mono text-white print:text-black">{a.checkInTime || '—'}</td>
                    <td className="py-2 px-3 font-mono text-slate-400 print:text-slate-600">{a.checkOutTime || '—'}</td>
                    <td className="py-2 px-3">
                      {a.status === 'late' ? (
                        <span className="text-amber-400 print:text-amber-800 font-medium">En retard</span>
                      ) : (
                        <span className="text-emerald-400 print:text-emerald-800 font-medium">À l’heure</span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono">
                      {a.lateMinutes > 0 ? (
                        <span className="text-rose-400 print:text-rose-800 font-semibold">+{a.lateMinutes} min</span>
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

        {/* Formal Signature Block for Work Inspection / Audits */}
        <div className="pt-8 border-t border-slate-800 print:border-slate-300 grid grid-cols-2 gap-8 text-xs">
          <div>
            <p className="font-semibold text-white print:text-black">Le Responsable des Ressources Humaines</p>
            <p className="text-[11px] text-slate-500 mt-1">« Lu et approuvé, certifié conforme au registre »</p>
            <div className="h-16 mt-2 border-b border-dashed border-slate-700 print:border-slate-400"></div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-white print:text-black">La Direction Générale</p>
            <p className="text-[11px] text-slate-500 mt-1">Cachet de l’entreprise et visa officiel</p>
            <div className="h-16 mt-2 border-b border-dashed border-slate-700 print:border-slate-400"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
