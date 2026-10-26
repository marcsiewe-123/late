/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Clock,
  ShieldCheck,
  Smartphone,
  Users,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Coffee,
  FileSpreadsheet,
  Globe,
  Lock,
} from 'lucide-react';

export const LandingPage: React.FC<{ onStartTrial: () => void }> = ({ onStartTrial }) => {
  const { register, login, demoAccounts, switchDemoAccount } = useAuth();
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Register Form State
  const [fullName, setFullName] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [country, setCountry] = useState<string>('Cameroun');
  const [password, setPassword] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState<boolean>(true);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState<string>('marcsiewe326@gmail.com');
  const [loginPassword, setLoginPassword] = useState<string>('Password2026!');

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      setAuthError('Veuillez accepter les conditions d’utilisation.');
      return;
    }

    setIsSubmitting(true);
    setAuthError(null);
    try {
      await register({
        fullName,
        companyName,
        email,
        phone,
        country,
        password,
      });
      onStartTrial();
    } catch (err: any) {
      setAuthError(err.message || 'Erreur lors de l’inscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthError(null);
    try {
      await login(loginEmail, loginPassword);
      onStartTrial();
    } catch (err: any) {
      setAuthError(err.message || 'Identifiants invalides');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-emerald-500 selection:text-black">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-base">
              PA
            </div>
            <span className="font-bold text-base tracking-tight text-white">
              PointAfrik <span className="text-emerald-400 font-normal">SaaS</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const superAcc = demoAccounts.find((a) => a.role === 'superadmin');
                if (superAcc) switchDemoAccount(superAcc.id);
              }}
              className="text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg font-medium transition-colors hidden sm:block"
            >
              Accès Super-Administrateur Démo
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('auth-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors shadow"
            >
              Essai Gratuit 72h
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-full text-xs text-emerald-400 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            Le SaaS RH n°1 conçu pour les PME d'Afrique Francophone
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Pilotez votre personnel, présences et retards en toute sérénité.
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Pointage en direct, calcul automatique des retards, gestion stricte des pauses, exports certifiés et abonnements payables directement par <strong>Orange Money, MTN MoMo et Wave</strong>.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                const el = document.getElementById('auth-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02]"
            >
              <span>Démarrer l’Essai Gratuit de 72h</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('pricing-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-medium rounded-xl text-sm transition-colors"
            >
              Consulter les tarifs en FCFA
            </button>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Pointage & Retards précis</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Arrivées et départs comparés à l’horaire standard de l’entreprise. Calcul immédiat des minutes de retard et tolérance paramétrable.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Coffee className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Chronomètre des Pauses</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Début et fin de pause avec contrôle d'intégrité : impossible de cumuler deux pauses en simultané ou d'interrompre une pause inexistante.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">SasPay Mobile Money</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Activez votre formule en quelques secondes avec Orange Money, MTN MoMo, Wave ou Moov dans toute la zone Franc CFA (XAF / XOF).
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing-section" className="py-16 bg-slate-900/30 border-y border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <h2 className="text-2xl font-bold text-white">Formules claires, sans surprise</h2>
            <p className="text-xs text-slate-400">
              Essai gratuit de 3 jours (72h complètes) sans carte bancaire, puis forfaits PME en FCFA.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Free Trial */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-blue-400 block uppercase tracking-wider">Découverte</span>
                <h3 className="text-lg font-bold text-white mt-1">Essai Gratuit</h3>
                <p className="text-xs text-slate-400 mt-1">72 heures d’accès complet</p>
                <div className="my-4">
                  <span className="text-3xl font-extrabold text-white font-mono">0</span>
                  <span className="text-xs text-slate-400 font-medium ml-1">FCFA / 3 jours</span>
                </div>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Jusqu’à 5 employés</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Pointage & Retards</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Support par Chat Aide</div>
                </div>
              </div>
              <button
                onClick={() => {
                  const el = document.getElementById('auth-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="mt-6 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
              >
                Commencer
              </button>
            </div>

            {/* Starter */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-400 block uppercase tracking-wider">Starter PME</span>
                <h3 className="text-lg font-bold text-white mt-1">Starter</h3>
                <p className="text-xs text-slate-400 mt-1">Pour petites équipes</p>
                <div className="my-4">
                  <span className="text-3xl font-extrabold text-white font-mono">5 000</span>
                  <span className="text-xs text-slate-400 font-medium ml-1">FCFA / mois</span>
                </div>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Jusqu’à 15 employés</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Présences & Pauses</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Export CSV journalier</div>
                </div>
              </div>
              <button
                onClick={() => {
                  const el = document.getElementById('auth-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="mt-6 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
              >
                Choisir Starter
              </button>
            </div>

            {/* Business */}
            <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl p-6 flex flex-col justify-between relative shadow-lg shadow-emerald-500/5">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-[10px] font-bold px-3 py-0.5 rounded-full uppercase">
                Populaire
              </span>
              <div>
                <span className="text-xs font-bold text-emerald-400 block uppercase tracking-wider">Entreprise Pro</span>
                <h3 className="text-lg font-bold text-white mt-1">Business Pro</h3>
                <p className="text-xs text-slate-400 mt-1">Pour entreprises établies</p>
                <div className="my-4">
                  <span className="text-3xl font-extrabold text-white font-mono">10 000</span>
                  <span className="text-xs text-slate-400 font-medium ml-1">FCFA / mois</span>
                </div>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Jusqu’à 50 employés</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Rapports PDF certifiés</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Support prioritaire</div>
                </div>
              </div>
              <button
                onClick={() => {
                  const el = document.getElementById('auth-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="mt-6 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
              >
                Choisir Business
              </button>
            </div>

            {/* Premium */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-purple-400 block uppercase tracking-wider">Illimité</span>
                <h3 className="text-lg font-bold text-white mt-1">Premium</h3>
                <p className="text-xs text-slate-400 mt-1">Grandes structures & BTP</p>
                <div className="my-4">
                  <span className="text-3xl font-extrabold text-white font-mono">25 000</span>
                  <span className="text-xs text-slate-400 font-medium ml-1">FCFA / mois</span>
                </div>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Employés illimités</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Multi-départements & Shifts</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Gestionnaire dédié</div>
                </div>
              </div>
              <button
                onClick={() => {
                  const el = document.getElementById('auth-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="mt-6 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
              >
                Choisir Premium
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Registration & Login Section */}
      <section id="auth-section" className="py-16 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex justify-center border-b border-slate-800 pb-4">
            <div className="inline-flex p-1 bg-slate-800 rounded-lg text-xs">
              <button
                onClick={() => {
                  setAuthMode('register');
                  setAuthError(null);
                }}
                className={`px-4 py-1.5 rounded-md font-semibold transition-colors ${
                  authMode === 'register' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Créer une Entreprise (Essai 72h)
              </button>
              <button
                onClick={() => {
                  setAuthMode('login');
                  setAuthError(null);
                }}
                className={`px-4 py-1.5 rounded-md font-semibold transition-colors ${
                  authMode === 'login' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Connexion
              </button>
            </div>
          </div>

          {authError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-lg">
              {authError}
            </div>
          )}

          {authMode === 'register' ? (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Nom du responsable *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Marc Siewe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Nom de l’entreprise *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: TransLog Cameroun SARL"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Adresse E-mail professionnelle *</label>
                  <input
                    type="email"
                    required
                    placeholder="direction@entreprise.cm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Téléphone avec indicatif *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+237 671 23 45 67"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Pays d’implantation *</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                  >
                    <option value="Cameroun">Cameroun (XAF)</option>
                    <option value="Côte d’Ivoire">Côte d’Ivoire (XOF)</option>
                    <option value="Sénégal">Sénégal (XOF)</option>
                    <option value="Bénin">Bénin (XOF)</option>
                    <option value="Togo">Togo (XOF)</option>
                    <option value="Gabon">Gabon (XAF)</option>
                    <option value="Congo">Congo (XAF)</option>
                    <option value="RDC">RDC (USD / CDF)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Mot de passe *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="terms" className="text-[11px] text-slate-400 leading-normal">
                  J’accepte les Conditions d’Utilisation et la Politique de Confidentialité de PointAfrik SaaS.
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md mt-2 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  'Initialisation de votre espace...'
                ) : (
                  <>
                    <span>Démarrer l’Essai Gratuit de 72 Heures</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Mot de passe</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors mt-2"
              >
                {isSubmitting ? 'Connexion...' : 'Se connecter'}
              </button>

              <div className="pt-4 border-t border-slate-800 text-center">
                <p className="text-[11px] text-slate-400 mb-2">Comptes de démonstration pré-configurés :</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {demoAccounts.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        switchDemoAccount(a.id);
                        onStartTrial();
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] border border-slate-700"
                    >
                      {a.fullName} ({a.role === 'superadmin' ? 'Super-Admin' : a.country})
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 text-center text-xs text-slate-500">
        <p>© 2026 PointAfrik SaaS · Tous droits réservés · Développé pour les entreprises d’Afrique Francophone</p>
      </footer>
    </div>
  );
};
