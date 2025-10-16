# Google Services JSON Dosyası İndirme Rehberi

## 🔥 Firebase Console'dan google-services.json İndirme

### Adım 1: Firebase Console'a Git
1. [Firebase Console](https://console.firebase.google.com/) açın
2. Projenizi seçin (Flow Journal / WITApp-FCM)

### Adım 2: Proje Ayarları
1. Sol üst köşedeki ⚙️ (Ayarlar) ikonuna tıklayın
2. "Project settings" (Proje ayarları) seçeneğine tıklayın

### Adım 3: Android Uygulaması
1. "Your apps" (Uygulamalarınız) bölümüne gidin
2. Android ikonuna tıklayın (varsa) veya "Add app" → "Android" seçin
3. Package name: `com.witapp.fcm` (app.json'daki package ile aynı olmalı)

### Adım 4: google-services.json İndir
1. "Download google-services.json" butonuna tıklayın
2. İndirilen dosyayı projenizin **root** dizinine kopyalayın:
   ```
   Flow Journal/
   ├── google-services.json  ← BURAYA
   ├── app.json
   ├── package.json
   └── ...
   ```

### Adım 5: .gitignore Kontrolü
`google-services.json` dosyasını `.gitignore`'a ekleyin (güvenlik için):
```gitignore
# Firebase config
google-services.json
GoogleService-Info.plist
```

## 🚨 Eğer Dosyayı Bulamazsanız

### Seçenek 1: Yeni Android App Ekle
1. Firebase Console → Project Settings
2. "Add app" → Android seçin
3. Package name: `com.witapp.fcm`
4. App nickname: "Flow Journal Android"
5. SHA-1 sertifikası (opsiyonel, sonra eklenebilir)
6. "Register app" → "Download google-services.json"

### Seçenek 2: Mevcut Uygulamadan İndir
1. Firebase Console → Project Settings
2. "Your apps" bölümünde Android uygulamanızı bulun
3. "google-services.json" butonuna tıklayın ve indirin

## 📝 Dosya Konumu
```
✅ Doğru: Flow Journal/google-services.json
❌ Yanlış: Flow Journal/android/google-services.json
❌ Yanlış: Flow Journal/backend/google-services.json
```

## 🔐 Güvenlik
- ⚠️ Bu dosyayı **asla Git'e commit etmeyin**
- ⚠️ API key'leri içerir, gizli tutun
- ✅ `.gitignore`'da olduğundan emin olun

## ✅ Doğrulama
Dosya şu şekilde görünmelidir:
```json
{
  "project_info": {
    "project_number": "...",
    "project_id": "...",
    "storage_bucket": "..."
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "...",
        "android_client_info": {
          "package_name": "com.witapp.fcm"
        }
      },
      "api_key": [...]
    }
  ]
}
```

## 🚀 İndirdikten Sonra
1. Dosyayı root dizine kopyalayın
2. `app.json`'ı güncelleyin (otomatik yapılacak)
3. `npx expo prebuild --clean` komutunu çalıştırın
