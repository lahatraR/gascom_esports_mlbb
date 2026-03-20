import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // ── GES Brand Palette ──────────────────────────────────────────────────
        // Remapped from "navy" to GES brand darks so all existing navy-* classes
        // now render in the brand black family instead of blue-tinted navy.
        navy: {
          950: '#030304',   // brand-black (body background)
          900: '#090909',   // header / footer surface
          800: '#111114',   // card / input background
          700: '#1a1a1e',   // slightly raised surfaces
          600: '#222228',   // borders / dividers
        },
        // ── Gascom Esports crimson ─────────────────────────────────────────────
        crimson: {
          DEFAULT: '#7c1a0f',
          light:   '#a02010',
          dark:    '#5a1208',
          glow:    'rgba(124,26,15,0.5)',
        },
        // ── Team colors ────────────────────────────────────────────────────────
        blue: {
          team: '#1e6fff',
          glow: '#4d94ff',
        },
        red: {
          team: '#e83535',
          glow: '#f06060',
        },
        gold: '#f5c518',
      },
      fontFamily: {
        display: ['Bebas Neue', 'Impact', 'system-ui', 'sans-serif'],
        sans:    ['Geologica', 'system-ui', 'sans-serif'],
        mono:    ['monospace'],
      },
      animation: {
        pulse:      'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-blue': 'glowBlue 2s ease-in-out infinite alternate',
        'glow-red':  'glowRed 2s ease-in-out infinite alternate',
        'glow-crimson': 'glowCrimson 2.5s ease-in-out infinite alternate',
        'slide-in':  'slideIn 0.28s ease-out',
      },
      keyframes: {
        glowBlue: {
          from: { boxShadow: '0 0 5px rgba(30,111,255,0.25)' },
          to:   { boxShadow: '0 0 20px rgba(30,111,255,0.5), 0 0 40px rgba(30,111,255,0.25)' },
        },
        glowRed: {
          from: { boxShadow: '0 0 5px rgba(232,53,53,0.25)' },
          to:   { boxShadow: '0 0 20px rgba(232,53,53,0.5), 0 0 40px rgba(232,53,53,0.25)' },
        },
        glowCrimson: {
          from: { boxShadow: '0 0 8px rgba(124,26,15,0.3)' },
          to:   { boxShadow: '0 0 24px rgba(124,26,15,0.7), 0 0 48px rgba(124,26,15,0.3)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'ges-pattern': `
          radial-gradient(circle at 15% 20%, rgba(124,26,15,0.08) 0%, transparent 50%),
          radial-gradient(circle at 85% 80%, rgba(124,26,15,0.06) 0%, transparent 50%)
        `,
      },
    },
  },
  plugins: [],
};

export default config;
