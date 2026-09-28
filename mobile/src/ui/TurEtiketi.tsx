import { Text } from 'react-native';

/**
 * Antrenman turu hapi (sablon adi ya da "Serbest"): notr, buyuk harf. `accent` KULLANILMAZ
 * (gorsel tasarim spec'i Karar 2: accent rekorlara, birincil eyleme, aktif sekmeye ve markaya ayrildi).
 *
 * #502: hap kendi DIKEY hizasini dayatmaz. Onceki `self-start`, saran satirin `items-center`'ini
 * ezip hapi satirin tepesine yapistiriyordu; yanindaki geri tusu ortada kaldigi icin ikisi
 * hizasizdi (kullanici bildirdi). Hapin bir SUTUN icinde tum genislige yayilmamasi gerekiyorsa
 * bu o cagiranin isidir -- orada bir satir kabina konur (bkz. DevamEdenAntrenman).
 */
export default function TurEtiketi({ children }: { children: React.ReactNode }) {
  return (
    <Text
      numberOfLines={1}
      className="max-w-full rounded-full bg-surface-3 px-2.5 py-1 text-label text-fg uppercase"
    >
      {children}
    </Text>
  );
}
