/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0a0e17',
        'dark-card': 'rgba(18, 24, 38, 0.7)',
        'glass-border': 'rgba(255, 255, 255, 0.08)',
        'accent-cyan': '#00d4ff',
        'accent-green': '#00e676',
        'accent-orange': '#ff9100',
        'accent-purple': '#b388ff',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
};
