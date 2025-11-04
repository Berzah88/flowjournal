<!--
  standardstyles.md
  Amaç: Proje genelinde stil ve tasarım token'larının nasıl organize edileceğine dair rehber.
  Bu dosya, `constants/index.js` içindeki token'ları genişletmek ve ekip içinde tutarlı bir stil uygulaması sağlamak
  için başlangıç noktasıdır.
-->

# Standard Styles Rehberi

Bu dokümanın amacı, proje genelinde stil standardizasyonunu artırmak ve `constants/index.js` içindeki
token setlerini nasıl genişleteceğimize dair açık, uygulanabilir kurallar sağlamaktır.

Özet
- Amaç: UI tutarlılığı, erişilebilirlik, yeniden kullanılabilirlik ve kolay bakım.
- Kapsam: Renk paleti, tipografi, spacing (boşluklar), border-radius, elevation/shadow, animasyon süreleri,
  buton/ikon/medya boyutları ve erişilebilirlik etiketleri.
- Hedef: Tüm ekranlar ve component'ler `constants` üzerinden token kullanacak şekilde migrated / refactor edilecek.

Neden merkezileştirilmiş tokenler?
- Tek bir kaynak: renk, tipografi ve boşluk değerleri projede tek bir yerden yönetilir.
- Değişiklikler hızlıdır: Tasarım güncellemeleri tek dosyada / token'da yapılır.
- Kod okunabilirliği: `constants` üzerinden `SPACING.MD` ya da `COLORS.PRIMARY` kullanımı intent'i açıklar.

Konvansiyonlar

- Dosya: `constants/index.js` ana token deposu olacak. Daha büyük projelerde `constants/colors.js`,
  `constants/typography.js` gibi modüller ayrılabilir.
- İsimlendirme: TAMAMLANMIŞ_SNAKE_CASE (`SPACING.MD`, `BORDER_RADIUS.LG`) veya PascalCase objeler
  (ör. `Typography`, `COLORS`) kullanılabilir; mevcut kodla uyumlu kalın.
- Ölçekler: Spacing ve font-size gibi ölçekler sabit adımlarla (XS, SM, MD, LG, XL) tanımlanacak.
- Renkler: Semantik renkleri (PRIMARY, BACKGROUND, SURFACE, TEXT, MUTED, ERROR, SUCCESS, WARNING) içerecek.
- Erişilebilirlik: Renk kontrastı ve minimum font-size/gösterim kuralları belirtilecek.

Önerilen Token Listesi (başlangıç)

- COLORS
  - PRIMARY, SECONDARY, BACKGROUND, SURFACE, TEXT_PRIMARY, TEXT_SECONDARY, MUTED, BORDER, ERROR, SUCCESS, WARNING
- FONTS / TYPOGRAPHY
  - a) Font ailesi isimleri (FONTS.REGULAR, FONTS.MEDIUM, FONTS.BOLD)
  - b) Typography.roles örn: Typography.heading, Typography.body, Typography.small
  - c) Font-size scale: FONT_SIZES.SM, MD, LG, XL
- SPACING
  - XS, SM, MD, LG, XL, XXL
- BORDER_RADIUS
  - SM, MD, LG, XL, FULL
- ELEVATION / SHADOW
  - ELEVATION.SM, MD, LG
- ANIMATION_DURATIONS
  - FAST, NORMAL, SLOW
- ACCESSIBILITY_LABELS
  - ortak string anahtarları (ADD_PROJECT, SAVE_JOURNAL, vb.)

Kod Örneği (kısa kullanım)

```js
import { COLORS, SPACING, FONTS, Typography } from '../constants';

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.SURFACE,
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    shadowColor: COLORS.BLACK,
  },
  title: Typography.heading,
});
```

Geçiş / Migration Stratejisi

1. Audit: Hangi dosyaların inline değer veya local `styles.js` kullandığını tespit et.
2. Token Ekleme: `constants/index.js`'e gerekli token'ları ekle (ör: TEXT_SECONDARY veya BORDER_RADIUS.MD).
3. Kademeli Değişim: Birer component/ekran al, stil referanslarını constants üzerinden kullanacak şekilde değiştir.
4. Test: Görsel regresyon ve erişilebilirlik kontrolü (özellikle kontrast).
5. Commit ve PR: Her küçük migration için açıklayıcı commit/pull request aç.

Enforcement & Araçlar

- ESLint kuralları: `no-restricted-syntax` veya proje içi kod kurallarıyla inline sabit renk kullanımını engelle.
- Pre-commit: `husky` + `lint-staged` ile `eslint --fix` ve kısa statik kontrol çalıştır.
- Codemod: Birden çok dosya için `jscodeshift` betikleri hazırlanarak otomatik dönüşümler yapılabilir.
- Storybook: Bileşenleri izole test etmek ve token değişikliklerinin etkisini kontrol etmek için Storybook faydalıdır.

Erişilebilirlik (Accessibility)

- Renk kontrastı: Metin/arka plan kombinasyonları WCAG AA kriterlerini sağlamalıdır.
- Minimum font-size: Body metinleri için minimum 14sp önerilir (mobil için).
- Erişilebilirlik etiketleri: Buton, input, görseller için `accessibilityLabel` ve uygun role'ler kullanın.

PR Checklist (Her token değişikliği veya migration PR'ı için)

- [ ] Yeni token eklenmişse `constants/index.js` güncellendi ve açıklama eklendi.
- [ ] İlgili ekran/component test edildi (manuel görsel kontrol veya otomatik görüntü testi).
- [ ] Erişilebilirlik kontrastı kontrol edildi.
- [ ] Commit mesajı açıklayıcı ve küçük parçalara bölünmüş.

Geliştirme Fikirleri / Uzatma Alanları

- Tema desteği: `ThemeContext` ile dark/light token setleri sağlanması.
- Design tokens JSON: Tasarım ekibiyle paylaşılıp token'ların bir JSON manifestte tutulması.
- Otomatik görsel regression: Chromatic veya Percy ile token değişimlerinin UI üzerindeki etkilerini yakalamak.
- Tipler: Typescript ile token objeleri için tip güvenliği eklemek.

Sonuç

Bu doküman başlangıç seviyesinde rehberlik sağlar. Bir sonraki adım olarak hangi token'ları önceliklendireceğimize karar verip küçük, güvenli migration'larla ilerleyebiliriz.

---

Yazar: (proje standardizasyon rehberi)
Tarih: 2025-11-04
