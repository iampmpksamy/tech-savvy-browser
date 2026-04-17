#!/usr/bin/env node
/**
 * Dev runner:
 *   1. starts Vite dev server for the renderer,
 *   2. transpiles electron/ with tsc in watch mode,
 *   3. launches Electron against the Vite URL + rebuilds main on change.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'vite';
import chokidar from 'chokidar';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

let electronProc = null;

function log(tag, msg) {
  process.stdout.write(`\x1b[36m[${tag}]\x1b[0m ${msg}\n`);
}

async function startVite() {
  const server = await createServer({
    configFile: path.join(root, 'vite.config.ts'),
    root,
  });
  await server.listen();
  server.printUrls();
  return server;
}

function buildMain() {
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['tsc', '-p', 'tsconfig.node.json'], {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`tsc exited ${code}`))));
  });
}

function launchElectron(url) {
  if (electronProc) {
    electronProc.kill();
    electronProc = null;
  }
  electronProc = spawn('npx', ['electron', '.'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, VITE_DEV_SERVER_URL: url, NODE_ENV: 'development' },
  });
  electronProc.on('exit', () => {
    electronProc = null;
    process.exit(0);
  });
}

(async () => {
  log('vite', 'starting…');
  const vite = await startVite();
  const url = `http://localhost:${vite.config.server.port}`;

  log('tsc', 'building main+preload…');
  await buildMain();

  log('electron', 'launching…');
  launchElectron(url);

  // Rebuild main process on change.
  chokidar
    .watch(['electron/**/*.ts', 'src/shared/**/*.ts'], { cwd: root, ignoreInitial: true })
    .on('all', async () => {
      log('tsc', 'rebuilding…');
      try {
        await buildMain();
        launchElectron(url);
      } catch (e) {
        log('tsc', `error: ${e.message}`);
      }
    });
})();
