import { nextui } from '@nextui-org/react';
import { fontFamily, screens } from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './apps/frontend/index.html',
    './apps/frontend/**/*.{js,ts,jsx,tsx}',
    './node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans],
      },
      colors: {
        primary: '#DE0376',
      },
      screens: {
        xs: '480px',
        ...screens,
      },
    },
  },
  darkMode: 'class',
  plugins: [nextui()],
};
