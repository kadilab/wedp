/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
