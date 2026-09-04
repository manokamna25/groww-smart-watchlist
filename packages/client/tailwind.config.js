/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        groww: {
          green: '#00D09C',
          'green-dark': '#00B386',
          purple: '#5367FF',
          'purple-dark': '#3F4FC4',
          bg: '#0B0D17',
          surface: '#121726',
          'surface-2': '#1A1F35',
          border: '#262D44',
          'text-primary': '#E8EAED',
          'text-secondary': '#9CA3AF',
          'text-muted': '#6B7280',
        },
        tier: {
          quiet: '#6B7280',
          notable: '#FBBF24',
          meaningful: '#F97316',
          critical: '#EF4444',
        },
        freshness: {
          live: '#00D09C',
          delayed: '#FBBF24',
          stale: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
