// ─── Command registry ──────────────────────────────────────────────────────
// Commands are produced on-the-fly from the current state of the tabs / AI /
// panels stores, so they always reflect what's actually available right now.
import type { ReactNode } from 'react';
import { createElement } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Globe,
  Search,
  Sparkles,
  FileText,
  HelpCircle,
  Code2,
  Terminal,
  Braces,
  Activity,
  Bookmark,
  PanelRight,
  PanelBottom,
  Plus,
  X,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  AlertTriangle,
  GitPullRequest,
  CircleDot,
  Package,
  Shuffle,
  BookOpen,
  FileCode2,
  List,
  Github,
} from 'lucide-react';
import { useTabs } from '../../store/tabs';
import { useAi } from '../../store/ai';
import { usePanels, type PanelKey } from '../../store/panels';
import type { PageContext } from '@shared/types';

export type CommandGroup = 'Navigation' | 'Tabs' | 'AI' | 'Dev Tools' | 'Window';

export interface Command {
  id: string;
  title: string;
  subtitle?: string;
  group: CommandGroup;
  icon: ReactNode;
  keywords?: string[];
  shortcut?: string;
  run: () => void | Promise<void>;
}

/**
 * Build the command list. Called on every render of the palette so changes to
 * open tabs / panel state are reflected instantly.
 *
 * @param query   Current palette query — used to surface a synthetic "Open URL
 *                or search for …" command when the user types something that
 *                doesn't match an existing command.
 * @param context Classified page context from the active tab. When provided,
 *                context-specific AI commands are injected before the static ones.
 */
export function buildCommands(query: string, context?: PageContext | null): Command[] {
  const cmds: Command[] = [];
  const tabsState = useTabs.getState();
  const aiState = useAi.getState();
  const panelsState = usePanels.getState();

  // ── Navigation (synthetic "Open URL / search" is injected below) ──
  cmds.push(
    {
      id: 'nav.new-tab',
      title: 'New tab',
      group: 'Navigation',
      icon: icon(Plus),
      keywords: ['open', 'create', 'tab'],
      shortcut: 'Ctrl+T',
      run: () => tabsState.create(),
    },
    {
      id: 'nav.close-tab',
      title: 'Close current tab',
      group: 'Navigation',
      icon: icon(X),
      keywords: ['close', 'dismiss', 'tab'],
      shortcut: 'Ctrl+W',
      run: () => {
        if (tabsState.activeId) tabsState.close(tabsState.activeId);
      },
    },
    {
      id: 'nav.reload',
      title: 'Reload current tab',
      group: 'Navigation',
      icon: icon(RotateCw),
      shortcut: 'Ctrl+R',
      run: () => {
        if (tabsState.activeId) tabsState.reload(tabsState.activeId);
      },
    },
    {
      id: 'nav.back',
      title: 'Go back',
      group: 'Navigation',
      icon: icon(ArrowLeft),
      run: () => {
        if (tabsState.activeId) tabsState.back(tabsState.activeId);
      },
    },
    {
      id: 'nav.forward',
      title: 'Go forward',
      group: 'Navigation',
      icon: icon(ArrowRight),
      run: () => {
        if (tabsState.activeId) tabsState.forward(tabsState.activeId);
      },
    },
  );

  // Synthetic "Open URL or search" — bubbled to the top when the user has typed
  // anything that doesn't match an existing command.
  const trimmed = query.trim();
  if (trimmed) {
    const looksUrlish =
      /^[a-z]+:\/\//i.test(trimmed) || /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed);
    cmds.unshift({
      id: 'nav.open-input',
      title: looksUrlish ? `Open ${trimmed}` : `Search the web for "${trimmed}"`,
      group: 'Navigation',
      icon: icon(looksUrlish ? Globe : Search),
      keywords: ['open', 'url', 'go', 'search'],
      run: async () => {
        // Use the active tab if present, else create one.
        const active = tabsState.activeId;
        if (active) tabsState.navigate(active, trimmed);
        else await tabsState.create(trimmed);
      },
    });
  }

  // ── Tab switcher — one command per open tab ──
  for (const t of tabsState.tabs) {
    cmds.push({
      id: `tab.switch.${t.id}`,
      title: t.title || t.url || 'Untitled tab',
      subtitle: t.url,
      group: 'Tabs',
      icon: t.favicon
        ? createElement('img', {
            src: t.favicon,
            alt: '',
            className: 'w-4 h-4 rounded-sm',
          })
        : icon(Bookmark),
      keywords: [t.title, t.url].filter(Boolean) as string[],
      run: () => tabsState.activate(t.id),
    });
  }

  // ── Context-aware AI commands (injected before static AI commands) ──
  if (context) {
    cmds.push(...buildContextCommands(context));
  }

  // ── Static AI actions ──
  cmds.push(
    {
      id: 'ai.summarize',
      title: 'Summarize the current page',
      group: 'AI',
      icon: icon(FileText),
      keywords: ['tl;dr', 'summary', 'page'],
      run: () => {
        panelsState.openRight('ai');
        aiState.summarizeActivePage();
      },
    },
    {
      id: 'ai.explain',
      title: 'Explain the current page',
      group: 'AI',
      icon: icon(HelpCircle),
      keywords: ['what is this', 'context'],
      run: () => {
        panelsState.openRight('ai');
        aiState.askPage('Explain what this page is about.');
      },
    },
    {
      id: 'ai.key-points',
      title: 'Key takeaways from this page',
      group: 'AI',
      icon: icon(Sparkles),
      keywords: ['bullets', 'highlights'],
      run: () => {
        panelsState.openRight('ai');
        aiState.askPage('Give me 5 key takeaways.');
      },
    },
    {
      id: 'ai.explain-clipboard',
      title: 'Explain code from clipboard',
      group: 'AI',
      icon: icon(Code2),
      keywords: ['paste', 'code', 'developer'],
      run: async () => {
        const text = await readClipboard();
        if (!text) return;
        panelsState.openRight('ai');
        aiState.explainCode(text);
      },
    },
    {
      id: 'ai.toggle-sidebar',
      title:
        panelsState.activeRightPanel === 'ai'
          ? 'Hide AI sidebar'
          : 'Show AI sidebar',
      group: 'AI',
      icon: icon(PanelRight),
      shortcut: 'Ctrl+\\',
      run: () => {
        panelsState.openRight(panelsState.activeRightPanel === 'ai' ? 'none' : 'ai');
      },
    },
  );

  // ── Dev tool toggles (bottom panel) ──
  const devTools: Array<{
    key: Exclude<PanelKey, 'none' | 'ai' | 'bookmarks'>;
    title: string;
    icon: ReactNode;
  }> = [
    { key: 'terminal', title: 'Terminal', icon: icon(Terminal) },
    { key: 'api', title: 'API Tester', icon: icon(Code2) },
    { key: 'json', title: 'JSON Viewer', icon: icon(Braces) },
    { key: 'network', title: 'Network Inspector', icon: icon(Activity) },
  ];
  for (const tool of devTools) {
    const isOpen = panelsState.activeBottomPanel === tool.key;
    cmds.push({
      id: `tools.toggle.${tool.key}`,
      title: `${isOpen ? 'Close' : 'Open'} ${tool.title}`,
      group: 'Dev Tools',
      icon: tool.icon,
      keywords: [tool.title.toLowerCase(), 'dev', 'tools'],
      run: () => panelsState.openBottom(isOpen ? 'none' : tool.key),
    });
  }
  // Toggle the whole bottom panel on/off.
  cmds.push({
    id: 'tools.toggle-bottom',
    title:
      panelsState.activeBottomPanel === 'none'
        ? 'Show bottom panel'
        : 'Hide bottom panel',
    group: 'Dev Tools',
    icon: icon(PanelBottom),
    shortcut: 'Ctrl+J',
    run: () => {
      const cur = panelsState.activeBottomPanel;
      panelsState.openBottom(cur === 'none' ? 'terminal' : 'none');
    },
  });

  // ── Bookmarks sidebar toggle ──
  cmds.push({
    id: 'win.toggle-bookmarks',
    title:
      panelsState.activeRightPanel === 'bookmarks'
        ? 'Hide bookmarks'
        : 'Show bookmarks',
    group: 'Window',
    icon: icon(Bookmark),
    run: () =>
      panelsState.openRight(
        panelsState.activeRightPanel === 'bookmarks' ? 'none' : 'bookmarks',
      ),
  });

  return cmds;
}

