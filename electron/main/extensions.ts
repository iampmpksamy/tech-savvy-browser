// ─── Extension Service ──────────────────────────────────────────────────────
// Loads unpacked Chromium extensions via session.loadExtension().
// Call loadAll() early in boot — before any WebContents are created —
// so content scripts and background pages are ready immediately.
import { session } from 'electron';
import type { Extension } from '../../src/shared/types';

export class ExtensionService {
  private loaded = new Map<string, Extension>();

  /**
   * Load a single unpacked extension from a directory path.
   * `allowFileAccess` is needed for extensions that read local files.
   */
  async load(extensionPath: string): Promise<Extension> {
    const ses = session.defaultSession;
    const ext = await ses.loadExtension(extensionPath, { allowFileAccess: true });

    const record: Extension = {
      id:          ext.id,
      name:        ext.name,
      version:     ext.version,
      description: (ext.manifest as Record<string, unknown>)['description'] as string ?? '',
      enabled:     true,
      path:        extensionPath,
    };

    this.loaded.set(ext.id, record);
    return record;
  }

  /** Remove a previously loaded extension by its Chrome extension ID. */
  async unload(id: string): Promise<void> {
    const ses = session.defaultSession;
    ses.removeExtension(id);
    this.loaded.delete(id);
  }

  list(): Extension[] {
    return [...this.loaded.values()];
  }

  /**
   * Reload all extensions that were loaded in a previous session.
   * Paths are persisted by the caller (ipc.ts / electron-store).
   */
  async loadAll(paths: string[]): Promise<void> {
    await Promise.allSettled(paths.map((p) => this.load(p)));
  }
}
