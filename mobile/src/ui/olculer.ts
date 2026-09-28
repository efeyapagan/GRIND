/**
 * Antrenman ekraninin KENDI ust barinin yuksekligi (#466 barı, #487'de sabitlendi).
 *
 * Dinlenme sayacinin genis paneli (`DinlenmeKabugu`) bu barin USTUNE oturur ve onu TAM kapatmak
 * zorundadir. Panel sabit `h-12` (48 px) iken bardan kisa kaliyordu ve basligin altindaki kavisli
 * turuncu cizgi panelin ALTINDAN gorunuyordu (kullanici bildirdi). Iki yer de bu SABITTEN okur --
 * iki ayri sayi zamanla ayrisir ve ayni hata geri doner.
 *
 * Deger normal ust barla ayni (`h-16`): baslik (`text-title`, 26 px) + 4 px bosluk + 10 px cizgi
 * rahat siğar, iki bar da ayni yukseklikte durur.
 */
export const ANTRENMAN_BARI_YUKSEKLIGI = 64;

/**
 * Normal ust barin yuksekligi (`KabukBaslik`, `h-16`). Barin sag ucundaki bir dugmenin actigi
 * pencere (#420, `DonemSecici`) bu yuksekligin HEMEN ALTINDA acilir: sabit bir `mt-*` guvenli alan
 * yuksekligi cihazdan cihaza degistigi icin pencereyi dugmenin USTUNE bindiriyordu.
 */
export const UST_BAR_YUKSEKLIGI = 64;
