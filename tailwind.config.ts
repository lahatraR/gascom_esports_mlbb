import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#030712',
          900: '#050b18',
          800: '#0a1628',
          700: '#0d1b2a',
          600: '#111f33',
        },
        blue: {
          team: '#1e6fff',
          glow: '#4d94ff',
        },
        red: {
          team: '#ff3c3c',
          glow: '#ff6b6b',
        },
        gold: '#f5c518',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-blue': 'glowBlue 2s ease-in-out infinite alternate',
        'glow-red': 'glowRed 2s ease-in-out infinite alternate',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        glowBlue: {
          from: { boxShadow: '0 0 5px #1e6fff40' },
          to: { boxShadow: '0 0 20px #1e6fff80, 0 0 40px #1e6fff40' },
        },
        glowRed: {
          from: { boxShadow: '0 0 5px #ff3c3c40' },
          to: { boxShadow: '0 0 20px #ff3c3c80, 0 0 40px #ff3c3c40' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
