import { Pressable, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTakipEt, type TakipIliskisi } from '@grind/shared/api/queries';
import { takipDugmesi } from '@grind/shared/lib/takip';

const BOYUT = { normal: 'h-10 flex-1 px-3', kucuk: 'h-9 px-3' } as const;

/** web/src/components/TakipDugmesi.tsx ile ayni (#284): iliskiden cizilir, sonuc sunucudan tazelenir. */
export default function TakipDugmesi({
  kullaniciAdi,
  iliski,
  boyut = 'normal',
}: {
  kullaniciAdi: string;
  iliski: TakipIliskisi;
  boyut?: keyof typeof BOYUT;
}) {
  const { t } = useTranslation();
  const takip = useTakipEt();
  const dugme = takipDugmesi(iliski);
  if (!dugme) {
    return null;
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        disabled={takip.isPending}
        onPress={() => takip.mutate({ kullaniciAdi, takipEt: dugme.takipEt })}
        className={`items-center justify-center rounded-xl ${BOYUT[boyut]} ${
          dugme.takipEt ? 'bg-accent' : 'bg-surface-3'
        } ${takip.isPending ? 'opacity-60' : ''}`}
      >
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
