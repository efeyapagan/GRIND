# Çeviri kılavuzu (mobil + ortak paket)

Bu dosya, GRIND'de **kullanıcıya görünen metnin nasıl yazıldığını ve nasıl çevrildiğini** anlatır.
Yeni bir ekran yazarken ya da yeni bir dil eklerken **önce buraya bak**: hangi dosyada neyin
çevrildiği, hangi kuralların bağlayıcı olduğu ve neyin bilerek çevrilmediği burada.

İlgili issue'lar: #177 (web dilim 1: tr + en), **#263 (mobil: tr + en; sonraki dilimde fr/es/it/pt)**.
Bağlayıcı kurallar CLAUDE.md'nin **Çok Dil** bölümünde; bu dosya onun uygulama rehberi ve haritasıdır.

---

## 1. Tek kural: metin katalogdan gelir

Kullanıcıya görünen **hiçbir** metin kaynak dosyaya yazılmaz. Etiket, düğme, boş durum, hata,
onay mesajı, `accessibilityLabel`, `placeholder`, ekran başlığı — hepsi katalogdan `t(...)` ile gelir.

```tsx
// YANLIŞ
<Text className="text-body text-muted">Yükleniyor...</Text>

// DOĞRU
const { t } = useTranslation();
<Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>
```

**İstisna yok** demek değil: gerçekten çevrilmemesi gereken satır, satır sonuna `// i18n-muaf` ve
**kısa bir gerekçe** yazılarak işaretlenir. Bugün muaf olanlar:

| Yer | Neden |
|---|---|
| `throw new Error('useAuth, AuthProvider içinde...')` | Geliştirici hatası; kullanıcı hiç görmez |
| `DilSecici`'deki `Türkçe` / `English` | Dil adları her arayüz dilinde **kendi** dilinde yazılır |

---

## 2. Katalog nerede

| Dosya | Rolü |
|---|---|
| `packages/shared/src/i18n/tr.ts` | **Tek doğruluk kaynağı.** Anahtarları burası belirler |
| `packages/shared/src/i18n/en.ts` | `tr.ts`'in **tipini** taşır; eksik/fazla anahtar `tsc`'de hata |
| `packages/shared/src/i18n/dil.ts` | `Dil` tipi, `DILLER`, `dilAlgila` (cihaz dilinden seçim) |
| `packages/shared/src/i18n/i18n.ts` | i18next kurulumu, `i18nBaslat`, `useDil` |
| `packages/shared/src/i18n/katalog.test.ts` | Her dil aynı anahtar kümesini taşıyor mu |

Katalog **web ve mobil için ortaktır**. Mobil, web dilimi 1'de yazılmış anahtarların çoğunu olduğu
gibi kullanır — yeni bir anahtar açmadan **önce mevcut anahtarı ara**, büyük olasılıkla vardır.

```bash
grep -n "Yükleniyor" packages/shared/src/i18n/tr.ts
```

### Anahtar kuralları (CLAUDE.md'den, bağlayıcı)

- ASCII camelCase: `hicSablonYokBaslik` ✅, `hiçŞablonYok` ❌
- Grup = ekran/alan: `antrenman.*`, `sablonlar.*`, `olcumler.*`, `profil.*`, `gecmis.*`, `rekorlar.*`
- **İki+ dosyada** geçen metin `ortak.*`'ta (`ortak.kaydet`, `ortak.vazgec`, `ortak.yukleniyor`)
- Sayıya bağlı metin `_one` / `_other` ile **her iki katalogda**: `rekorlar.tekrarSayisi_one/_other`
- Değişken metin i18next enterpolasyonuyla: `antrenman.baslangic = 'Başlangıç {{saat}}'`
- **Modül seviyesinde `t(...)` çağrılmaz** — dil değişince o metin güncellenmez. Sabit listeler
  **anahtarı** tutar, metni bileşen çizerken üretir:

```tsx
// Sekme tanımı anahtar tutar (HareketGecmisi.tsx, web ile aynı)
const SEKMELER = [{ anahtar: 'agirlik', etiket: 'setGirdisi.agirlikEtiket', ... }] as const;
// ...çizerken
<Text>{t(aday.etiket)}</Text>
```

Bunun çalışması için liste `as const` olmalı; `etiket: string` yazılırsa `t()` tipli katalogda
anahtarı tanımaz.

---

## 3. Mobilde durum — hangi dosyada ne çevrildi

#263 dilim 1 ile **mobilin tamamı** katalogdan besleniyor. Aşağıdaki tablo, çeviri yapılan yerleri
ve o dosyanın hangi katalog grubunu kullandığını gösterir; yeni bir ekran eklerken komşusuna bak.

