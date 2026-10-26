/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { api } from './api';

export interface OfflineAttendanceItem {
  localId: string;
  type: 'check_in' | 'check_out';
  employeeId: string;
  employeeName: string;
  timestamp: number;
  notes?: string;
  createdAt: string;
}

const STORAGE_KEY = 'pointafrik_offline_queue';

export class OfflineQueueManager {
  private queue: OfflineAttendanceItem[] = [];
  private listeners: Array<(queue: OfflineAttendanceItem[]) => void> = [];

  constructor() {
    this.load();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.attemptSync();
      });
    }
  }

  private load() {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.queue = JSON.parse(raw);
      }
    } catch (e) {
      this.queue = [];
    }
  }

  private save() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
      this.notify();
    } catch (e) {
      console.error('Failed to save offline queue', e);
    }
  }

  public subscribe(cb: (queue: OfflineAttendanceItem[]) => void) {
    this.listeners.push(cb);
    cb(this.queue);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    for (const cb of this.listeners) {
      cb(this.queue);
    }
  }

  public enqueue(item: Omit<OfflineAttendanceItem, 'localId' | 'createdAt'>): OfflineAttendanceItem {
    const fullItem: OfflineAttendanceItem = {
      ...item,
      localId: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    this.queue.push(fullItem);
    this.save();
    return fullItem;
  }

  public getQueue(): OfflineAttendanceItem[] {
    return [...this.queue];
  }

  public async attemptSync(): Promise<{ success: boolean; syncedCount: number; errors?: any[] }> {
    if (this.queue.length === 0) return { success: true, syncedCount: 0 };
    if (!navigator.onLine) return { success: false, syncedCount: 0 };

    try {
      const payload = [...this.queue];
      const res = await api.syncOfflineAttendance(payload);
      if (res.success) {
        // Clear synced items
        this.queue = [];
        this.save();
        return { success: true, syncedCount: res.syncedCount, errors: res.conflicts };
      }
      return { success: false, syncedCount: 0 };
    } catch (err: any) {
      console.error('Error syncing offline queue:', err);
      return { success: false, syncedCount: 0, errors: [err.message] };
    }
  }
}

export const offlineQueue = new OfflineQueueManager();
