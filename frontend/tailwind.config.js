/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Accent de marque — base #FF5C00 (orange winvitepro)
        primary: {
          50: '#fff3ec',
          100: '#ffe1d0',
          200: '#ffc2a1',
          300: '#ff9e6b',
          400: '#ff7a38',
          500: '#ff5c00',
          600: '#e64f00',
          700: '#bf4200',
          800: '#963400',
          900: '#7a2c00',
          950: '#421600',
        },
        // Tokens sémantiques pilotés par des variables CSS (voir index.css) —
        // le light/dark est géré au même endroit plutôt qu'avec `dark:` partout.
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        content: 'rgb(var(--content) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        secondary: {
          50: '#f8f6f4',
          100: '#edeae4',
          200: '#dbd4ca',
          300: '#c4b7a8',
          400: '#ab9582',
          500: '#9a7f68',
          600: '#8d705c',
          700: '#755c4d',
          800: '#614d43',
          900: '#504139',
          950: '#2a211c',
        },
        gold: {
          50: '#fdf9ef',
          100: '#f9efd3',
          200: '#f2dda5',
          300: '#eac66e',
          400: '#e3ad41',
          500: '#d9932a',
          600: '#c07321',
          700: '#a0551e',
          800: '#83441f',
          900: '#6c391c',
          950: '#3d1c0c',
        },
        rose: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
          950: '#4c0519',
        },
      },
      // Default border color follows the theme token, so bare `border`/`border-b`
      // elements (no explicit colour) adapt to dark mode too.
      borderColor: {
        DEFAULT: 'rgb(var(--border) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        script: ['Dancing Script', 'cursive'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-wedding': 'linear-gradient(135deg, #fdf6f3 0%, #fbeae4 100%)',
      },
    },
  },
  plugins: [],
}
