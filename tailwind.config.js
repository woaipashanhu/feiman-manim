/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0a0a0f',
          800: '#0f0f1a',
          700: '#1a1a2e',
          600: '#252540',
        },
        accent: {
          DEFAULT: '#00d4aa',
          light: '#33e0be',
          dark: '#00a888',
        },
        muted: '#a0a0b8',
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'card': '16px',
      },
    },
  },
  plugins: [],
}