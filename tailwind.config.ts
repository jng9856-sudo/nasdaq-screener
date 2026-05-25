import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { mono: ['var(--font-mono)', 'monospace'] },
      colors: {
        t: {
          bg:      '#080c0f',
          surface: '#0d1117',
          border:  '#1c2a35',
          green:   '#00d084',
          red:     '#ff4d4d',
          amber:   '#ffaa00',
          blue:    '#4da6ff',
          dim:     '#4a6070',
          text:    '#c9d8e3',
        },
      },
    },
  },
  plugins: [],
};
export default config;
