import type { Config } from 'tailwindcss'

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: token('background'),
        surface: token('surface'),
        subtle: token('subtle'),
        border: token('border'),
        primary: token('primary'),
        'primary-soft': token('primary-soft'),
        'primary-ink': token('primary-ink'),
        valid: token('license-valid'),
        expiring: token('license-expiring'),
        expired: token('license-expired'),
        text: token('text'),
        muted: token('muted'),
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(68 36 12 / 0.05), 0 1px 1px rgb(68 36 12 / 0.03)',
        lift: '0 1px 2px rgb(68 36 12 / 0.05), 0 16px 36px -14px rgb(68 36 12 / 0.18)',
        focus: '0 0 0 4px rgb(234 88 12 / 0.14)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
        'rise-in': 'rise-in 320ms ease-out both',
        'slide-in': 'slide-in 220ms ease-out',
        shimmer: 'shimmer 1.4s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
