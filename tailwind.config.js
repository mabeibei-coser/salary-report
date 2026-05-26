/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // 亮色主题（与 src/index.css 的 :root 变量保持一致）
        'navy': '#1e3a5f',
        'navy-light': '#2563eb',
        'gold': '#c79f4a',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
};
