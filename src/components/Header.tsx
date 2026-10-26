/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { offlineQueue } from '../lib/offlineQueue';
import {
  Clock,
  ShieldAlert,
  Wifi,
  WifiOff,
  UserCheck,
  ChevronDown,
  Sparkles,
  LifeBuoy,
  LogOut,
  Building2,
  RefreshCw,
} from 'lucide-react';

interface HeaderProps {
  onOpenUpgradeModal: () => void;
  onOpenHelpChat: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenUpgradeModal,
  onOpenHelpChat,
  activeTab,
  setActiveTab,
}) => {
  const {
    user,
    organization,
    subscription,
    remainingTrialSeconds,
    isTrialExpired,
    formatTrialCountdown,
    demoAccounts,
    switchDemoAccount,
    logout,
  } = useAuth();

  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlineCount, setOfflineCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState<boolean>(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsub = offlineQueue.subscribe((q) => {
      setOfflineCount(q.length);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsub();
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await offlineQueue.attemptSync();
    } finally {
      setIsSyncing(false);
    }
  };

  const isTrial = subscription?.planCode === 'trial';
  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Identity */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab(isSuperAdmin ? 'admin_overview' : 'dashboard')}
              className="flex items-center gap-2.5 text-left focus:outline-none"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
                PA
              </div>
              <div>
                <span className="font-semibold text-base tracking-tight text-white block">
                  PointAfrik <span className="text-emerald-400 font-normal">SaaS</span>
                </span>
                <span className="text-[10px] text-slate-400 block -mt-1 font-mono">
                  {isSuperAdmin ? 'Super-Administration SaaS' : organization?.name || 'Afrique Francophone'}
                </span>
              </div>
            </button>

            {/* Role indicator */}
            {isSuperAdmin && (
              <span className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                Super-Admin SaaS
              </span>
            )}
          </div>

          {/* Center: 72h Trial Countdown / Status Widget */}
          {!isSuperAdmin && (
            <div className="hidden md:flex items-center gap-3">
              {isTrial && !isTrialExpired && (
                <div className="flex items-center gap-2.5 bg-slate-800/80 border border-slate-700/80 px-3.5 py-1.5 rounded-lg text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    <span className="font-medium text-slate-300">Essai 72h :</span>
                    <span className="font-mono font-bold text-white tracking-wider">
                      {formatTrialCountdown()}
                    </span>
                  </div>
                  <span className="text-slate-600">|</span>
                  <button
                    onClick={onOpenUpgradeModal}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Activer Pro
                  </button>
                </div>
              )}

              {isTrialExpired && (
                <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-lg text-xs text-rose-300">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span className="font-medium">Essai 72h expiré (Lecture seule)</span>
                  <button
                    onClick={onOpenUpgradeModal}
                    className="ml-1 bg-rose-600 hover:bg-rose-500 text-white font-medium px-2.5 py-0.5 rounded transition-colors text-[11px]"
                  >
                    Régulariser par Mobile Money
                  </button>
                </div>
              )}

              {subscription?.status === 'active' && !isTrial && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded text-xs text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="font-medium">Abonnement {subscription.planCode.toUpperCase()} Actif</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    (Échéance: {new Date(subscription.endsAt).toLocaleDateString('fr-FR')})
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Right Side Controls */}
          <div className="flex items-center gap-3">
            {/* Offline Status & Sync */}
            <div className="flex items-center gap-1.5 text-xs">
              {isOnline ? (
                <span className="hidden sm:flex items-center gap-1 text-slate-400">
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px]">Connecté</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Hors-ligne</span>
                </span>
              )}

              {offlineCount > 0 && (
                <button
                  onClick={handleManualSync}
                  disabled={!isOnline || isSyncing}
                  className="flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[11px] hover:bg-amber-500/30"
                  title="Pointages en attente de synchronisation sur le serveur"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{offlineCount} en attente</span>
                </button>
              )}
            </div>

            {/* Client Support Button */}
            {!isSuperAdmin && (
              <button
                onClick={onOpenHelpChat}
                className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                title="Ouvrir le chat Aide et Support"
              >
                <LifeBuoy className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Aide & Chat</span>
              </button>
            )}

            {/* Demo Persona Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                title="Changer de compte de test"
              >
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-medium text-xs">
                  {user?.fullName?.charAt(0) || 'U'}
                </div>
                <div className="text-left hidden lg:block">
                  <p className="font-medium text-white truncate max-w-[120px]">{user?.fullName}</p>
                  <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                    {isSuperAdmin ? 'Super-Admin' : organization?.name}
                  </p>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showAccountDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50">
                  <div className="px-3 py-2 border-b border-slate-700 text-xs">
                    <p className="font-semibold text-white">Sélecteur de Comptes Démo</p>
                    <p className="text-[11px] text-slate-400">
                      Testez instantanément les différents rôles et états du SaaS :
                    </p>
                  </div>

                  <div className="max-h-64 overflow-y-auto py-1">
                    {demoAccounts.map((acc) => {
                      const isCurrent = acc.id === user?.id;
                      return (
                        <button
                          key={acc.id}
                          onClick={() => {
                            switchDemoAccount(acc.id);
                            setShowAccountDropdown(false);
                            if (acc.role === 'superadmin') setActiveTab('admin_overview');
                            else setActiveTab('dashboard');
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-700/60 transition-colors ${
                            isCurrent ? 'bg-slate-700/40 text-emerald-400' : 'text-slate-300'
                          }`}
                        >
                          <div>
                            <p className="font-medium text-white">{acc.fullName}</p>
                            <p className="text-[11px] text-slate-400">
                              {acc.role === 'superadmin' ? '🛡️ Super-Administrateur SaaS' : `${acc.organizationName} (${acc.country})`}
                            </p>
                          </div>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              acc.subStatus === 'expired'
                                ? 'bg-rose-500/20 text-rose-300'
                                : acc.planCode === 'trial'
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {acc.subStatus === 'expired'
                              ? 'Expiré'
                              : acc.planCode === 'trial'
                              ? 'Essai 72h'
                              : 'Payé'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-slate-700 pt-1 mt-1 px-2">
                    <button
                      onClick={() => {
                        logout();
                        setShowAccountDropdown(false);
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs text-rose-400 hover:bg-slate-700/50 rounded flex items-center gap-1.5"
                    >
                      <LogOut className="w-3 h-3" />
                      Se déconnecter
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