| Dosya | Katalog grubu |
|---|---|
| `app/login.tsx` | `giris.*`, `ortak.*` |
| `app/register.tsx` | `kayit.*`, `ortak.*` |
| `app/(tabs)/antrenman.tsx` | `antrenman.*`, `kabuk.*`, `ortak.yukleniyor` |
| `app/(tabs)/profile/history.tsx` | `gecmis.*` |
| `app/(tabs)/profile/records.tsx` | `rekorlar.*` |
| `app/(tabs)/profile/measurements.tsx` | `olcumler.*`, `ortak.*` |
| `app/(tabs)/profile/account.tsx` | `profil.*`, `dil.*` |
| `app/(tabs)/profile/edit.tsx` | `profil.*`, `ortak.*` |
| `app/(tabs)/templates/*.tsx` | `sablonlar.*` |
| `src/components/SablonFormu.tsx` | `sablonlar.*`, `ortak.*` |
| `src/components/HareketGecmisi.tsx` | `hareketGecmisi.*` |
| `src/components/SablonlaBasla.tsx` | `sablonlar.*` |
| `src/components/SetList.tsx`, `SetSatiri.tsx` | `setler.*` |
| `src/components/AntrenmanAltAlani.tsx` | `antrenman.*` |
| `src/components/KullaniciAdiPenceresi.tsx`, `SifreDegistirPenceresi.tsx` | `profil.*` |
| `src/components/GizlilikSeviyesiSecici.tsx`, `AntrenmanHedefiSecici.tsx` | `profil.*` |
| `src/components/YorumDiliSecici.tsx` | `yorumlar.*`, `ortak.kapat` |
| `src/components/PaylasimPenceresi.tsx`, `PaylasimKarti.tsx` | `paylasim.*`, `gecmis.setBirimi`/`saatBirimi`/`dakikaBirimi` |
| `src/ui/HareketSecici.tsx` | `antrenman.kategori.*` |
| `src/ui/SifreAlani.tsx`, `AuthLayout.tsx` | `ortak.*` |

### Dil seçimi ve kalıcılık

| Dosya | Rolü |
|---|---|
| `mobile/src/ui/DilContext.tsx` | Etkin dil, cihaz dilinden algılama, tercihin `SecureStore`'da saklanması (`grind.dil`) |
| `mobile/src/components/DilSecici.tsx` | Hesap ayarlarındaki seçici |
| `mobile/app/_layout.tsx` | `i18nBaslat(baslangicDili())` — ilk kare cihaz diliyle çizilir |

Tercih **cihazda** kalır, sunucuya gitmez (tema tercihiyle aynı gerekçe). Anahtar adı web'le
aynıdır: `grind.dil`.

---

## 4. Yeni bir ekran/metin eklerken — kontrol listesi

1. Metni `tr.ts`'e ekle; **aynı commit'te** `en.ts`'e İngilizcesini ekle. Bir dili boş bırakmak yok.
2. Mevcut bir anahtar varsa onu kullan (`grep` ile ara), yenisini açma.
3. Bileşende `const { t } = useTranslation();` → `t('grup.anahtar')`.
4. Tarih/sayı biçimi: `useDil()` + `packages/shared/src/lib/format.ts` yardımcıları. `tr-TR` gibi
   sabit yerel ayar yazma.
5. Testleri koş:
   - `npm run test --workspace @grind/shared` → `katalog.test.ts` (anahtar eşliği)
   - `npm run test --workspace mobile` → `src/cevrilmemisMetin.test.ts` (satır içi Türkçe kaldı mı)
6. **İki dilde de gözle bak**: Hesap ayarları → Dil → English.

---

## 5. Güvenlik ağları ve sınırları

| Test | Ne yakalar | Ne YAKALAMAZ |
|---|---|---|
| `packages/shared/src/i18n/katalog.test.ts` | Bir dilde olup diğerinde olmayan anahtar | Yanlış/kötü çeviriyi |
| `mobile/src/cevrilmemisMetin.test.ts` | Kaynak dosyada kalan **Türkçe harfli** metin | Türkçe karakter içermeyen Türkçe metni (`"Kaydet"`, `"Set ekle"`) |
| `tsc -b` | `en.ts`'in `tr.ts` tipinden sapması, geçersiz `t()` anahtarı | — |

**En önemli sınır:** `cevrilmemisMetin` testi `"Kaydet"`, `"Set ekle"`, `"Push"` gibi Türkçe
karakter içermeyen satır içi metni göremez. Bu yüzden gözle kontrol adımı (madde 4.6) atlanamaz.

### Bu sınır #263'te gerçekten ısırdı — bulunan sınıflar

Test yeşile döndükten **sonra** simülatörde İngilizceye geçilince şu metinler hâlâ Türkçe çıktı.
Hepsinin ortak özelliği: **Türkçeye özgü harf içermiyorlar.** Yeni ekran yazarken bu üç desene
ayrıca bak:

