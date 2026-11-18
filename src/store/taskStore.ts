// Store des tâches de suppression — queue SQLite
// Expose les tâches actives pour le Dashboard

import { create } from 'zustand';
import { Platform } from '../types';

// Import lazy de SQLite — crash si Expo Go (pas de native module)
function getDb() {
  try {
    const { db } = require('../db/schema');
    return db;
  } catch {
    return null;
  }
}

// Type d'une tâche active pour l'UI
export type ActiveTask = {
  id: number;
  platform: string;
  accountId: string;
  processed: number;    // Suppressions faites
  total: number;        // Total à supprimer
  status: 'pending' | 'in_progress' | 'done' | 'failed';
};

interface TaskState {
  activeTasks: ActiveTask[];
  enqueue: (
    platform: Platform,
    accountId: string,
    contentId: string,
    contentType: string
  ) => void;
  getStats: (
    platform: Platform
  ) => { total: number; done: number; pending: number; failed: number };
  refreshTasks: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  activeTasks: [],

  enqueue: (platform, accountId, contentId, contentType) => {
    const db = getDb();
    if (!db) return;
    db.runSync(
      `INSERT OR IGNORE INTO deletion_queue
       (platform, account_id, content_id, content_type)
       VALUES (?, ?, ?, ?)`,
      [platform, accountId, contentId, contentType]
    );
    get().refreshTasks();
  },

  getStats: (platform) => {
    const db = getDb();
    if (!db) return { total: 0, done: 0, pending: 0, failed: 0 };
    const rows = (db.getAllSync as (sql: string, params?: unknown[]) => { status: string; count: number }[])(
      `SELECT status, COUNT(*) as count
       FROM deletion_queue WHERE platform = ? GROUP BY status`,
      [platform]
    );
    const stats = { total: 0, done: 0, pending: 0, failed: 0 };
    for (const row of rows) {
      if (row.status in stats) {
        stats[row.status as keyof typeof stats] = row.count;
      }
      stats.total += row.count;
    }
    return stats;
  },

  refreshTasks: () => {
    const db = getDb();
    if (!db) return;
    // Lire les tâches actives depuis SQLite
    const rows = (db.getAllSync as (sql: string) => Array<{
      platform: string; account_id: string; status: string; pending: number; done: number;
    }>)(
      `SELECT
         platform, account_id, status,
         SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
         COUNT(*) as pending
       FROM deletion_queue
       WHERE status IN ('pending', 'in_progress')
       GROUP BY platform, account_id`
    );

    const activeTasks: ActiveTask[] = rows.map((row, i: number) => ({
      id: i,
      platform: row.platform,
      accountId: row.account_id,
      processed: row.done ?? 0,
      total: (row.pending ?? 0) + (row.done ?? 0),
      status: row.status as ActiveTask['status'],
    }));

    set({ activeTasks });
  },
}));
