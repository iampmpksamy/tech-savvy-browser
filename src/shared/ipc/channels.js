"use strict";
// ─── IPC Channel Registry ──────────────────────────────────────────────────
// One source of truth — both main and renderer import from here.
// `invoke` channels = request/response. `send`/`on` channels = push events.
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC = void 0;
exports.IPC = {
    // Tabs
    TAB_CREATE: 'tab:create',
    TAB_CLOSE: 'tab:close',
    TAB_ACTIVATE: 'tab:activate',
    TAB_NAVIGATE: 'tab:navigate',
    TAB_RELOAD: 'tab:reload',
    TAB_BACK: 'tab:back',
    TAB_FORWARD: 'tab:forward',
    TAB_SET_BOUNDS: 'tab:setBounds',
    TAB_LIST: 'tab:list',
    TAB_UPDATED: 'tab:updated', // push
    // Profiles
    PROFILE_LIST: 'profile:list',
    PROFILE_CREATE: 'profile:create',
    PROFILE_ACTIVATE: 'profile:activate',
    PROFILE_DELETE: 'profile:delete',
    // Bookmarks
    BOOKMARK_LIST: 'bookmark:list',
    BOOKMARK_ADD: 'bookmark:add',
    BOOKMARK_REMOVE: 'bookmark:remove',
    // AI
    AI_LIST_PROVIDERS: 'ai:listProviders',
    AI_SET_KEY: 'ai:setKey',
    AI_SEND: 'ai:send',
    AI_STREAM: 'ai:stream', // push
    AI_SUMMARIZE_PAGE: 'ai:summarizePage',
    AI_EXPLAIN_CODE: 'ai:explainCode',
    AI_ASK_PAGE: 'ai:askPage',
    // Page extraction (for AI)
    PAGE_EXTRACT_TEXT: 'page:extractText',
    // Settings
    SETTINGS_GET: 'settings:get',
    SETTINGS_SET: 'settings:set',
    // Terminal
    TERM_SPAWN: 'term:spawn',
    TERM_WRITE: 'term:write',
    TERM_RESIZE: 'term:resize',
    TERM_KILL: 'term:kill',
    TERM_DATA: 'term:data', // push
    TERM_EXIT: 'term:exit', // push
    // API tester
    API_EXECUTE: 'api:execute',
    // Network inspector
    NET_ATTACH: 'net:attach',
    NET_DETACH: 'net:detach',
    NET_EVENT: 'net:event', // push
    // Window controls
    WIN_MINIMIZE: 'win:minimize',
    WIN_MAXIMIZE: 'win:maximize',
    WIN_CLOSE: 'win:close',
    WIN_FULLSCREEN: 'win:fullscreen',
    // Updater
    UPDATER_STATUS: 'updater:status', // push
    UPDATER_CHECK: 'updater:check',
    UPDATER_INSTALL: 'updater:install',
};
