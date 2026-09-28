import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // format.ts artik cihazin/calistigi ortamin yerel saat dilimini kullaniyor (#434) --
    // testler makinenin/CI'in TZ'sinden bagimsiz, hep ayni sonucu versin diye TR'ye sabitlenir
    // (mobilin jest.setup.js'teki cihaz dili sabitlemesiyle ayni gerekce).
    env: {
      TZ: 'Europe/Istanbul',
    },
  },
});
