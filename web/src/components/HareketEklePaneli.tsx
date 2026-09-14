import { X } from 'lucide-react';
import type { Egzersiz } from '../api/queries';
import HareketSecici from '../ui/HareketSecici';
import IkonDugmesi from '../ui/IkonDugmesi';

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
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="hareket-ekle" className="pl-1 text-label text-muted uppercase">
          Hareket ekle
        </label>
        <IkonDugmesi etiket="Hareket eklemeyi kapat" onClick={onKapat}>
          <X aria-hidden size={20} />
        </IkonDugmesi>
      </div>
      <HareketSecici
        id="hareket-ekle"
        egzersizler={egzersizler}
        secilenId={0}
        secilenAd=""
        onSec={onSec}
        otomatikOdak
        listeYukari
      />
    </div>
  );
}
