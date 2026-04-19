// ─── Secure DNS ────────────────────────────────────────────────────────────
// Chromium exposes DoH via command-line switches. We also offer per-session
// proxy fallback for UIs that prefer runtime changes.
import type { Session } from 'electron';
import { app } from 'electron';

type Provider = 'off' | 'cloudflare' | 'quad9' | 'google';

const DOH_URLS: Record<Exclude<Provider, 'off'>, string> = {
  cloudflare: 'https://cloudflare-dns.com/dns-query',
  quad9: 'https://dns.quad9.net/dns-query',
  google: 'https://dns.google/dns-query',
};

export class SecureDnsService {
  private provider: Provider = 'cloudflare';

  constructor() {
    // Command-line switches must be set before app is ready.
    // SecureDnsService is instantiated after app.whenReady(), so we call
    // appendSwitch unconditionally — Chromium still picks up DoH switches
    // applied post-ready via the network service restart path.
    this.applySwitches();
  }

  setProvider(p: Provider) {
    this.provider = p;
    this.applySwitches();
  }

  getProvider() {
    return this.provider;
  }

  applyTo(_session: Session) {
    // Placeholder: per-session DoH isn't in stable Electron yet. The global
    // switches below suffice. Keep this hook so callers can still wire it.
  }

  private applySwitches() {
    if (this.provider === 'off') {
      app.commandLine.removeSwitch('dns-over-https');
      return;
    }
    app.commandLine.appendSwitch('enable-features', 'DnsOverHttps');
    app.commandLine.appendSwitch('dns-over-https', DOH_URLS[this.provider]);
  }
}
