// ─── ProfileManager ────────────────────────────────────────────────────────
// Each profile has its own persistent session partition → isolated cookies,
// storage, extensions, history.
import { session, Session } from 'electron';
import Store from 'electron-store';
import { randomBytes } from 'crypto';
import type { Profile, ProfileId } from '../../src/shared/types';

interface ProfileStore {
  profiles: Profile[];
  activeId: ProfileId | null;
}

export class ProfileManager {
  private store = new Store<ProfileStore>({
    name: 'profiles',
    defaults: { profiles: [], activeId: null },
  });

  async init() {
    if (this.store.get('profiles').length === 0) {
      const defaultProfile: Profile = {
        id: randomBytes(8).toString('base64url').slice(0, 8),
        name: 'Default',
        avatarColor: '#6d8cff',
        partition: `persist:default-${randomBytes(6).toString('base64url').slice(0, 6)}`,
        createdAt: Date.now(),
      };
      this.store.set('profiles', [defaultProfile]);
      this.store.set('activeId', defaultProfile.id);
    }
  }

  list(): Profile[] {
    return this.store.get('profiles');
  }

  active(): Profile {
    const id = this.store.get('activeId');
    const p = this.list().find((x) => x.id === id);
    if (!p) throw new Error('No active profile');
    return p;
  }

  activeSession(): Session {
    return session.fromPartition(this.active().partition);
  }

  sessionFor(profileId: ProfileId): Session {
    const p = this.list().find((x) => x.id === profileId);
    if (!p) throw new Error(`Unknown profile ${profileId}`);
    return session.fromPartition(p.partition);
  }

  create(name: string, avatarColor = '#6d8cff'): Profile {
    const p: Profile = {
      id: randomBytes(8).toString('base64url').slice(0, 8),
      name,
      avatarColor,
      partition: `persist:${randomBytes(10).toString('base64url').slice(0, 10)}`,
      createdAt: Date.now(),
    };
    this.store.set('profiles', [...this.list(), p]);
    return p;
  }

  activate(id: ProfileId) {
    if (!this.list().some((p) => p.id === id)) throw new Error(`Unknown profile ${id}`);
    this.store.set('activeId', id);
  }

  remove(id: ProfileId) {
    const remaining = this.list().filter((p) => p.id !== id);
    if (remaining.length === 0) throw new Error('Cannot delete the last profile');
    this.store.set('profiles', remaining);
    if (this.store.get('activeId') === id) this.store.set('activeId', remaining[0].id);
  }
}
