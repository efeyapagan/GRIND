const { renkler, yaziBoyutlari, yaziAilesi } = require('@grind/shared/designTokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: renkler,
      fontSize: yaziBoyutlari,
      fontFamily: yaziAilesi,
    },
  },
  plugins: [],
};
