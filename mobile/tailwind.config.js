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
      // Tailwind v3'un (NativeWind) varsayilan araligi 12'den 14'e atlar -- web'in Tailwind v4'u
      // (dogrusal --spacing formulu) h-13/h-15 gibi degerleri kendiliginden uretir, burada elle
      // eklenmesi gerekiyor. Eksik oldugunda NativeWind sinifi SESSIZCE yoksayiyordu (h-13/h-15
      // hic uygulanmiyordu) -- BirincilDugme/SayiAlani gibi butonlarin yuksekliksiz, "duz" ve
      // metinle ustten/alttan bosluksuz gorunmesinin sebebi buydu.
      spacing: {
        13: '3.25rem',
        15: '3.75rem',
      },
    },
  },
  plugins: [],
};
