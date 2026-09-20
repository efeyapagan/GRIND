import { ScrollView } from 'react-native';
import { usePageTitle } from '@grind/shared/pageTitle';
import DevamEdenAntrenman from '../../src/components/DevamEdenAntrenman';
import Takvim from '../../src/components/Takvim';

/** web/src/pages/AnaSayfaPage.tsx ile ayni (issue #119/#120). */
export default function AnaSayfaScreen() {
  usePageTitle('Ana sayfa');

  return (
    <ScrollView contentContainerClassName="gap-5 px-4 pt-2 pb-4">
      {/* #175: acik antrenman takvimin USTUNDE -- uygulama yeniden acildiginda ilk goruleni budur. */}
      <DevamEdenAntrenman />
      <Takvim />
    </ScrollView>
  );
}
