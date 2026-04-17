// Thin wrapper over the preload bridge for type-safe imports in React code.
import type { TsBridge } from '../../../electron/preload';

declare global {
  interface Window {
    ts: TsBridge;
  }
}

export const ts = () => window.ts;
export type { TsBridge };
