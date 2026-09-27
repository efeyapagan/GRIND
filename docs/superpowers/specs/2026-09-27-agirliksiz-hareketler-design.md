# Ağırlıksız hareketler: tekrar ve süre ölçümü (#346)

**Durum:** Onaylandı (2026-09-27) · **Kapsam:** backend + `packages/shared` + `mobile/` (web donduruldu, #326)

## Sorun

Her set `Weight + Reps + Rir` kalıbında tutuluyor. Crunch, Leg Raise gibi karın hareketlerinde kg ve RIR
anlamsız, Plank gibi tutuşlarda tekrar da anlamsız — hedef süredir. Bugün bu hareketler `0 kg × n` diye
kaydediliyor; rekor rozeti "ağırlık rekoru" diyor, grafikler 0 kg çiziyor, export "0 kg × 20" yazıyor.

## Karar 1 — Ölçüm tipi harekete ait

`Exercise.Measurement` (`ExerciseMeasurement`, adıyla saklanır, varsayılan `WeightReps`):

| Tip | Örnek | Set girişi | Rekor |
|---|---|---|---|
| `WeightReps` | Bench, Squat, Pull-up | kg + tekrar + RIR (bugünkü) | ağırlık / aynı kg'da tekrar (değişmedi) |
| `Reps` | Crunch, Leg Raise, Russian Twist | tekrar + isteğe bağlı **ek ağırlık** (boş = 0) — RIR yok | ilk set ve aynı kg'da daha çok tekrar = tekrar rekoru; daha fazla ek ağırlık = ağırlık rekoru |
| `Duration` | Plank, Hollow Hold, Dead Hang | yalnızca süre (sn) — kg, tekrar, RIR yok | en uzun süre (`RecordType.Duration`) |

Tip sete değil harekete bağlı: arayüz hareketi seçtiği anda hangi alanları çizeceğini bilir. Kullanıcı kendi
hareketini oluştururken tipi seçebilir (`CreateExerciseRequest.Measurement`, isteğe bağlı); güncelleme uçları
tipi değiştirmez (geçmiş setlerle çelişki doğmasın). Mobilde hareket oluşturma arayüzü olmadığı için alan
yalnızca API'de.

Kapsam dışı: Pull-up/Dips/Push-up `WeightReps` kalır (weighted varyasyonlar). Ağırlıklı tutuşlar
(Barbell Hold, Pallof Hold) için dördüncü bir tip açılmadı, onlar da `WeightReps` kalır.

## Karar 2 — Set şeması

- `SetEntry.Reps` → `int?`, yeni `SetEntry.DurationSeconds int?` (1–3600).
- Check: `(Reps > 0 AND DurationSeconds IS NULL) OR (Reps IS NULL AND DurationSeconds > 0)`.
- Servis doğrulaması hareketin tipine göre (`SetEntryService`):
  - `WeightReps`: ağırlık ve tekrar zorunlu, süre yasak.
  - `Reps`: tekrar zorunlu, ağırlık boşsa 0, RIR ve süre yasak.
  - `Duration`: süre zorunlu; tekrar, RIR ve 0'dan büyük ağırlık yasak (ağırlık 0 saklanır).
- `CreateSetRequest.Weight` artık `[Required]` değil — zorunluluğu tipe bağlı olduğu için servis denetler.
- PATCH de aynı kurallarla doğrulanır.

**Eski kayıtlar:** Plank / Side Plank / karın hareketlerine daha önce girilmiş `0 kg × n` setlere dokunulmaz.
Gösterim setin kendi değerlerine bakar (süre varsa süre, yoksa kg × tekrar), bu yüzden eski setler eskisi
gibi görünür. `Duration` rekor takibi süresi olmayan eski setleri yok sayar.

## Karar 3 — Rekor, istatistik, export

- `RecordTracker` tek karar noktası olarak kalır (CLAUDE.md DRY), kurucuya ölçüm tipini alır.
- kg hacmi `Weight × (Reps ?? 0)`: süreli setler hacme 0 katar, ağırlıksız tekrarlar zaten 0'dır.
- 1RM tahmini ve plato tespiti yalnızca `WeightReps` hareketlerinde.
- Rekorlar özeti (`ExerciseRecordResponse`) `Measurement`, `BestDurationSeconds`, `BestDurationAt` taşır;
  `Duration` hareketinde özet yalnızca süreli setlerden kurulur.
- İlerleme noktası (`ExerciseProgressPointResponse`) `BestReps` ve `BestDurationSeconds` taşır; mobil grafik
  `Reps` hareketinde yalnızca "Tekrar", `Duration` hareketinde yalnızca "Süre" sekmesi çizer.
- Export/AI metni: `20 tekrar`, `+5 kg × 20`, `45 sn`; `[PR: süre]`.
- Rekor bildirimi süreli seti "45 sn" diye yazar.

## Karar 4 — Mobil set girişi

- Tip `useExercises` önbelleğinden okunur (#413'teki ekipman ibaresiyle aynı yol, yeni istek yok).
- `Reps`: tekrar alanının yanında isteğe bağlı "Ek ağırlık" kutusu; RIR çizilmez.
- `Duration`: **kronometre** — "Başlat" ile süre saymaya başlar (zaman damgası tabanlı, uygulama arka plana
  geçse de doğru kalır), "Durdur" geçen süreyi saniye kutusuna yazar; kutu elle de düzeltilebilir. Set
  kaydedilince dinlenme sayacı her zamanki gibi başlar.
- Tekrarı uygulama saymaz (sensörsüz güvenilir değil); tekrar elle girilir.
- Set düzenleyici aynı alanları gösterir (kronometresiz).

## Karar 5 — Hareket havuzu

Yeni `Reps`: Bicycle Crunch, Side Crunch, Sit-up, V-up, Heel Touch, Toe Touch, Flutter Kicks,
Scissor Kicks, Mountain Climber, Dead Bug, Bird Dog, Jackknife Sit-up, Windshield Wiper, Dragon Flag.
Yeni `Duration`: Hollow Body Hold, L-Sit, Dead Hang, Wall Sit.
Mevcutlardan `Reps`: Crunch, Decline Bench Crunch, Reverse Crunch, Lying/Hanging Leg Raise, Hanging Knee Raise,
Captain's Chair Leg Raise, Russian Twist, Ab Rollout, Side Plank Rotation. `Duration`: Plank, Side Plank.

Migration notu: `ExerciseMeasurement` 1'den başlar. Kolonun varsayılanı olduğu için EF, CLR varsayılanına (0)
eşit seed değerini "verilmedi" sayıyor ve seed güncellemesinde geçersiz bir `UPDATE ... SET WHERE`
üretiyordu; değerler adıyla saklandığı için sayısal karşılıklar veritabanını etkilemez.
