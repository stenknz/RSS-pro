/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
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
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
