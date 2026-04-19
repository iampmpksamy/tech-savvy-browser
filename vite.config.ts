import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Vite is used *only* for the renderer (React chrome UI).
// The Electron main + preload are built with `tsc` via scripts/build.mjs.
export default defineConfig({
  root: '.',
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  server: {
    port: 5179,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    target: 'chrome126',
  },
});
