/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Light theme
        bg: 'var(--bg)',
        'bg-elevated': 'var(--bg-elevated)',
        text: 'var(--text)',
        'text-muted': 'var(--text-muted)',
        accent: 'var(--accent)',
        border: 'var(--border)',
      },
      maxWidth: {
        'prose': '65ch',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
