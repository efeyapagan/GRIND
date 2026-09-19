/**
 * Grafik ekseni icin yuvarlak degerler (asagidan yukariya). Sunum hesabidir: sunucunun degerlerini
 * degistirmez, yalnizca ekseni cizmek icin 1 / 2 / 2,5 / 5 x 10^n adimlarindan uygun olani secer.
 */
export function eksenDegerleri(enKucuk: number, enBuyuk: number, adimSayisi = 4): number[] {
  const hamAdim =
    enBuyuk > enKucuk ? (enBuyuk - enKucuk) / adimSayisi : Math.max(Math.abs(enBuyuk), 1) / adimSayisi;
  const us = 10 ** Math.floor(Math.log10(hamAdim));
  const adayAdim = [1, 2, 2.5, 5, 10].map((carpan) => carpan * us).find((aday) => aday >= hamAdim) ?? 10 * us;
  // Cok yakin degerlerde (orn. 124.14 / 124.15) "guzel adim" secimi neredeyse 0'a duser ve
  // bicimlenmis etiketler tekrar eder (review bulgusu M3) -- adim 0,5 kg altina inmez.
  const adim = Math.max(adayAdim, 0.5);
  const alt = Math.floor(enKucuk / adim) * adim;
  const hamUst = Math.ceil(enBuyuk / adim) * adim;
  const ust = hamUst === alt ? alt + adim : hamUst;

  const degerler: number[] = [];
  // Kayan nokta birikimi son degeri kacirmasin diye ust sinir kucuk bir payla karsilastirilir.
  for (let sira = 0; alt + sira * adim <= ust + adim / 1000; sira += 1) {
    degerler.push(Number((alt + sira * adim).toFixed(6)));
  }
  return degerler;
}
