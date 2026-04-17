# Tech Savvy Browser — Architecture

## 1. Final Architecture Decision

**Stack: Electron 31 (Chromium 126) + React 18 + TypeScript 5 + Vite 5 + Tailwind 3 + Zustand 4.**

### Why Electron (not Tauri / CEF / Chromium fork)

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Electron** | Mature, full Chromium, huge ecosystem, `BrowserView`/`WebContentsView` gives us native multi-tab, first-class DevTools & extension APIs (MV2/MV3 subset), `session.setProxy`, `webRequest` for ad/tracker blocking, `chrome.debugger` protocol for deep network inspection, straightforward `electron-builder` → `.exe` / `.AppImage` / `.dmg`. | Higher RAM baseline (~150 MB idle), larger installer (~90 MB). | **CHOSEN.** For a browser-class product, Chromium parity is non-negotiable. |
| Tauri 2 | Tiny binary (~5 MB), Rust backend, fast. | Uses OS webview (WebView2 on Win, WebKit on mac, WebKitGTK on Linux) → **three different engines** to test against, no multi-tab primitive, no Chromium extensions, weak dev tooling inside embedded pages. | Rejected — a "browser" with three engines is a support nightmare. |
| Raw CEF (C++) | Full control, smallest possible overhead. | 6–12 months of plumbing before first usable tab; no TS/React ecosystem; tiny talent pool. | Rejected — kills velocity. |
| Chromium fork | Ultimate power (Brave/Arc/Vivaldi route). | 20+ GB source tree, 1-hour+ builds, dedicated release engineering, M&M of upstream merges. | Rejected for v1. Revisit at ~100 k MAU. |

### Supporting choices

- **React + TypeScript** — familiar, great DX, matches VS Code / Arc / DevTools conventions.
- **Vite** — sub-second HMR for the chrome (shell) UI.
- **Tailwind + shadcn-style primitives** — fast iteration on a dark-first, dense, developer-minded UI.
- **Zustand** — lightweight, tree-shakeable, plays well with IPC-driven state; Redux would be overkill.
- **`@ghostery/adblocker-electron`** — production-grade EasyList + EasyPrivacy blocking wired via `webRequest`.
- **`node-pty` + `xterm.js`** — real PTY terminals (bash/pwsh/zsh) inside the browser.
- **`electron-builder` + `electron-updater`** — signed `.exe` (NSIS) / `.AppImage` (+ `.deb`) / `.dmg` (+ `.zip`) with Squirrel-free auto-update over GitHub Releases.
- **`electron-store`** (profiles, bookmarks, settings) — encrypted at rest via OS keychain for secrets.

### Process topology

```
┌──────────────── Main process (Node) ─────────────────┐
│  - App lifecycle, windowing                          │
│  - TabManager (WebContentsView per tab)              │
│  - ProfileManager (isolated session partitions)      │
│  - BlockerService (ads + trackers via webRequest)    │
│  - AIService proxy (keeps API keys off renderer)     │
│  - TerminalService (node-pty spawner)                │
│  - NetworkInspector (chrome.debugger → renderer)     │
│  - AutoUpdater                                       │
│  IPC bus ⇅                                          │
└──────────────────┬───────────────────────────────────┘
                   │ contextBridge (preload, sandboxed)
┌──────────────────┴───────────────────────────────────┐
│  Renderer: React shell (the "chrome")                │
│  - Vertical tab strip, URL bar, sidebar              │
│  - AI chat, page Q&A, summarizer                     │
│  - Dev tool panels (Terminal, API tester, JSON, Net) │
│  Mounts a <WebContentsView> per tab underneath.      │
└──────────────────────────────────────────────────────┘
```

Renderer **never** touches Node APIs directly — everything flows through a strict, typed `contextBridge` surface defined in `src/shared/ipc`.

## 2. Folder Structure

