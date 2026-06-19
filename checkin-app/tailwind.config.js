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
          50: '#fdf6f3',
          100: '#fbeae4',
          200: '#f8d5ca',
          300: '#f2b5a3',
          400: '#ea8b71',
          500: '#df6746',
          600: '#cc5038',
          700: '#ab402e',
          800: '#8d382b',
          900: '#743329',
          950: '#3e1812',
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
