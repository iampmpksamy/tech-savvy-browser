# Tech Savvy Browser

An AI-native, developer-first web browser. Vertical tabs, multi-profile sessions,
built-in terminal, API tester, JSON viewer, network inspector, ad & tracker
blocking, secure DNS, and a pluggable AI assistant backed by OpenAI, Anthropic
Claude, or local Ollama models.

Built on **Electron 31 (Chromium 126) + React 18 + TypeScript + Vite + Tailwind**.
See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full design doc.

---

## Requirements

- Node.js **>= 20**
- npm **>= 10** (or pnpm/yarn — scripts use npm)
- Build tools for `node-pty`:
  - **Windows**: `npm install --global windows-build-tools` or VS 2022 + Python
  - **macOS**: Xcode Command Line Tools
  - **Linux**: `build-essential` + `python3`

---

## Setup

```bash
git clone <your-fork> tech-savvy-browser
cd tech-savvy-browser
npm install
```

## Development

```bash
npm run dev
```

What this does:

1. Starts **Vite** on `http://localhost:5179` for the renderer (the "chrome UI").
2. Compiles `electron/` + `src/shared/` with `tsc` → `dist-electron/`.
3. Launches **Electron** pointed at the dev URL, with DevTools detached.
4. Watches `electron/**/*.ts`; on change, rebuilds and relaunches the app.

Renderer hot-reload is instant (Vite HMR). Main-process changes trigger a full
relaunch automatically.

## Type-check / lint / format

```bash
npm run typecheck   # tsc --noEmit for renderer + main
npm run lint
npm run format
```

## Packaging

```bash
# single-OS build:
npm run package:win
npm run package:linux
npm run package:mac

# all three (only works on macOS host for Mac notarization):
npm run package:all
```

Outputs land in `release/`. Artefacts:

- Windows: `Tech Savvy Browser-<v>-x64.exe` (NSIS installer)
- Linux: `Tech Savvy Browser-<v>-x64.AppImage` + `.deb`
- macOS: `Tech Savvy Browser-<v>-arm64.dmg` + `.zip`

### Auto-update

`electron-updater` is wired to publish against GitHub Releases (see
`electron-builder.yml` → `publish`). Cut a GitHub release; users on older
versions will download & install on next launch.

---

## Configuring AI

1. Launch the app.
2. Open the **AI Assistant** sidebar.
3. Settings → Providers → paste keys for OpenAI / Anthropic, or point Ollama at
   your local daemon (defaults to `http://127.0.0.1:11434`).

Keys are encrypted via `safeStorage` (OS keychain) and stored in
`electron-store`. They **never** reach the renderer.

To use a local Ollama model:

```bash
ollama serve                # in its own terminal
ollama pull llama3.1
```

Select **Ollama** as the active provider in the app.

---

## Folder structure

```
electron/
  main/               Electron main process (entry, window, tabs, profiles, IPC…)
  preload/            contextBridge surface → window.ts
  services/ai/        OpenAI + Anthropic + Ollama + router
src/
  renderer/           React app (UI shell, stores, panels)
  shared/             Types + IPC channel names (imported by both sides)
scripts/              dev.mjs, build.mjs
build/                electron-builder extras (entitlements)
resources/icons/      Platform icons (see resources/icons/README.md)
```

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| ⌘/Ctrl + T | New tab |
| ⌘/Ctrl + W | Close active tab |
| ⌘/Ctrl + L | Focus URL bar |
| ⌘/Ctrl + R | Reload |
| ⌘/Ctrl + K | Command palette *(roadmap)* |
| ⌘/Ctrl + J | Toggle bottom panel *(roadmap)* |
| ⌘/Ctrl + \ | Toggle AI sidebar *(roadmap)* |

*(Shortcuts are stubbed in v0.1 — listed here so they're obvious when we wire them.)*

---

## Security posture

- Renderer: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- All web content runs in isolated `WebContentsView` instances with per-profile
  session partitions.
- API keys live only in the main process, encrypted via `safeStorage`.
- Ad + tracker blocking powered by `@ghostery/adblocker-electron` (EasyList +
  EasyPrivacy).
- Secure DNS via Chromium DoH switches (Cloudflare / Quad9 / Google).
- Strict CSP on the chrome UI.

---

## Roadmap

See [`ARCHITECTURE.md`](./ARCHITECTURE.md#6-roadmap-after-v01) for the long list.
Near-term:

1. Command palette (⌘K) with AI-enhanced suggestions.
2. Bookmark persistence + folder tree (electron-store).
3. Tab groups + Arc-style Spaces.
4. MV3 extension subset (start with uBlock Origin Lite, Dark Reader).
5. Cloud sync (E2E-encrypted) for bookmarks + sessions.
6. Plugin ecosystem: signed manifests, sidebar panel + IPC namespace registration.
7. Mobile shells reusing the renderer + AI service layer.

---

## License

MIT