```
tech-savvy-browser/
├── electron/
│   ├── main/
│   │   ├── index.ts              # app entry
│   │   ├── window.ts             # BrowserWindow factory
│   │   ├── tab-manager.ts        # WebContentsView-per-tab
│   │   ├── profile-manager.ts    # isolated sessions/partitions
│   │   ├── blocker.ts            # ad + tracker blocker
│   │   ├── secure-dns.ts         # DoH / DoT suggestions
│   │   ├── terminal-service.ts   # node-pty host
│   │   ├── network-inspector.ts  # chrome.debugger stream
│   │   ├── updater.ts            # electron-updater
│   │   └── ipc.ts                # typed IPC router
│   ├── preload/
│   │   └── index.ts              # contextBridge surface
│   └── services/
│       └── ai/
│           ├── index.ts          # provider router
│           ├── openai.ts
│           ├── anthropic.ts
│           └── ollama.ts
├── src/
│   ├── renderer/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── layout/   (TitleBar, Shell, ResizablePanels)
│   │   │   ├── tabs/     (VerticalTabStrip, TabGroup, TabItem)
│   │   │   ├── sidebar/  (AiChat, ToolLauncher, Bookmarks)
│   │   │   ├── panels/   (Terminal, ApiTester, JsonViewer, NetworkInspector)
│   │   │   └── ui/       (Button, Input, Dialog, …)
│   │   ├── store/        (tabs, profile, ai, settings, panels — Zustand)
│   │   ├── hooks/
│   │   ├── lib/          (browser bridge, formatters)
│   │   └── styles/
│   └── shared/
│       ├── types/        (Tab, Profile, AiMessage, …)
│       └── ipc/          (channel names + schemas)
├── resources/icons/      (platform icons)
├── scripts/              (dev.mjs, build.mjs)
├── build/                (electron-builder assets)
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── tailwind.config.ts
├── postcss.config.cjs
├── electron-builder.yml
├── .eslintrc.cjs
├── .gitignore
└── package.json
```

## 3. UI Layout (text wireframe)

```
┌────────────────────────────────────────────────────────────────────────┐
│ ◉ ◉ ◉   Tech Savvy   ⌘K Search or type URL…            ⊗ Profile ▾   │  ← title + command bar
├─────────┬─────────────────────────────────────────────┬────────────────┤
│  ⌂ Home │                                             │  AI Assistant  │
│  + New  │                                             │ ─────────────  │
│ ─────── │                                             │ [chat stream]  │
│ Pinned  │                                             │                │
│  • X    │         <WebContentsView for active tab>    │                │
│  • Y    │         (actual web page)                   │                │
│ ─────── │                                             │                │
│ Today   │                                             │ ┌───────────┐  │
│  • Tab1 │                                             │ │ Ask about │  │
│  • Tab2 │                                             │ │ this page │  │
│ ─────── │                                             │ └───────────┘  │
│ 🔧 Tools│                                             │                │
│  Term   │                                             │                │
│  API    │                                             │                │
│  JSON   │                                             │                │
│  Net    │                                             │                │
└─────────┴─────────────────────────────────────────────┴────────────────┘
  240 px            flexible                                 360 px
```

## 4. Security Posture

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` on every `WebContentsView`.
- API keys live only in main process, accessed via OS keychain (`safeStorage`).
- Strict CSP on the shell UI.
- `webRequest` denies by default for known tracker hosts (EasyPrivacy) before `onBeforeRequest`.
- `setPermissionRequestHandler` — camera/mic/geolocation require explicit opt-in.
- Secure DNS (DoH) configured via `session.setPreloadScripts`/`setProxy` with Cloudflare / Quad9 presets.

## 5. Performance Plan

- **Tab hibernation** — inactive tabs >10 min are `destroyed()` and recreated from URL on focus (state stored in Zustand).
- **Lazy panel mounting** — dev panels mount only on first open.
- **`BrowserViewManager` batching** — a single `setBounds` per frame (`requestAnimationFrame`).
- **Shared renderer** — the chrome UI is one process; only page WebContents get their own.
- **Preload caching** — AI provider clients reused across calls; streaming over IPC events, not polling.

## 6. Roadmap (after v0.1)

1. **Extension support** — MV3 subset via `session.loadExtension` (starts with uBlock Origin Lite, Dark Reader).
2. **Cloud sync** — Supabase-backed sync for bookmarks, sessions, AI chat history; end-to-end encrypted with a user passphrase.
3. **Plugin ecosystem** — sandboxed "Tools" that register a sidebar panel + IPC namespace; signed manifest.
4. **Mobile** — not Capacitor (it's a webview wrapper). For mobile: Kotlin/Swift shell reusing the React UI via WebView, or a fresh React Native build re-using the AI service layer.
5. **Local LLM acceleration** — `llama.cpp` (via `node-llama-cpp`) as a zero-install fallback when Ollama isn't running.
6. **Workspaces** — Arc-style "Spaces" with separate profiles + themes per space.
7. **Docker dashboard panel** — socket-over-named-pipe to `/var/run/docker.sock`.
