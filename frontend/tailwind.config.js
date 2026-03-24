/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surf: {
          900: '#0B0E14',
          800: '#151A22',
          700: '#232A35'
        },
        brand: {
          light: '#60A5FA',
          DEFAULT: '#3B82F6',
          dark: '#1D4ED8'
        },
        accent: {
          DEFAULT: '#8B5CF6',
          glow: 'rgba(139, 92, 246, 0.4)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
