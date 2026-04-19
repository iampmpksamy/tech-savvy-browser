// ─── Ad + Tracker Blocker ──────────────────────────────────────────────────
// Uses @ghostery/adblocker-electron with prebuilt EasyList + EasyPrivacy.
//
// Compatibility: @ghostery/adblocker-electron ≥ 2.x calls
//   session.registerPreloadScript()  — added in Electron 35
//   session.unregisterPreloadScript() — added in Electron 35
// Electron 31 only has the legacy session.setPreloads() / getPreloads() API.
// patchSessionPreloadApi() bridges the two so the library works on both
// Electron generations without any downgrade or library fork.
import type { Session } from 'electron';
import { ElectronBlocker } from '@ghostery/adblocker-electron';

// Tracks id → filePath per session so unregister can remove the right entry.
const _registry = new WeakMap<object, Map<string, string>>();

function patchSessionPreloadApi(session: Session): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = session as any;

  // Electron 35+: registerPreloadScript already exists — nothing to patch.
  if (typeof s.registerPreloadScript === 'function') return;

  // Electron 31 legacy API not available at all — skip safely.
  if (typeof s.setPreloads !== 'function') return;

  if (_registry.has(session)) return; // already patched

  const reg = new Map<string, string>(); // scriptId → filePath
  _registry.set(session, reg);

  // Maps registerPreloadScript({ id, filePath }) → setPreloads([...existing, filePath])
  s.registerPreloadScript = (script: { id?: string; filePath: string }): void => {
    const id = script.id ?? script.filePath;
    reg.set(id, script.filePath);
    const current: string[] = s.getPreloads?.() ?? [];
    if (!current.includes(script.filePath)) {
      s.setPreloads([...current, script.filePath]);
    }
  };

  // Maps unregisterPreloadScript(id) → setPreloads(current without filePath)
  s.unregisterPreloadScript = (idOrScript: string | { id: string }): void => {
    const id = typeof idOrScript === 'string' ? idOrScript : idOrScript.id;
    const filePath = reg.get(id);
    reg.delete(id);
    if (filePath) {
      const current: string[] = s.getPreloads?.() ?? [];
      s.setPreloads(current.filter((p: string) => p !== filePath));
    }
  };
}

export class BlockerService {
  private blocker: ElectronBlocker | null = null;
  private enabled = true;

  async init(): Promise<void> {
    // fromPrebuiltAdsAndTracking fetches an up-to-date EasyList + EasyPrivacy ruleset.
    // Falls back to a bundled snapshot if offline (handled by the lib).
    // Node 20+ provides global fetch — no polyfill needed.
    this.blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
  }

  applyTo(session: Session): void {
    if (!this.blocker || !this.enabled) return;
    patchSessionPreloadApi(session); // no-op on Electron 35+
    try {
      this.blocker.enableBlockingInSession(session);
    } catch (err) {
      console.error('[blocker] enableBlockingInSession failed — ad blocking unavailable:', err);
    }
  }

  removeFrom(session: Session): void {
    try {
      this.blocker?.disableBlockingInSession(session);
    } catch (err) {
      console.error('[blocker] disableBlockingInSession failed:', err);
    }
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
