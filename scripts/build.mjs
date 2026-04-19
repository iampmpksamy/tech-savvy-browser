#!/usr/bin/env node
/**
 * Production build:
 *   1. Vite build → dist/
 *   2. tsc -p tsconfig.node.json → dist-electron/
 * electron-builder runs after this (see `npm run package`).
 */
import { build } from 'vite';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

(async () => {
  console.log('\x1b[36m[vite]\x1b[0m building renderer…');
  await build({ configFile: path.join(root, 'vite.config.ts') });

  console.log('\x1b[36m[tsc]\x1b[0m building main + preload…');
  await run('npx', ['tsc', '-p', 'tsconfig.node.json']);

  console.log('\x1b[32m✓\x1b[0m build complete.');
})();
