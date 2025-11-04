# Screens Audit — Otomatik Tarama Sonuçları

Tarih: 2025-11-04

Bu dosya otomatik tarama sonuçlarının kısa özetini içerir. Tarama `screens/` klasörü üzerinde
çeşitli desenler için (`console.*`, `TODO/FIXME`, inline hex renkler, `rgba(...)`, inline `style={{...}}`,
padding/margin sabitleri ve `StyleSheet.create` kullanımları) yapıldı. Aşağıda bulunan listeler örnek
bulunan dosya ve satır bilgilerini içerir — manuel inceleme için başlangıç noktaları sağlar.

Özet (yüksek seviye)
- `console.log`/`warn`/`error`/`debugger`: tespit edildi — bazıları performans/verbose debug amaçlı kalmış.
- `TODO` / `FIXME`: tarandı (bulunan yerler manuel incelenecek).
- Inline hex renkler (`#...`) ve `rgba(...)`: sıkça kullanılmış; bunlar `constants` içine taşınmalı veya tema bazlı
  token'larla değiştirilmeli.
- Inline JSX style objeleri (`style={{ ... }}`): birkaç yerde (özellikle `MoodTrend`, `Journal`, `ActiveProject`).
- `StyleSheet.create` kullanımı: birçok ekranda mevcut (ör. `TutorialScreen`, `MyDayScreen`, `Journal`, `ActiveProject`),
  bu iyi — inline stiller mümkünse StyleSheet veya constants token'lara taşınmalı.

Bulunan örnekler (kısa liste, tam liste repo içinde aramanızla elde edilebilir)

1) `console.*` örnekleri
- `screens/MyDayScreen.js` — birden fazla `console.log` / `console.error` (odaklanan proje load/save ile ilgili).
- `screens/TutorialScreen.js` — tutorial tamamlandığında/skip işlemlerinde `console.log` ve `console.warn`.
- `screens/MainScreen.js` — parent notification log'ları ve render error hata log'u.
- `screens/CompletedProjectsScreen.js` — performans ölçüm amaçlı `console.log` çağrıları.

2) `TODO` / `FIXME`
- (Tarama çıktılarınıza göre repo içinde bazı TODO/FIXME etiketleri var; manuel listeleme bir sonraki adım.)

3) Inline hex renk (`#rrggbb`) ve rgba örnekleri
- `screens/TutorialScreen.js`: gradient ve renk sabitleri (#8B5CF6, #10B981, vb.).
- `screens/overview.js`: geniş bir renk haritası ve fallback renk dizileri (çok sayıda `#...` kullanım).
- `screens/MyDayScreen.js`: mood renk mapping tabloları (birçok hex değer).
- `screens/Journal.js`, `screens/JournalDetailScreen.js`, `screens/MoodTrendScreen.js`, `screens/ActiveProject.js`: theme/dark-mode için birçok `rgba(...)` kullanımı.

4) Inline `style={{ ... }}` (hızlı örnekler)
- `screens/MoodTrendScreen.js` — popup ve bazı küçük layout blokları inline style ile yazılmış.
- `screens/JournalDetailScreen.js` — grid item container gibi bölgelerde inline style kullanılmış.
- `screens/Overview.js` — bazı geçici/şartlı stil kullanımları inline.

5) `StyleSheet.create` bulunan ekranlar (kısmi örnek)
- `screens/TutorialScreen.js`
- `screens/MyDayScreen.js`
- `screens/MoodTrendScreen.js`
- `screens/MainScreen.js`
- `screens/JournalDetailScreen.js`
- `screens/Journal.js`
- `screens/CompletedProjectsScreen.js`
- `screens/ActiveProject.js`

6) Padding / Margin sabiti kullanan örnekler (inline numeric kullananlar)
- `screens/MyDayScreen.js` — birden fazla sabit padding/margin kullanımı (ör. `padding: 32`, `padding: 20`).
- `screens/JournalDetailScreen.js` — `padding: 12` gibi değerler.
- `screens/AddProjectScreen.js` — `padding: 30`.

Öncelikli Öneriler (otomatik adımlar sonrası)
1. `console.*` ve `debugger` çağrılarını bir PR ile temizleyin (logların gerekliliği doğrulanmalı).
2. Inline hex renklerin büyük kısmını `constants/index.js` altındaki `COLORS` veya `MILESTONE_COLORS` olarak taşıyın.
3. Inline `style={{...}}` bloklarını `StyleSheet.create` veya küçük alt component'lere taşıyın.
4. `rgba(...)` ile dynamic opacity kullanımları için merkezi yardımcı fonksiyonlar veya theme token'ları oluşturun.
5. Kodmod/codemod: sık tekrar eden dönüşümler için `jscodeshift` script'leri hazırlayın (örneğin `'#8B5CF6' -> COLORS.PRIMARY`).

Sonraki adımlar önerisi
- İstersen şu sırayla ilerleyeyim:
  1) `console.*` temizliği için ilk küçük PR'ı hazırla (ben dosya listesi + patch çıkarırım).
  2) Renk tokenizasyonu: en çok tekrar eden 10 rengi constants'e taşıyıp 1 ekran üzerinde test edelim (ör. `TutorialScreen`).
  3) Inline style'ları tespit edip küçük PR'lar ile taşıyalım (günde 2–3 ekran).

Hazır olduğunda başlayalım — istersen ilk adım olarak `console.*` temizliğini otomatik liste halinde çıkarıp patch hazırlayayım.

---

Not: Bu dosya otomatik tarama sonuçlarının kısa özetidir; istersen daha ayrıntılı CSV/JSON çıktısı da üretebilirim (tüm satır referanslarıyla) ve onu da commit ederim.
