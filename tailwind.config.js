/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '.tk-dark'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"ITSMTK Poppins"', 'Poppins', 'ui-sans-serif', 'sans-serif'],
        mono: ['"Cascadia Code"', 'Consolas', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        brand: {
          50: '#eff5ff', 100: '#dce8ff', 200: '#c0d5ff', 300: '#94b8fe', 400: '#6192fb',
          500: '#3d6ff6', 600: '#2856eb', 700: '#2045d0', 800: '#203ba8', 900: '#203784', 950: '#172250',
        },
        ink: {
          25: '#fbfbfa', 50: '#f6f6f4', 100: '#efefec', 200: '#e3e3df', 300: '#cfcfca', 400: '#9d9d97', 500: '#73736d',
          600: '#585853', 700: '#42423e', 800: '#2b2b28', 850: '#20201e', 900: '#181816', 950: '#0f0f0e',
        },
      },
      boxShadow: {
        window: '0 30px 80px -20px rgba(24, 24, 22, 0.28), 0 12px 32px -12px rgba(24, 24, 22, 0.16), 0 0 0 1px rgba(24,24,22,0.06)',
        card: '0 1px 2px rgba(24,24,22,0.04)',
        lift: '0 6px 20px -8px rgba(24,24,22,0.16), 0 2px 6px -2px rgba(24,24,22,0.06)',
        focus: '0 0 0 3px rgba(40, 86, 235, 0.18)',
      },
      keyframes: {
        'tk-pop': { '0%': { opacity: 0, transform: 'scale(.96) translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        'tk-out': { '0%': { opacity: 1, transform: 'none' }, '100%': { opacity: 0, transform: 'scale(.97) translateY(6px)' } },
        'tk-fade': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'tk-rise': { '0%': { opacity: 0, transform: 'translateY(6px)' }, '100%': { opacity: 1, transform: 'none' } },
        'tk-drop': { '0%': { opacity: 0, transform: 'translateY(-4px) scale(.98)' }, '100%': { opacity: 1, transform: 'none' } },
        'tk-check': { '0%': { strokeDashoffset: 24 }, '100%': { strokeDashoffset: 0 } },
        'tk-pulse': { '0%': { boxShadow: '0 0 0 0 rgba(40,86,235,.35)' }, '100%': { boxShadow: '0 0 0 12px rgba(40,86,235,0)' } },
      },
      animation: {
        'tk-pop': 'tk-pop .22s cubic-bezier(.2,.9,.25,1)',
        'tk-out': 'tk-out .16s ease-in forwards',
        'tk-fade': 'tk-fade .16s ease-out',
        'tk-rise': 'tk-rise .22s cubic-bezier(.2,.9,.25,1)',
        'tk-drop': 'tk-drop .14s ease-out',
        'tk-check': 'tk-check .35s ease-out .05s both',
        'tk-pulse': 'tk-pulse .9s ease-out 2',
      },
    },
  },
  plugins: [],
};
