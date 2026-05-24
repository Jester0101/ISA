/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"EB Garamond"', '"Crimson Text"', 'Georgia', 'serif'],
        display: ['"Cinzel"', '"Cormorant Garamond"', 'serif'],
        mono: ['"Special Elite"', 'Courier', 'monospace'],
      },
      colors: {
        ink: {
          900: '#0d0a07',
          800: '#1a1410',
          700: '#2a2018',
        },
        sepia: {
          50: '#f5ebd9',
          100: '#e8d9b8',
          200: '#c9ad7c',
          300: '#a8854a',
          400: '#7a5d2e',
          500: '#5a4321',
        },
        umber: {
          500: '#3a2818',
          700: '#1f1308',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'fade-in-slow': 'fadeIn 1.2s ease-out',
        'flicker': 'flicker 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.92' },
        },
      },
    },
  },
  plugins: [],
}
