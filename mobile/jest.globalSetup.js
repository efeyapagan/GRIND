// format.ts artik cihazin yerel saat dilimini kullaniyor (#434) -- mock olmazsa formatSaat/
// formatTarih gibi fonksiyonlarin testleri makinenin/CI'in TZ'sine gore degisir. `setupFiles`
// DEGIL burada sabitlenir: setupFiles her worker SURECI BASLADIKTAN SONRA calisir, o noktada
// process.env.TZ'i degistirmek ICU'nun onbelleklenmis varsayilan dilimini her ortamda guncellemez
// (CI'da UTC kaliyordu). `globalSetup` worker havuzu olusmadan ONCE, ana surecte calisir; worker'lar
// bu surecten forklanirken TZ'yi kendi baslangic ortami olarak devralir.
module.exports = async () => {
  process.env.TZ = 'Europe/Istanbul';
};
