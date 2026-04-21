import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          0: '#0a0b0d',
          1: '#101216',
          2: '#14171c',
          3: '#1a1e25',
          4: '#242933',
        },
        sidebar: '#0d0f13',
        fg: {
          0: '#e8ebf0',
          1: '#b9c0cc',
          2: '#7a8291',
          3: '#4e5563',
        },
        accent: {
          DEFAULT: '#6d8cff',
          glow:    '#8aa4ff',
          muted:   '#2a3558',
          dim:     'rgba(109,140,255,0.12)',
        },
        danger: '#ff6d7a',
        warn:   '#ffb86b',
        ok:     '#6bd28a',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        panel:      '0 10px 40px -10px rgba(0,0,0,0.6)',
        glass:      '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
        glow:       '0 0 24px rgba(109,140,255,0.28)',
        'tab-active': '0 0 0 1px rgba(109,140,255,0.28), 0 2px 12px rgba(109,140,255,0.10)',
        omnibox:    '0 0 0 3px rgba(109,140,255,0.10), 0 4px 16px rgba(0,0,0,0.35)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34,1.56,0.64,1)',
      },
      backdropBlur: {
        xs: '4px',
      },
    },
  },
  plugins: [],
};

export default config;
