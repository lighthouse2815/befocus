/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        'paper-raised': 'var(--paper-raised)',
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        moss: 'var(--moss)',
        'moss-dark': 'var(--moss-dark)',
        'moss-wash': 'var(--moss-wash)',
        'moss-mid': 'var(--moss-mid)',
        'moss-strong': 'var(--moss-strong)',
        clay: 'var(--clay)',
        'clay-wash': 'var(--clay-wash)',
        amber: 'var(--amber)',
        'amber-wash': 'var(--amber-wash)',
        ocean: 'var(--ocean)',
        plum: 'var(--plum)',
        danger: 'var(--danger)',
      },
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        tray: '0 16px 40px rgba(30, 41, 36, 0.14)',
        dialog: '0 18px 48px rgba(30, 41, 36, 0.18)',
      },
      borderRadius: { control: '6px', surface: '10px', tray: '16px' },
    },
  },
  plugins: [],
}
