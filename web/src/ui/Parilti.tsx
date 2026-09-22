interface Props {
  /** `alt`: sekmenin alt cizgisinden yukari sonen serit. `daire`: ikonun arkasinda disa sonen hale. */
  bicim: 'alt' | 'daire';
}

const BICIM_SINIFI: Record<Props['bicim'], string> = {
  alt: 'inset-0 bg-linear-to-t from-accent/20 to-transparent',
  daire: 'left-1/2 top-1/2 size-12 -translate-1/2 rounded-full bg-radial from-accent/30 to-transparent to-70%',
};

/**
 * Aktif ogenin turuncu parlamasi (issue #243, kullanici referansi: kenarda `accent` ~%20'den
 * saydama sonen degrade). Saf dekorasyon: `aria-hidden`, tiklamayi yutmaz, metin tasimadigi icin
 * kontrasti etkilemez. Ebeveyn `relative` olmali; ustunde duracak icerik (ikon/metin) de
 * `relative` olmali ki parilti onun ALTINDA kalsin. `data-parilti` testlerin tutamagidir.
 */
export default function Parilti({ bicim }: Props) {
  return <span aria-hidden data-parilti className={`pointer-events-none absolute ${BICIM_SINIFI[bicim]}`} />;
}
