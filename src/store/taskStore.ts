import { create } from 'zustand';
import { DeletionTask, Platform, DeletionStatus } from '../types';
import { db } from '../db/schema';

interface TaskState {
  tasks: DeletionTask[];
  activeCount: number;
  enqueue: (platform: Platform, accountId: string, contentId: string, contentType: string) => void;
  getStats: (platform: Platform) => { total: number; done: number; pending: number; error: number };
  refreshTasks: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  activeCount: 0,

  enqueue: (platform, accountId, contentId, contentType) => {
    db.runSync(
      `INSERT OR IGNORE INTO deletion_queue 
       (platform, account_id, content_id, content_type) 
       VALUES (?, ?, ?, ?)`,
      [platform, accountId, contentId, contentType]
    );
    get().refreshTasks();
  },

  getStats: (platform) => {
    const rows = db.getAllSync<{ status: DeletionStatus; count: number }>(
      `SELECT status, COUNT(*) as count FROM deletion_queue WHERE platform = ? GROUP BY status`,
      [platform]
    );
    const stats = { total: 0, done: 0, pending: 0, error: 0 };
    for (const row of rows) {
      stats[row.status as keyof typeof stats] = row.count;
      stats.total += row.count;
    }
    return stats;
  },

  refreshTasks: () => {
    const tasks = db.getAllSync<DeletionTask>(
      `SELECT * FROM deletion_queue WHERE status IN ('pending','processing') 
       ORDER BY created_at DESC LIMIT 50`
    );
    const activeCount = db.getFirstSync<{ count: number }>(
      `SELECT COUNT(*) as count FROM deletion_queue WHERE status = 'processing'`
    )?.count ?? 0;
    set({ tasks, activeCount });
  },
}));