1. **Türkçe harfsiz düz metin:** `Antrenman hedefi`, `Devam ediyor`, `Hareket ekle`, `Kaydet`,
   `Seti sil`, `Hareketler`, `Egzersiz`, `Hedef set`, `Dinlenme`, `En uzun seri`, `Set silindi`,
   `Antrenman silindi`, `Ana sayfa`, `Boy`, `Kilo`, `Tekrar`, `Push Day`.
2. **Şablon dizesi içinde gömülü birim:** `` `${hareketSayisi} hareket` ``, `` `${n} set` ``,
   `` `${sira}. hareket` ``, `` `${saniye} sn` ``. Bunlar katalogda **çoğul anahtar** ister
   (`sablonlar.hareketSayisi_one/_other`, `setler.setSayisi_one/_other`) ya da enterpolasyonlu
   anahtar (`sablonlar.hareketOnEki = '{{sira}}. hareket'`).
3. **Modül seviyesindeki sabit listeler:** sekme/kategori/aralık tanımları. Metni değil
   **anahtarı** tutarlar (bkz. madde 2'deki `SEKMELER` örneği).

Pratik tarama (testin göremediğini yakalamak için, gözle kontrolden önce):

```bash
# JSX metin düğümlerinde kalan düz metin
grep -rnE ">[[:space:]]*[A-Za-z][A-Za-z ,.!?'-]{2,60}[[:space:]]*<" mobile/app mobile/src --include="*.tsx" | grep -v "\.test\."

# Şablon dizesine gömülü birim
grep -rnE '\$\{[^}]+\} (hareket|set|hafta|gun|antrenman|tekrar|sn|dk)' mobile/app mobile/src --include="*.tsx"
```

**Sembol ve birimler çevrilmez:** `placeholder="0"`, `placeholder="—"`, `kg`, `cm`, `%`.

### `i18nBaslat` aynı dile geçmez

`i18nBaslat(dil)` örnek zaten başlatılmışsa **dil gerçekten değiştiyse** `changeLanguage` çağırır.
Aynı dile geçmek no-op değildir: i18next asenkron bir dil değişimi başlatır ve **her**
`useTranslation` tüketicisini yeniden çizdirir. Mobilde `_layout.tsx` her açılışta cihaz diliyle
çağırdığı için bu, ağır ekranlarda ilk boyamayı geciktiriyordu (#263'te bir e2e testi bu yüzden
kırmızıya düştü).

---

## 6. Yeni bir DİL eklerken (fr / es / it / pt — #263 dilim 2)

1. `packages/shared/src/i18n/dil.ts`: `Dil` tipine ve `DILLER`'e ekle; `dilAlgila`'daki
   desteklenen dil kontrolünü genişlet (bugün `tr`/`en` sabit yazılı).
2. `packages/shared/src/i18n/<kod>.ts`: `tr.ts`'in **tipini** taşıyan yeni katalog
   (`export const fr: typeof tr = { ... }` deseni — eksik anahtar derlenmez).
3. `i18n.ts`: `resources` ve `supportedLngs`'e ekle, `kaynaklariTazele`'ye `addResourceBundle`
   satırını ekle (hot reload için).
4. `mobile/src/components/DilSecici.tsx`: `DIL_ADLARI`'na dilin **kendi dilindeki** adını ekle
   (`Français`, `Español`, `Italiano`, `Português`).
5. `katalog.test.ts` yeni dili otomatik kapsıyorsa ek iş yok; kapsamıyorsa listeye ekle.
6. Biçimlendirme: `format*` yardımcıları `dil`e göre dallanıyorsa yeni dili de ele almalı.

**Çeviri kaynağı:** makine çevirisi başlangıç noktasıdır, **gözden geçirilmeden merge edilmez**.
Özellikle antrenman terimleri (set, tekrar, RIR, hacim, seri) dile göre yerleşik karşılıkları olan
terimlerdir; birebir çeviri yanlış olur.

---

## 7. Bilerek ÇEVRİLMEYENLER

- **Hareket (egzersiz) adları.** `Exercise.Name` serbest metindir ve global hareketler İngilizce
  seed edilmiştir ("Bench Press", "Squat"). Katalog'a **taşınmaz** — #263 bunu açıkça yazıyor.
- **Kullanıcının girdiği veriler:** şablon adları, notlar.
- **Kategori adları Push / Pull / Legs.** Katalogda anahtarları var (`antrenman.kategori.Push`)
  ama iki dilde de aynı; yalnızca `Other` → "Diğer" çevrilir.
- **Backend hata metinleri.** Bugün sunucu Türkçe `detail` döndürüyor (CLAUDE.md, Çok Dil →
  Backend). İstemci bu metne **dayanmaz**: gösterdiği her mesajı kendi katalogundan üretir,
  `detail`'i yalnızca eşleşen anahtarı olmayan beklenmedik durumlarda gösterir.
- **AI (GRINDY) yorum içeriği ve export metni** — #199'un konusu.
