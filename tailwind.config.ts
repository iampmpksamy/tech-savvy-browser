import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark-first palette, inspired by VS Code + Arc.
        bg: {
          0: '#0a0b0d',
          1: '#101216',
          2: '#14171c',
          3: '#1a1e25',
          4: '#242933',
        },
        fg: {
          0: '#e8ebf0',
          1: '#b9c0cc',
          2: '#7a8291',
          3: '#4e5563',
        },
        accent: {
          DEFAULT: '#6d8cff',
          glow: '#8aa4ff',
          muted: '#2a3558',
        },
        danger: '#ff6d7a',
        warn: '#ffb86b',
        ok: '#6bd28a',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        panel: '0 10px 40px -10px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
};

export default config;
