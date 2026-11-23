/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '.tk-dark'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Segoe UI Variable Text"', '"Segoe UI"', 'Inter', 'system-ui', '-apple-system', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['"Cascadia Code"', 'Consolas', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        brand: {
          50: '#eef4ff', 100: '#dbe6fe', 200: '#bfd3fe', 300: '#93b4fd', 400: '#6090fa',
          500: '#3b6cf6', 600: '#2550eb', 700: '#1d3fd8', 800: '#1e35af', 900: '#1e328a', 950: '#172054',
        },
        ink: {
          50: '#f7f8fa', 100: '#eef0f4', 200: '#dde1e8', 300: '#c3c9d4', 400: '#949cad', 500: '#6b7488',
          600: '#525a6d', 700: '#3f4656', 800: '#272c37', 850: '#1d212a', 900: '#16191f', 950: '#0d0f13',
        },
      },
      boxShadow: {
        window: '0 24px 64px -12px rgba(15, 23, 42, 0.35), 0 8px 24px -8px rgba(15, 23, 42, 0.2)',
        card: '0 1px 2px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04)',
      },
      keyframes: {
        'tk-pop': { '0%': { opacity: 0, transform: 'scale(.97) translateY(6px)' }, '100%': { opacity: 1, transform: 'none' } },
        'tk-fade': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
      },
      animation: { 'tk-pop': 'tk-pop .18s cubic-bezier(.2,.8,.2,1)', 'tk-fade': 'tk-fade .15s ease-out' },
    },
  },
  plugins: [],
};
