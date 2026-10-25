/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 900: '#0b2545', 800: '#13315c', 700: '#1b4079' },
        brand: { DEFAULT: '#1d5fa8', dark: '#164a85' },
        gold: '#f2b632',
      },
    },
  },
  plugins: [],
}
