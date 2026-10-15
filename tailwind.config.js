/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        friendly: {
          50: '#fff5f5',
          100: '#fed7d7',
          500: '#f56565',
          600: '#e53e3e',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Outfit', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
