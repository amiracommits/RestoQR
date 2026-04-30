// tailwind.config.js — edita el que ya tienes
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        znt: {
          bg:      '#0f0f0f',
          surface: '#1a1a1a',
          hover:   '#222222',
          accent:  '#E85D26',
          muted:   '#888888',
        }
      },
    },
  },
  plugins: [],
}

