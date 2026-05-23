import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:       '#f8f6f2',
        bgAlt:    '#f1ede6',
        surface:  '#ffffff',
        border:   'rgba(18,15,11,0.07)',
        text1:    '#120f0b',
        text2:    '#5e5850',
        text3:    '#a8a09a',
        accent:   '#bf4a07',
        green:    '#1b7050',
        red:      '#b02828',
      },
      fontFamily: {
        serif:  ['Playfair Display', 'Georgia', 'serif'],
        sans:   ['DM Sans', 'system-ui', 'sans-serif'],
        mono:   ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
