/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff8f1',
          100: '#ffe8cc',
          200: '#ffd099',
          300: '#ffb366',
          400: '#ff9533',
          500: '#f97316',   // primary orange
          600: '#ea6c0d',
          700: '#c2540a',
          800: '#9a3c07',
          900: '#7c2d04',
        },
        surface: {
          DEFAULT: '#ffffff',
          50:  '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      animation: {
        'slide-up':     'slideUp 0.3s ease-out',
        'slide-down':   'slideDown 0.3s ease-out',
        'fade-in':      'fadeIn 0.2s ease-out',
        'spin-slow':    'spin 3s linear infinite',
        'bounce-light': 'bounceLite 1s infinite',
        'pulse-dot':    'pulseDot 1.5s ease-in-out infinite',
      },
      keyframes: {
        slideUp:     { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideDown:   { from: { opacity: 0, transform: 'translateY(-16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:      { from: { opacity: 0 }, to: { opacity: 1 } },
        bounceLite:  { '0%,100%': { transform: 'translateY(-4px)' }, '50%': { transform: 'translateY(0)' } },
        pulseDot:    { '0%,100%': { opacity: 1, transform: 'scale(1)' }, '50%': { opacity: 0.5, transform: 'scale(0.85)' } },
      },
      boxShadow: {
        'card':    '0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)',
        'card-lg': '0 4px 16px rgba(0,0,0,.10), 0 2px 4px rgba(0,0,0,.05)',
        'bottom':  '0 -4px 24px rgba(0,0,0,.08)',
      },
      screens: {
        'xs': '375px',
      },
    },
  },
  plugins: [],
};
