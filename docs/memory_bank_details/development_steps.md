# Memory Bank — Geliştirme Adımları

Aşağıda sizin belirttiğiniz ihtiyaçlara (My Day ekranına fotoğraf/vidyo desteği, gereksiz kod temizliği, yayın öncesi bildirim/backend testleri, merkezi styles bileşeni, performans/stabilite iyileştirmeleri) yönelik somut, önceliklendirilmiş ve test edilebilir adımlar yer almaktadır.

Önceliklendirme (ilk 3)
- 1: MyDay fotoğraf & video desteği (kullanıcı deneyimi ve veri modeli) — yüksek etki, kullanıcı görünür.
- 2: Styles komponenti oluşturma ve en büyük ekranların stillerini taşıma — hızla tekrarı azaltır ve theming kolaylığı getirir.
- 3: Yayın öncesi bildirim + backend testleri — risk azaltma, canlıya geçiş güvenliği.

Adım 1 — Journal: Fotoğraf ve video ekleme (detaylı)

- Durum: Tamamlandı ✅
- Plan:
  1. UI: `screens/Journal.js` üzerine mevcut medya düğmesi bir modal açacak. bu modal da camera ve galery özet kutuları olacak. Özet medayadan kullanıcı hızlı seçim yapabilir veya galeriyi açmayı tercih edebilir olacak. Kamera düğmesi fotoğraf ve video için kamerayı açabilecek. 
  2. Permissions: Kullanılan `PermissionManager` üzerinden camera, microphone ve media-library izinlerini isteme akışını ekle.
  3. Picker/Camera: Mevcut `expo-image-picker` kullanımını referans alarak video pick/capture (`launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos })`) ve image capture ekle.
  4. Upload: Yeni yardımcı modül `services/MediaUploadService.js` oluştur —  görev: local temp -> Firebase Storage yükleme, küçük thumbnail üretimi (video için), geri dönen public URL'leri journal entry ile ilişkilendirme.
  5. Firestore: `services/FirestoreService.saveJournalEntry` ya da proje-journey yazan helper'ı genişletip `media` alanını destekle (array of { url, type, mime, width, height, duration, size, thumbUrl }).
  6. Preview/Playback: `JournalDetailScreen` ve `Journal` edit modal'ında resim & video gösterimi; videolar için `expo-av` veya benzeri oynatıcı kullan, lazy load ve small thumbnail listesi göster.
  7. Tests / QA: Manuel test senaryoları (Android/iOS/Expo Go) ve küçük bir birim testi `services/test_media_upload.js` (local mock uploader).

Adım 2 — Merkezi Styles komponenti
- Plan:
  1. Yeni dosya: `components/Styles.js` (veya `styles/Theme.js`) oluştur. İçerik: renk paleti (colors), spacing, typography (fontSizes, fontWeights), commonContainers, buttons, shadows, and helpers (e.g., rowCenter, absoluteFill).
  2. Hedef 5 yüksek-öncelikli dosyada hızlı migrate: `screens/MyDayScreen.js`, `screens/Journal.js`, `screens/MainScreen.js`, `components/JournalCard.js`, `components/MileStone.js` — inline StyleSheet'leri referanslara çevir.
  3. Kademeli geçiş: her dosyayı ayrı commit/PR ile taşı; küçük difflarla ilerle (rebase-safe).

Adım 3 — Dead-code arama ve temizleme
- Plan:
  1. Otomatik tarama: grep/rg ile büyük tokenler — e.g., "TODO", commented-out blocks over X lines, "/* deprecated" , unused imports (ESLint/TS hints), large commented chunks.
  2. Manuel inceleme: komponent başına 1–2 satır risk değerlendirmesi yap (yedeği branch'te bırak).
  3. Küçük PR'lar ve tests: her kaldırma için smoke test (app açılışı/ana akış).
  4. Backups: büyük dosyalar veya belirsiz kullanımda, taşı yerine `filename.deprecated.js` klasörüne taşı.

Adım 4 — Yayın öncesi Bildirim ve Backend Testleri
- Plan:
  1. FCM: `services/FCMService.js` içindeki debug token helper'ları kullanarak cihazlara test mesajı gönder. Testleri hem foreground hem background senaryolarında çalıştır.
  2. Firestore write/read: `backend/test_*` betiklerini çalıştırıp gerçek test projelerinde veri doğrulaması yap.
  3. Cron/Backend: `backend/` içindeki cron job testleri (ör. `send_deadline_notifications.py`) local veya staging servis hesabı ile çalıştır.
  4. Otomasyon: Kısa bir PWsh script'i ile bu testleri seri çalıştırıp rapor üreten küçük runner yaz (ör. `scripts/preflight_tests.ps1`).

Adım 5 — Performans ve stabilite iyileştirmeleri
- Plan:
  1. Profiling: React DevTools/Flipper/console.time ile render hotspot'ları tespit et.
  2. Optimizations: memoization (React.memo, useMemo, useCallback), FlatList optimizasyonu (getItemLayout, keyExtractor), avoid inline objects/arrays in props.
  3. Reanimated: complex animations move to native-friendly patterns, avoid heavy JS work in animation frames.
  4. Add lightweight runtime checks: e.g., warn when large images (> 5MB) are about to be uploaded.

QA / Acceptance criteria (per feature)
- Media support: capture/upload works on Android/iOS, media URLs stored in Firestore, preview/playback functions without crashes on medium devices.
- Styles migration: no visual regressions on top 5 migrated screens (manual review + screenshot diff if desired).
- Dead-code cleanup: no runtime errors after removal; each removal validated by smoke test.
- Notification/backend tests: test script finishes with green status for staging credentials.
- Performance: App cold-start / MyDay render time should not regress; target measurable improvements per change (e.g., reduce MyDay render time by X% — to be measured).

İlerleyiş önerisi
- İlk 2 gün: MyDay medya UI + Permission flow + local preview (no upload). Create `MediaUploadService` stub.
- Gün 3–5: Storage upload, Firestore field additions, preview & playback. Start styles component and migrate 1–2 screens.
- Gün 6–8: Dead-code scan & safe removals, start pre-release test scripts.
- Sonraki hafta: stabilization, perf optimizations and a final smoke-run.

Eğer onay verirseniz, ilk olarak küçük bir PR ile `components/Styles.js` stub dosyasını oluşturup repo'ya ekleyebilirim ve ardından `docs/memory_bank_details/development_steps.md` dosyasını oluşturduğuma dair todo'yu tamamlayıp `MyDay` için gerekli arama/edits aşamasına geçerim.
