/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark base surfaces
        surface: {
          primary: '#090909',
          secondary: '#111111',
          card: 'rgba(255,255,255,0.04)',
          'card-hover': 'rgba(255,255,255,0.06)',
          border: 'rgba(255,255,255,0.08)',
          'border-strong': 'rgba(255,255,255,0.15)',
        },
        // Text hierarchy
        ink: {
          primary: '#ffffff',
          secondary: '#868F97',
          muted: '#4B5563',
        },
        // Brand accent (Fey orange)
        accent: {
          DEFAULT: '#FFA16C',
          hover: '#D88036',
          subtle: 'rgba(255,161,108,0.12)',
        },
        // Semantic colors
        gain: {
          DEFAULT: '#22c55e',
          subtle: 'rgba(34,197,94,0.12)',
        },
        loss: {
          DEFAULT: '#ef4444',
          subtle: 'rgba(239,68,68,0.12)',
        },
        info: {
          DEFAULT: '#60a5fa',
          subtle: 'rgba(96,165,250,0.12)',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '"Noto Sans JP"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          '"Noto Sans Mono"',
          'ui-monospace',
          'monospace',
        ],
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateX(100%)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'toast-in': 'toast-in 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