// ── Context-aware command builder ──────────────────────────────────────────
// Returns AI commands tailored to the current page type. All are in the 'AI'
// group so they appear alongside the static AI actions in the palette.

function buildContextCommands(ctx: PageContext): Command[] {
  const cmds: Command[] = [];
  const aiState = useAi.getState();
  const panelsState = usePanels.getState();

  // Helper: open the AI sidebar then run an action.
  const ai = (fn: () => void) => () => { panelsState.openRight('ai'); fn(); };

  // ── Selected text — shown on any page type when text is highlighted ──
  if (ctx.selectedText) {
    const preview = ctx.selectedText.length > 45
      ? ctx.selectedText.slice(0, 45) + '…'
      : ctx.selectedText;
    cmds.push({
      id: 'ctx.explain-selection',
      title: `Explain selection: "${preview}"`,
      group: 'AI',
      icon: icon(MessageSquare),
      keywords: ['explain', 'selection', 'highlight', 'selected'],
      run: ai(() => aiState.explainCode(ctx.selectedText)),
    });
  }

  // ── Page-type-specific commands ──
  switch (ctx.type) {
    case 'github-repo':
      cmds.push(
        {
          id: 'ctx.github.explain',
          title: 'Explain this repository',
          group: 'AI',
          icon: icon(Github),
          keywords: ['github', 'repo', 'explain', 'what does'],
          run: ai(() => aiState.askPage(
            'What does this repository do? Give a concise technical summary: purpose, key features, and tech stack.',
          )),
        },
        {
          id: 'ctx.github.issues',
          title: 'Find potential issues in this repo',
          group: 'AI',
          icon: icon(AlertTriangle),
          keywords: ['github', 'bugs', 'issues', 'review', 'problems'],
          run: ai(() => aiState.askPage(
            'Based on what you can see, what potential bugs, security issues, or improvements would you suggest for this repository?',
          )),
        },
      );
      break;

    case 'github-pr':
      cmds.push({
        id: 'ctx.github-pr.review',
        title: 'Review this pull request',
        group: 'AI',
        icon: icon(GitPullRequest),
        keywords: ['pr', 'pull request', 'review', 'diff', 'changes'],
        run: ai(() => aiState.askPage(
          'Review this pull request. Summarize what it changes, evaluate the approach, and flag any concerns.',
        )),
      });
      break;

    case 'github-issue':
      cmds.push({
        id: 'ctx.github-issue.analyze',
        title: 'Analyze this GitHub issue',
        group: 'AI',
        icon: icon(CircleDot),
        keywords: ['issue', 'bug', 'analyze', 'fix', 'solution'],
        run: ai(() => aiState.askPage(
          'Analyze this GitHub issue. What is the likely root cause and what are the best approaches to fix it?',
        )),
      });
      break;

    case 'npm':
      cmds.push(
        {
          id: 'ctx.npm.explain',
          title: 'Explain this npm package',
          group: 'AI',
          icon: icon(Package),
          keywords: ['npm', 'package', 'library', 'module', 'explain'],
          run: ai(() => aiState.askPage(
            'What does this npm package do? When should I use it, and what are its main caveats or limitations?',
          )),
        },
        {
          id: 'ctx.npm.alternatives',
          title: 'Show alternatives to this package',
          group: 'AI',
          icon: icon(Shuffle),
          keywords: ['npm', 'alternative', 'compare', 'similar'],
          run: ai(() => aiState.askPage(
            'What are the best alternatives to this npm package? Give a brief comparison of each.',
          )),
        },
      );
      break;

    case 'mdn':
      cmds.push({
        id: 'ctx.mdn.explain',
        title: 'Explain this Web API',
        group: 'AI',
        icon: icon(BookOpen),
        keywords: ['mdn', 'api', 'web', 'explain', 'browser'],
        run: ai(() => aiState.askPage(
          'Explain this Web API in simple terms. Include browser support notes and a practical code example.',
        )),
      });
      break;

    case 'api-docs':
      cmds.push({
        id: 'ctx.api-docs.explain',
        title: 'Summarize this API documentation',
        group: 'AI',
        icon: icon(FileCode2),
        keywords: ['api', 'docs', 'endpoints', 'explain', 'reference'],
        run: ai(() => aiState.askPage(
          'Summarize this API documentation. What endpoints are available, what do they do, and how do I authenticate?',
        )),
      });
      break;

    case 'json':
      cmds.push(
        {
          id: 'ctx.json.analyze',
          title: 'Analyze this JSON structure',
          group: 'AI',
          icon: icon(Braces),
          keywords: ['json', 'data', 'structure', 'analyze', 'format'],
          run: ai(() => aiState.askPage(
            'Analyze this JSON structure. What is it used for, what are the key fields, and are there any anomalies?',
          )),
        },
        {
          id: 'ctx.json.open-viewer',
          title: 'Open in JSON Viewer',
          group: 'Dev Tools',
          icon: icon(Braces),
          keywords: ['json', 'viewer', 'format', 'pretty'],
          run: () => panelsState.openBottom('json'),
        },
      );
      break;

    case 'article':
      cmds.push(
        {
          id: 'ctx.article.summarize',
          title: 'Summarize this article',
          group: 'AI',
          icon: icon(FileText),
          keywords: ['article', 'summarize', 'tl;dr', 'summary'],
          run: ai(() => aiState.summarizeActivePage()),
        },
        {
          id: 'ctx.article.takeaways',
          title: 'Key takeaways from this article',
          group: 'AI',
          icon: icon(List),
          keywords: ['article', 'takeaways', 'highlights', 'bullets', 'key points'],
          run: ai(() => aiState.askPage(
            'Give me the 5 most important takeaways from this article as bullet points.',
          )),
        },
      );
      break;
  }

  return cmds;
}

// ── helpers ────────────────────────────────────────────────────────────────

function icon(Cmp: LucideIcon): ReactNode {
  return createElement(Cmp, { size: 14, className: 'text-fg-1' });
}

async function readClipboard(): Promise<string> {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return '';
  }
}

/**
 * Simple, dependency-free ranker. Order of preference:
 *   1. prefix match on title
 *   2. substring match in title
 *   3. substring match in subtitle
 *   4. substring match in any keyword
 * Returns -1 when nothing matches.
 */
export function scoreCommand(c: Command, q: string): number {
  if (!q) return 0; // unfiltered: keep original order
  const needle = q.toLowerCase();
  const title = c.title.toLowerCase();
  if (title.startsWith(needle)) return 100 - needle.length;
  if (title.includes(needle)) return 80;
  if (c.subtitle?.toLowerCase().includes(needle)) return 60;
  if (c.keywords?.some((k) => k.toLowerCase().includes(needle))) return 40;
  return -1;
}
