/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        serif: ['Source Serif 4', 'Georgia', 'Times New Roman', 'serif'],
      },
      colors: {
        surface: {
          DEFAULT: '#ffffff',
          dark: '#09090b',
        },
        sidebar: {
          DEFAULT: '#fafafa',
          dark: '#0c0c0f',
        },
        accent: {
          50: '#fef2ee',
          100: '#fde0d8',
          200: '#fac0b0',
          300: '#f59a7f',
          400: '#ef6d48',
          500: '#e54d2e',
          600: '#c73a1e',
          700: '#a12e18',
          800: '#822712',
          900: '#6b200e',
          950: '#4a1609',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
