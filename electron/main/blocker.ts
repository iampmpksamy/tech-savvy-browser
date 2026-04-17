// ─── Ad + Tracker Blocker ──────────────────────────────────────────────────
// Uses @ghostery/adblocker-electron with prebuilt EasyList + EasyPrivacy.
import type { Session } from 'electron';
import { ElectronBlocker } from '@ghostery/adblocker-electron';
import fetch from 'cross-fetch';

export class BlockerService {
  private blocker: ElectronBlocker | null = null;
  private enabled = true;

  async init() {
    // `fromPrebuiltAdsAndTracking` downloads an up-to-date MV3 ruleset.
    // Falls back to a bundled copy if offline (handled by the lib).
    this.blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(
      fetch as unknown as typeof globalThis.fetch,
    );
  }

  applyTo(session: Session) {
    if (!this.blocker || !this.enabled) return;
    this.blocker.enableBlockingInSession(session);
  }

  removeFrom(session: Session) {
    this.blocker?.disableBlockingInSession(session);
  }

  setEnabled(v: boolean) {
    this.enabled = v;
  }

  isEnabled() {
    return this.enabled;
  }
}
