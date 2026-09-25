import type { Egzersiz } from '../api/queries';
import HareketSecici from '../ui/HareketSecici';

interface Props {
  // Antrenmanda OLMAYAN secilebilir hareketler; filtreyi sayfa yapar.
  egzersizler: readonly Egzersiz[];
  onSec: (exerciseId: number) => void;
  onKapat: () => void;
}

/**
 * "Hareket ekle" (#62): antrenmanin altindaki alanda YALNIZCA hareket secilir -- agirlik, tekrar ve RIR
 * yoktur; set, eklenen harekete (karta) dokununca girilir. Arama #48'in `HareketSecici`'siyle; secici
 * acilir acilmaz odaklanir ve listesi yukari acilir (panel ekranin altinda).
 */
export default function HareketEklePaneli({ egzersizler, onSec, onKapat }: Props) {
  return (
    // Panelin TEK icerigi arama satiri: uzerinde bir baslik/etiket satiri varken yukari acilan liste
    // onu ortuyor ve "duzgun acilmiyor" gorunumu veriyordu (kullanici bulgusu). Kapatma dugmesi de bu
    // yuzden etikete degil, arama alaninin ICINE konuldu -- liste orayi ASLA ortmez.
    <div className="flex flex-col gap-2">
      <HareketSecici
        id="hareket-ekle"
        egzersizler={egzersizler}
        secilenId={0}
        secilenAd=""
        onSec={onSec}
        otomatikOdak
        listeYukari
        onKapat={onKapat}
      />
    </div>
  );
}
