// ─── TabPersistence ──────────────────────────────────────────────────────────
// Serialises and restores the tab session across app restarts.
// Intentionally thin: owns the store schema and nothing else.
import Store from 'electron-store';
import type { TabId, GroupId } from '@shared/types';

export interface PersistedTab {
  id: TabId;
  url: string;
  title: string;
  pinned: boolean;
  groupId: GroupId | null;
}

export interface PersistedSession {
  tabs: PersistedTab[];
  activeId: TabId | null;
}

interface Schema {
  session: PersistedSession | null;
}

export class TabPersistence {
  private store = new Store<Schema>({ name: 'tabs', defaults: { session: null } });

  save(session: PersistedSession): void {
    this.store.set('session', session);
  }

  load(): PersistedSession | null {
    return this.store.get('session') ?? null;
  }
}
