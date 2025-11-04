<!--
  screens-audit.md
  Amaç: `screens/` klasöründeki tüm ekran dosyaları için güvenli, tekrarlanabilir bir audit ve optimizasyon rehberi.
  Bu doküman, her ekranın nasıl inceleneceğini, gereksiz kodun nasıl tespit edilip kaldırılacağını,
  stillerin `constants/index.js`'e nasıl taşınacağını ve küçük, güvenli PR'larla ilerleme yöntemini anlatır.
-->

# Screens Audit & Optimization Rehberi

Bu rehberin amacı, `screens/` klasöründeki kodları sistematik bir şekilde temizlemek, performans
ve okunabilirliği artırmak, ve merkezi stil sistemimiz (`constants/index.js`) ile entegre etmektir.

Hedefler
- Her ekran için: gereksiz / kullanılmayan kodu kaldır, büyük/karmaşık bölümleri parçala,
  referans edilebilecek stilleri `constants`'e taşı, ve performans optimizasyonları uygula.
- Proje genelinde tutarlılık: tüm ekranlar ortak token'ları kullanmalı (renk, spacing, tipografi).

Kapsam
- Tüm `screens/*.js(x)` dosyaları.
- Görevler: unused imports/vars silme, inline sabit renk/spacing tespiti, gereksiz console.log/koment bloklarını kaldırma, büyük komponent içi fonksiyonları yeniden düzenleme, FlatList/ScrollView optimizasyonu, Animated/Reanimated doğru kullanım kontrolleri.

Genel Kurallar (safety-first)
- Hook / Provider sıralamasına dokunmayın. Mevcut hook sıralarını bozacak değişikliklerden kaçının.
- Her değişiklik küçük ve tersine alınabilir olmalı (1 ekrandan fazla olmayan PR'lar tercih edin).
- Önce statik analiz (lint/grep), sonra manuel inceleme, sonra küçük kod değişiklikleri yapın.

Adım adım süreç

1) Hazırlık — otomatik tarama

  - grep/rg ile `screens/` içinde aşağıdakileri toplayın:
    - `console.log`, `console.warn`, `debugger`
    - `TODO:` veya `FIXME:` etiketleri
    - inline renk kodları (örn `#fff`, `rgba(`) ve inline `padding: 16` gibi constant'a taşınabilecek sabitler
    - unused imports (ESLint veya `eslint --print-config` + statik analiz ile)
    - büyük dosyalar (satır sayısı > 400) — gözden geçirilmek üzere işaretlenecek

2) Önceliklendirme

  - Kritik (öncelik 1): Başlatma/Root/Main ekranları, Navigation container'ı, hata üreten ekranlar.
  - Orta (öncelik 2): Sık kullanılan ekranlar (MyDay, ActiveProject, Journal vs.).
  - Düşük (öncelik 3): Daha az kullanılan veya arşiv ekranlar.

3) Ekran başına audit checklist (manuel)

  - Kullanılmayan import ve değişkenler var mı? (eslint hatalarını düzelt)
  - Konsol.log/debugger/remove? (prod'da kalmamalı)
  - Inline renk/spacings/font-size var mı? Eğer varsa token ekle veya map et.
  - Büyük render fonksiyonları: parçalanabilir mi? (ör. renderX alt fonksiyonları component olarak çıkarılabilir mi?)
  - FlatList/SectionList kullanılan yerlerde `keyExtractor`, `initialNumToRender`, `getItemLayout` var mı?
  - Animated kullanımı: useNativeDriver uygun mu? Reanimated vs RN Animated karışımı var mı?
  - Re-render kaynaklı maliyetler: büyük obje/array'ler map ediliyor mu? useMemo/useCallback kullanılabilir mi?
  - Stil objeleri inline mi? Eğer inline ise, constants veya StyleSheet'e taşı.

4) Değişiklik stratejisi (kademeli)

  - İlgili token `constants/index.js`'e eklenir (ör. `COLORS.TEXT_SECONDARY`, `SPACING.SM`).
  - Ekrandaki inline style veya sabit değer o token ile değiştirilir.
  - Optimizasyon: büyük hesaplamalar `useMemo`, callback'ler `useCallback`, component'ler `React.memo` ile sarılır.
  - Test: uygulamayı çalıştır, ilgili ekranı manuel test et (UI/işlevsellik/performans).
  - Commit: küçük, anlamlı mesaj; PR ile review iste.

Örnek migration adımı (örnek: `screens/ActiveProject.js`)

  1. Audit: `rg "#([0-9a-fA-F]{3,6})" screens/ActiveProject.js` — inline renkleri bul.
  2. Eğer `#F5F5F5` bulunduysa, `constants/index.js` içine `COLORS.SURFACE = '#F5F5F5'` ekle.
  3. Dosyada `backgroundColor: '#F5F5F5'` satırını `backgroundColor: COLORS.SURFACE` ile değiştir.
  4. Eğer bir style objesi inline ise `StyleSheet.create` içinde tanımlayıp referans ver.
  5. Eğer eklenen token gereksizse rollback yap.

Araçlar & otomasyon önerileri

- Linters: `eslint` + `eslint-plugin-unused-imports` + proje kuralları.
- Kod araması: `rg` veya `git grep` hızlı taramalar için.
- Codemod: `jscodeshift` ile sık tekrarlanan değişiklikleri otomatikleştirebilirsiniz (ör. inline renk -> COLORS.*).
- Pre-commit/CI: `husky` + `lint-staged` ile commit öncesi statik kontroller.

Örnek jscodeshift dönüşümü (basit örnek)

```js
// jscodeshift: replace inline hex colors with COLORS.PRIMARY when matched
// (Not a production-ready script; örnek amaçlıdır.)
module.exports = function(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  root.find(j.Literal, { value: '#8B5CF6' })
    .replaceWith(() => j.identifier('COLORS.PRIMARY'));

  return root.toSource();
};
```

PR Checklist (ekran PR'ları için)

- [ ] Sadece ilgili ekran/komponent değişikliği var (aset/boilerplate dışında minimal değişiklik).
- [ ] ESLint/TypeScript hatası yok.
- [ ] Görsel testler (manuel) yapıldı ve ana akışlar çalışıyor.
- [ ] console.* ve debugger satırları kaldırıldı.
- [ ] Yeni token eklendiyse `constants/index.js` açıklaması güncellendi.

Riskler & Kaçınma

- Büyük tek commitler yerine küçük, ekran bazlı PR'lar açın.
- Hook sıralamasını değiştirmeyin.
- Native modüller / platform spesifik kodlarda dikkatli olun (Android/iOS farkları).

Örnek görev listesi (her ekran için)

- [ ] `screens/NAME.js` — audit: unused imports, inline colors, console logs
- [ ] `screens/NAME.js` — extract styles to `StyleSheet.create` and constants
- [ ] `screens/NAME.js` — performance: memoize heavy computations
- [ ] `screens/NAME.js` — tests/manual verify

Plan & zamanlama önerisi

- 1–2 gün: otomatik tarama, öncelik listesi oluşturma (kritik ekranlar belirleme)
- 1–2 hafta: sırayla ekranları küçük PR'larla migrate etme (günde ~2-3 ekran hedefi)

Sonuç

Bu rehber ile `screens/` klasörünü adım adım temizleyip, merkezi stil sistemimize entegre ederek
hem kod kalitesini hem de UI tutarlılığını artırabiliriz. İstersen şimdi otomatik taramayı çalıştırıp
öncelik listesini oluşturmaya başlayabilirim (örn. `rg` ile inline renk/console.log taraması) — devam etmemi ister misin?
