
import { Student, Presence, Offering, FeedItem, FileEntry, Registration } from './types';

const STORAGE_KEY = 'mci_kids_db_v1';

export interface DatabaseSchema {
  students: Student[];
  presences: Presence[];
  offerings: Offering[];
  feed: FeedItem[];
  files: FileEntry[];
  registrations: Registration[];
  settings: {
    accumulatedBalance: number;
    lastMonthClosure: string | null;
    presenceClosedAt: string | null;
    allowEditsAfterClosure: boolean;
  };
}

class MCIDatabase {
  private async delay(ms: number = 300) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async save(data: DatabaseSchema): Promise<void> {
    await this.delay(100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  async load(): Promise<DatabaseSchema | null> {
    await this.delay(500);
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  }

  async clear(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
  }

  exportToJSON(data: DatabaseSchema) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mci_kids_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const db = new MCIDatabase();
