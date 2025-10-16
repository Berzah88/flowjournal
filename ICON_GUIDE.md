# Android Icon Düzenleme Rehberi

## 🎯 Sorun
Android'de uygulama icon'u zoom yapmış gibi çok yakın görünüyor.

## 📊 Mevcut Durum
- **logo-yeni.png**: 793x672 px (orijinal logo)
- **adaptive-icon.png**: 1024x1024 px (mevcut adaptive icon)
- **adaptive-icon-new.png**: 1024x1024 px (yeni oluşturulan, daha küçük logo)

## ✅ Çözümler

### Seçenek 1: Yeni Oluşturulan Icon (ÖNERİLEN)
Logo daha küçük, etrafında boşluk var - zoom görünümü olmayacak.

```json
"adaptiveIcon": {
  "foregroundImage": "./assets/adaptive-icon-new.png",
  "backgroundColor": "#ffffff"
}
```

### Seçenek 2: Mevcut Adaptive Icon
Mevcut adaptive-icon.png'yi kullan.

```json
"adaptiveIcon": {
  "foregroundImage": "./assets/adaptive-icon.png",
  "backgroundColor": "#ffffff"
}
```

### Seçenek 3: Manuel Düzenleme
1. `adaptive-icon-test.png` dosyasını aç
2. Kırmızı çizgi **safe zone** sınırını gösterir
3. Logo bu kırmızı çizgi içinde olmalı
4. Logo çok büyükse küçült, çok küçükse büyüt
5. `adaptive-icon.png` olarak kaydet

## 🧪 Test Etme

### Yöntem 1: EAS Build ile Test
```bash
eas build --platform android --profile development
```

### Yöntem 2: Local Build ile Test
```bash
npx expo prebuild --clean
cd android
./gradlew assembleRelease
```

### Yöntem 3: Expo Go ile Önizleme (Sınırlı)
```bash
npx expo start
```
**Not**: Expo Go gerçek icon'u göstermez, sadece build edilmiş APK'da görünür.

## 📱 Icon Boyut Rehberi

### Android Adaptive Icon
- **Canvas**: 1024x1024 px
- **Safe Zone**: 672x672 px (merkezdeki %66)
- **Margin**: 176px (her kenardan)
- **Önerilen Logo Boyutu**: Safe zone'un %70-80'i (~470-538 px)

### Icon Tasarım İpuçları
1. ✅ Logo merkezde olmalı
2. ✅ Kenarlardan en az 176px boşluk bırakın
3. ✅ Basit ve net tasarım
4. ❌ Çok detaylı veya küçük yazılar kullanmayın
5. ❌ Logo'yu tam köşelere kadar uzatmayın

## 🔄 Değişiklik Sonrası

1. `app.json` dosyasını düzenle
2. Build al:
   ```bash
   eas build --platform android --profile production
   ```
3. APK/AAB'yi yükle ve test et

## 📸 Test Dosyaları
- **adaptive-icon-test.png**: Safe zone sınırlarını gösterir (kırmızı çizgi)
- **adaptive-icon-new.png**: Yeni oluşturulan, küçültülmüş logo

## ⚙️ Mevcut Yapılandırma
`app.json` şu anda `adaptive-icon.png` kullanıyor.

