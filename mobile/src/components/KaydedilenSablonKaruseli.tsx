import { FlatList, type View } from 'react-native';
import type { Sablon } from '@grind/shared/api/queries';
import { sablonOzeti } from '@grind/shared/lib/sablonOzeti';
import SablonKayitliKarti from '../ui/SablonKayitliKarti';
import { useOndekiKart } from '../ui/useOndekiKart';

interface Props {
  /** Sira cagirandan gelir (`sablonlariAyir`: once sabitlenenler, sonra son kullanim). */
  sablonlar: readonly Sablon[];
  kartGenisligi: number;
  aralik: number;
  onKart: (sablon: Sablon) => void;
  onMenu: (sablon: Sablon) => void;
  kartRef: (id: number) => (kart: View | null) => void;
  disabled: boolean;
  /** Verilirse her kartta sabitleme dugmesi durur (kaydedilenler ekrani). */
  onSabitle?: (sablon: Sablon) => void;
}

/**
 * #538: kaydedilen sablonlar "Sablonlarim" karuseli gibi yana kayar. Surukleyerek siralama yok --
 * sira sabitleme ve son kullanimdan gelir. Yatay FlatList ekran disindaki kartlari mount etmez, bu
 * yuzden figur animasyonlari sablon sayisiyla artmaz (#556).
 *
 * #606: varsayilan pencere birkac sablonla pratikte butun kartlari mount ediyordu; figur artik yalnizca
 * ondeki kartta oynar (`useOndekiKart`, Sablonlarim karuseliyle ayni).
 */
export default function KaydedilenSablonKaruseli({
  sablonlar,
  kartGenisligi,
  aralik,
  onKart,
  onMenu,
  kartRef,
  disabled,
  onSabitle,
}: Props) {
  const sira = kartGenisligi + aralik;
  const [ondeki, ondekiniGuncelle] = useOndekiKart(sira, sablonlar.length);
  return (
    // Kartlar ekran kenarina kadar kayar: ebeveynin 16'lik yan boslugu burada geri alinip icerige verilir.
    <FlatList
      testID="kaydedilen-karuseli"
      data={sablonlar}
      keyExtractor={(sablon) => String(sablon.id)}
      extraData={ondeki}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={sira}
      decelerationRate="fast"
      scrollEventThrottle={16}
      onScroll={ondekiniGuncelle}
      className="-mx-4"
      contentContainerClassName="px-4"
      contentContainerStyle={{ gap: aralik }}
      renderItem={({ item: sablon, index: indeks }) => (
        <SablonKayitliKarti
          ref={kartRef(sablon.id)}
          ad={sablon.name}
          kaynakKullaniciAdi={sablon.savedFromUsername}
          ozet={sablonOzeti(sablon)}
          genislik={kartGenisligi}
          onBasla={() => onKart(sablon)}
          onMenu={() => onMenu(sablon)}
          disabled={disabled}
          onSabitle={onSabitle && (() => onSabitle(sablon))}
          sabitli={sablon.isPinned}
          figurCanli={indeks === ondeki}
        />
      )}
    />
  );
}
