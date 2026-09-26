import { ScrollView } from 'react-native';
import { usePageTitle } from '@grind/shared/pageTitle';
import DevamEdenAntrenman from '../../src/components/DevamEdenAntrenman';
import Takvim from '../../src/components/Takvim';
import { useAltMenuPayi } from '../../src/ui/KabukTabBar';

/** web/src/pages/AnaSayfaPage.tsx ile ayni (issue #119/#120). */
export default function AnaSayfaScreen() {
  const altMenuPayi = useAltMenuPayi();
  usePageTitle('Ana sayfa');

  return (
    <ScrollView contentContainerClassName="gap-5 px-4 pt-2" contentContainerStyle={{ paddingBottom: altMenuPayi }}>
      {/* #412: acik antrenman karti EN ALTTA. #175'te takvimin USTUNDEydi ("ilk gorulen o olsun"),
          ama acik oturum sorgusu takvimden ayri bir anda cozuluyor: kart sonradan belirince altindaki
          her sey kayiyor ve takvim izgarasiyla haftalik ozet birbirine giriyordu. En altta oldugunda
          ustundeki hicbir sey onun gec gelmesinden etkilenmez. */}
      <Takvim />
      <DevamEdenAntrenman />
    </ScrollView>
  );
}
