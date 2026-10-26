/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Organization, Subscription } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  subscription: Subscription | null;
  remainingTrialSeconds: number;
  isTrialExpired: boolean;
  canPerformWriteActions: boolean;
  isLoading: boolean;
  demoAccounts: any[];
  login: (email: string, password?: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => void;
  switchDemoAccount: (userId: string) => Promise<void>;
  refreshMe: () => Promise<void>;
  formatTrialCountdown: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_USER_KEY = 'pointafrik_auth_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [remainingTrialSeconds, setRemainingTrialSeconds] = useState<number>(0);
  const [isTrialExpired, setIsTrialExpired] = useState<boolean>(false);
  const [canPerformWriteActions, setCanPerformWriteActions] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [demoAccounts, setDemoAccounts] = useState<any[]>([]);

  // Load initial demo accounts and saved user
  useEffect(() => {
    async function initAuth() {
      try {
        const demoRes = await api.getDemoAccounts();
        setDemoAccounts(demoRes.accounts || []);

        const savedUserJson = localStorage.getItem(AUTH_USER_KEY);
        if (savedUserJson) {
          const savedUser = JSON.parse(savedUserJson);
          api.setAuth(savedUser.id, savedUser.role, savedUser.fullName, savedUser.organizationId);
          const me = await api.getMe();
          setUser(me.user);
          setOrganization(me.organization || null);
          setSubscription(me.subscription || null);
          setRemainingTrialSeconds(me.remainingTrialSeconds || 0);
          setIsTrialExpired(Boolean(me.isTrialExpired));
          setCanPerformWriteActions(Boolean(me.canPerformWriteActions));
        } else {
          // Default to the first client demo account (Marc Siewe - TransLog Cameroun, on Trial)
          const defaultClient = demoRes.accounts.find((a: any) => a.email === 'marcsiewe326@gmail.com');
          if (defaultClient) {
            await switchDemoAccount(defaultClient.id);
          }
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    initAuth();
  }, []);

  // 1-second interval ticker for server-authoritative 72h countdown
  useEffect(() => {
    if (remainingTrialSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingTrialSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsTrialExpired(true);
          setCanPerformWriteActions(false);
          refreshMe();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingTrialSeconds]);

  const refreshMe = async () => {
    try {
      const me = await api.getMe();
      setUser(me.user);
      setOrganization(me.organization || null);
      setSubscription(me.subscription || null);
      setRemainingTrialSeconds(me.remainingTrialSeconds || 0);
      setIsTrialExpired(Boolean(me.isTrialExpired));
      setCanPerformWriteActions(Boolean(me.canPerformWriteActions));
    } catch (e) {
      console.error('Error refreshing me:', e);
    }
  };

  const login = async (email: string, password: string = 'Password2026!') => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password });
      setUser(res.user);
      setOrganization(res.organization || null);
      setSubscription(res.subscription || null);
      setRemainingTrialSeconds(res.remainingTrialSeconds || 0);
      setIsTrialExpired(Boolean(res.isTrialExpired));
      setCanPerformWriteActions(res.subscription?.status === 'active' || !res.isTrialExpired);

      api.setAuth(res.user.id, res.user.role, res.user.fullName, res.user.organizationId);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(res.user));
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: any) => {
    setIsLoading(true);
    try {
      const res = await api.register(payload);
      setUser(res.user);
      setOrganization(res.organization);
      setSubscription(res.subscription);
      setRemainingTrialSeconds(res.remainingTrialSeconds);
      setIsTrialExpired(false);
      setCanPerformWriteActions(true);

      api.setAuth(res.user.id, res.user.role, res.user.fullName, res.user.organizationId);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(res.user));

      // Refresh demo accounts list
      const demoRes = await api.getDemoAccounts();
      setDemoAccounts(demoRes.accounts || []);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setOrganization(null);
    setSubscription(null);
    setRemainingTrialSeconds(0);
    setIsTrialExpired(false);
    setCanPerformWriteActions(false);
    api.clearAuth();
    localStorage.removeItem(AUTH_USER_KEY);
  };

  const switchDemoAccount = async (targetUserId: string) => {
    setIsLoading(true);
    try {
      const account = demoAccounts.find((a) => a.id === targetUserId);
      if (!account) return;

      api.setAuth(account.id, account.role, account.fullName, account.organizationId);
      const me = await api.getMe();
      setUser(me.user);
      setOrganization(me.organization || null);
      setSubscription(me.subscription || null);
      setRemainingTrialSeconds(me.remainingTrialSeconds || 0);
      setIsTrialExpired(Boolean(me.isTrialExpired));
      setCanPerformWriteActions(Boolean(me.canPerformWriteActions));

      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(me.user));
    } catch (e) {
      console.error('Error switching demo account:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTrialCountdown = (): string => {
    if (isTrialExpired) return '00h 00m 00s (Expiré)';
    if (remainingTrialSeconds <= 0) return '00h 00m 00s';

    const h = Math.floor(remainingTrialSeconds / 3600);
    const m = Math.floor((remainingTrialSeconds % 3600) / 60);
    const s = remainingTrialSeconds % 60;

    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        subscription,
        remainingTrialSeconds,
        isTrialExpired,
        canPerformWriteActions,
        isLoading,
        demoAccounts,
        login,
        register,
        logout,
        switchDemoAccount,
        refreshMe,
        formatTrialCountdown,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
