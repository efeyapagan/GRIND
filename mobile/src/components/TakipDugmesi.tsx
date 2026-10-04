import { Pressable, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react-native';
import { useTakipEt, type TakipIliskisi } from '@grind/shared/api/queries';
import { takipDugmesi, takipMenusuAcilir } from '@grind/shared/lib/takip';
import CamDolgu from '../ui/CamDolgu';
import { useIkonRenk } from '../ui/renkler';

const BOYUT = { normal: 'h-10 flex-1 px-3', kucuk: 'h-9 px-3' } as const;

/** web/src/components/TakipDugmesi.tsx ile ayni (#284): iliskiden cizilir, sonuc sunucudan tazelenir. */
export default function TakipDugmesi({
  kullaniciAdi,
  iliski,
  boyut = 'normal',
  onMenu,
}: {
  kullaniciAdi: string;
  iliski: TakipIliskisi;
  boyut?: keyof typeof BOYUT;
  /** #628: verilirse takip ederken düğme "Takiptesin ⌄" olur ve kişi menüsünü açar. */
  onMenu?: () => void;
}) {
  const { t } = useTranslation();
  const ikonRenk = useIkonRenk();
  const takip = useTakipEt();
  const dugme = takipDugmesi(iliski);
  if (!dugme) {
    return null;
  }

  // #628: takip ediyorsan ve menü veriliyse doğrudan bırakmak yerine "Takiptesin ⌄" kişi menüsünü açar.
  if (onMenu && takipMenusuAcilir(iliski)) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('takip.takiptesin')}
        onPress={onMenu}
        className={`flex-row items-center justify-center gap-1 rounded-xl ${BOYUT[boyut]} bg-transparent`}
      >
        <CamDolgu opaklik={0.1} yaricap={12} />
        <Text className="text-label text-fg">{t('takip.takiptesin')}</Text>
        <ChevronDown color={ikonRenk.fg} size={16} />
      </Pressable>
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        disabled={takip.isPending}
        onPress={() => takip.mutate({ kullaniciAdi, takipEt: dugme.takipEt })}
        className={`items-center justify-center rounded-xl ${BOYUT[boyut]} ${
          dugme.takipEt ? 'bg-accent' : 'bg-transparent'
        } ${takip.isPending ? 'opacity-60' : ''}`}
      >
        {/* #591: "Takibi birak" opak `surface-3` kutu degil hafif dolgu (IkincilDugme ile ayni dil). */}
        {!dugme.takipEt && <CamDolgu opaklik={0.1} yaricap={12} />}
        <Text className={`text-label ${dugme.takipEt ? 'font-bold text-on-accent' : 'text-fg'}`}>
          {t(dugme.etiketAnahtari)}
        </Text>
      </Pressable>
      {takip.isError && (
        <Text accessibilityRole="alert" className="text-label-xs text-danger">
          {t('takip.islemYapilamadi')}
        </Text>
      )}
    </>
  );
}
