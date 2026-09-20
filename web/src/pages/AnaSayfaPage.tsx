import DevamEdenAntrenman from '../components/DevamEdenAntrenman';
import Takvim from '../components/Takvim';
import { usePageTitle } from '../ui/PageTitleContext';

/**
 * Ana Sayfa (issue #119/#120): eski "Bugün" ekranının takvim/istatistik kısmı -- antrenman
 * başlatma/devam etme artık burada DEĞİL, alt menüdeki "+" ile açılan ayrı bir sayfada
 * (`AntrenmanPage`). Bu ayrım bilinçli: Ana Sayfa genel bakış (seri, katılım) için, "+" sayfası
 * antrenmanın kendisi için -- ikisini aynı ekranda tutmak "hangi düğmeye basınca ne olacağı"
 * belirsizliği yaratırdı.
 */
export default function AnaSayfaPage() {
  usePageTitle('Ana sayfa');

  return (
    <div className="flex flex-col gap-5 pt-2">
      {/* #175: açık antrenman takvimin ÜSTÜNDE -- sekme yeniden açıldığında ilk görülen budur. */}
      <DevamEdenAntrenman />
      <Takvim />
    </div>
  );
}
