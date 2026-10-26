/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { DashboardView } from './components/Dashboard/DashboardView';
import { EmployeesView } from './components/Employees/EmployeesView';
import { AttendanceView } from './components/Attendance/AttendanceView';
import { BreaksView } from './components/Breaks/BreaksView';
import { ReportsView } from './components/Reports/ReportsView';
import { SubscriptionView } from './components/Subscription/SubscriptionView';
import { SettingsView } from './components/Settings/SettingsView';
import { SupportView } from './components/Support/SupportView';
import { AdminView } from './components/Admin/AdminView';
import { LandingPage } from './components/Landing/LandingPage';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          <span className="text-xs text-slate-400 font-mono">Chargement de PointAfrik SaaS...</span>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show landing page with registration/login
  if (!user) {
    return <LandingPage onStartTrial={() => setActiveTab('dashboard')} />;
  }

  const isSuperAdminTab = activeTab.startsWith('admin_');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenUpgradeModal={() => setActiveTab('subscription')}
        onOpenHelpChat={() => setActiveTab('support')}
      />

      {/* Main Tab Navigation */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Client Views */}
        {activeTab === 'dashboard' && (
          <DashboardView onOpenUpgrade={() => setActiveTab('subscription')} />
        )}
        {activeTab === 'employees' && (
          <EmployeesView onOpenUpgrade={() => setActiveTab('subscription')} />
        )}
        {activeTab === 'attendance' && <AttendanceView />}
        {activeTab === 'breaks' && <BreaksView />}
        {activeTab === 'reports' && <ReportsView />}
        {activeTab === 'subscription' && <SubscriptionView />}
        {activeTab === 'settings' && <SettingsView />}
        {activeTab === 'support' && <SupportView />}

        {/* Super-Admin Views */}
        {isSuperAdminTab && (
          <AdminView activeTab={activeTab} setActiveTab={setActiveTab} />
        )}
      </main>

      {/* Global Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500 print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>PointAfrik SaaS · Conçu pour les entreprises d’Afrique Francophone</span>
          <span className="text-[11px] text-slate-600 font-mono">
            Passerelle SasPay · 72h Trial Server Engine · Support 24/7
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
