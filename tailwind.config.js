/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Industrial palette
        critical: '#E11D2E',
        violet: '#6D28D9',
        machine: '#1E40AF',
        cyan: '#06B6D4',
        optimal: '#22C55E',
        warn: '#F59E0B',
        // Background layers
        abyss: '#020617',
        ink: '#0F172A',
        midnight: '#1E1B4B',
        panel: 'rgba(15, 23, 42, 0.55)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      backgroundImage: {
        'industrial': 'linear-gradient(120deg, #1E1B4B 0%, #0F172A 50%, #020617 100%)',
        'panel-glass': 'linear-gradient(180deg, rgba(148,163,184,0.08), rgba(15,23,42,0.35))',
        'grid-lines':
          'linear-gradient(to right, rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.06) 1px, transparent 1px)',
      },
      boxShadow: {
        'neon-blue': '0 0 0 1px rgba(30,64,175,0.45), 0 0 24px -4px rgba(30,64,175,0.6)',
        'neon-cyan': '0 0 0 1px rgba(6,182,212,0.45), 0 0 24px -4px rgba(6,182,212,0.55)',
        'neon-green': '0 0 0 1px rgba(34,197,94,0.45), 0 0 24px -4px rgba(34,197,94,0.55)',
        'neon-red': '0 0 0 1px rgba(225,29,46,0.55), 0 0 28px -4px rgba(225,29,46,0.65)',
        'neon-violet': '0 0 0 1px rgba(109,40,217,0.45), 0 0 24px -4px rgba(109,40,217,0.6)',
        'panel': '0 1px 0 rgba(148,163,184,0.08) inset, 0 0 0 1px rgba(148,163,184,0.08), 0 20px 40px -20px rgba(2,6,23,0.8)',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1', filter: 'brightness(1)' },
          '50%': { opacity: '0.9', filter: 'brightness(1.15)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 1px rgba(6,182,212,0.4), 0 0 16px -4px rgba(6,182,212,0.45)' },
          '50%': { boxShadow: '0 0 0 1px rgba(6,182,212,0.7), 0 0 32px -4px rgba(6,182,212,0.7)' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1200%)' },
        },
      },
      animation: {
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2.8s ease-in-out infinite',
        'scan-line': 'scan-line 6s linear infinite',
      },
    },
  },
  plugins: [],
};
