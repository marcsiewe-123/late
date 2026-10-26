/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Clock,
  Coffee,
  FileSpreadsheet,
  CreditCard,
  Settings,
  LifeBuoy,
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  History,
  Building,
} from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';

  const clientNavItems = [
    { id: 'dashboard', label: 'Vue d’ensemble', icon: LayoutDashboard },
    { id: 'employees', label: 'Employés', icon: Users },
    { id: 'attendance', label: 'Présences & Retards', icon: Clock },
    { id: 'breaks', label: 'Pauses', icon: Coffee },
    { id: 'reports', label: 'Rapports & Exports', icon: FileSpreadsheet },
    { id: 'subscription', label: 'Abonnement & SasPay', icon: CreditCard },
    { id: 'support', label: 'Chat Aide & Support', icon: LifeBuoy },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ];

  const adminNavItems = [
    { id: 'admin_overview', label: 'Vue d’ensemble', icon: LayoutDashboard },
    { id: 'admin_finances', label: 'Finances & SasPay', icon: BarChart3 },
    { id: 'admin_clients', label: 'Clients SaaS', icon: Building },
    { id: 'admin_support', label: 'Support Clients (Boîte 3-volets)', icon: LifeBuoy },
    { id: 'admin_incidents', label: 'Incidents & Surveillance', icon: AlertTriangle },
    { id: 'admin_audit', label: 'Journaux d’audit', icon: History },
  ];

  const navItems = isSuperAdmin ? adminNavItems : clientNavItems;

  return (
    <nav className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-sm sticky top-16 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-1 overflow-x-auto py-2 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
