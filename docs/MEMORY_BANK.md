## Flow Journal - Memory Bank

Bu dosya proje için hızlı bir "memory bank" (bilgi deposu) olarak hazırlanmıştır. Projenin temel bileşenleri, giriş noktaları, önemli servisler, yapılandırmalar ve kısa açıklamalar aşağıdadır. Bu özet, ileride otomatik dokümantasyon, on-call referans veya AI-asistan memory bank olarak kullanılmak üzere tasarlanmıştır.

### Genel Bilgiler
- Proje: flow-journal
- Versiyon (package.json): 8.6.0
- Platform: React Native (Expo)
- Ana araçlar: Expo, EAS, React Native, Firebase (Firestore + FCM)

### Teknoloji Stack
- React: 19.1.0
- React Native: ^0.81.4
- Expo SDK: 54.0.13
- Firebase: @react-native-firebase/* (app, firestore, messaging)
- Backend: Python (cron scripts + Flask), deploy hedefi: PythonAnywhere
- ML / modeller: pickle modeller (models/*.pkl)

### Giriş Noktaları
- `index.js` — Uygulama root; background FCM handler burada kayıtlı ve `registerRootComponent(App)` çağrısı var.
- `App.js` — Ana React bileşeni; Navigation, Providers (Theme, Language, Education, Task) ve uygulama başlatma mantığı burada.
- `package.json` — bağımlılıklar, scriptler (expo start, eas build) ve proje meta.

### Önemli Konfigürasyon / Dosyalar
- `firebase.json` — Firebase Functions / Hosting yapılandırma (functions predeploy lint komutu var).
- `google-services.json` — Android Firebase konfigürasyonu (repo kökünde).
- `android/app/build.gradle` — Android yapılandırması, paket adı `com.witapp.fcm`, versionName 8.6.0.

### Backend (backend/)
- Tip: Python tabanlı; ana fonksiyonlar cron ile çalıştırılan scriptlerdir.
- Önemli dosyalar:
  - `check_project_deadlines.py` — Günlük deadline kontrolü ve FCM bildirimleri.
  - `send_deadline_notifications.py`, `send_manual_test.py` — test ve bildirim gönderme yardımcıları.
  - `flask_app.py`, `flask_app_optimized.py` — servis api/health endpointleri.
  - `firestore.rules` / `firestore.rules.TEST_MODE` — Firestore güvenlik kuralları.
  - Dokümanlar: `CRON_JOB_SETUP.md`, `PRODUCTION_DEPLOYMENT_GUIDE.md`, `FIRESTORE_QUICK_START.md`, `NOTIFICATION_SYSTEM_EXPLAINED.md` ve daha fazlası.

### Önemli Klasörler ve Roller
- `components/` (≈40 dosya) — UI bileşenleri (MainHeader, ProjectCard, LoadingSpinner, ErrorBoundary, Calendar, Mood components, vs.).
- `screens/` — Uygulama ekranları (MainScreen, TutorialScreen, ActiveProject, JournalDetail, Overview, MoodTrend vs.).
- `services/` — İş mantığı servisleri:
  - `FirestoreService.js` — Firestore okuma/yazma, proje CRUD
  - `FCMService.js` — FCM init, token, topic subscribe
  - `NotificationService.js` — yerel/senkron bildirim yardımcıları
  - `PermissionManager.js` — izin isteme/kontrol
- `context/` — Global React context'leri (ThemeContext, TaskContext, LanguageContext, EducationContext).
- `hooks/` — tekrar kullanılabilir hook'lar (useTaskContext, useDataRecoveryOperations, usePerformanceMonitor, vs.).
- `models/` — ML varlıkları (weights.json, keywords.json, classifier_*.pkl, vectorizer.pkl)
- `utils/` — Yardımcı scriptler (GlobalErrorHandler, AIMoodPredictor, ProjectAnalyzer...)
- `backend/` — Cron/tabanlı bildirim sistemi, docs, test scriptleri.
- `functions/` — (var) Node.js ile yazılmış Cloud Functions veya benzeri (index.js, package.json).

### Firestore & Bildirimler (kısa)
- Veri modeli (özet): `users/{userId}/projects/{projectId}` — her projede startDate, endDate, status, milestones, journals vb. (backend dökümantasyonunda detaylı yapılar var)
- Bildirim akışı: App -> Firestore (token kaydı) -> Backend check_project_deadlines.py -> FCM -> Cihaz
- Daily reminders topic: `daily_reminders`

### ML / Modeller
- `models/` içerisinde eğitilmiş sınıflayıcı modeller (.pkl) ve ağırlık/anahtarlar bulunuyor. Muhtemel kullanım: AIMoodPredictor veya benzeri bir util tarafından çağrılıyor.

### Çalıştırma / Geliştirme Notları
- Expo local: `npm run start` (veya `expo start`)
- Android (local): `npm run android` veya `expo run:android`
- Build (EAS): `npm run build:beta:android` / `npm run build:beta:ios`
- Backend testleri: `python backend/check_project_deadlines.py` veya `python backend/send_manual_test.py`

### Kısa Risk / Notlar
- Firebase serviceAccountKey.json backend içinde bulunuyor — dikkatle yönetilmeli.
- `firestore.rules.TEST_MODE` test amaçlı; production kuralları ayrı.
- Android uygulamada `google-services.json` mevcut — yerel testlerde Firebase otomatik başlatılıyor.
- ML modeller binary .pkl: lisans/uyumluluk ve güvenlik açısından gözden geçirilmeli.

### Referans: Tarama Özetleri
- components: ~40 dosya (örn. `components/LoadingSpinner.js`, `components/ErrorBoundary.js`, `components/ProjectCard.js`)
- screens: 11 dosya (MainScreen, TutorialScreen, ActiveProject, vb.)
- services: 4 dosya (FirestoreService, FCMService, NotificationService, PermissionManager)
- hooks: 6 dosya (useTaskContext, useDataRecoveryOperations, usePerformanceMonitor...)
- models: 5 dosya (pikeller ve json ağırlıklar)

### Next steps (önerilen)
1. Memory bank'i genişletmek için her klasörde otomatik özet oluşturayım: her dosyanın amacını (1-2 satır), export edilen fonksiyon/komponent isimlerini ve önemli kod yollarını çıkarırım.
2. Firestore şemasının tam çıkarımı: backend dokümanları ve kodu kullanarak collection/field listesi çıkarma.
3. Opsiyonel: JSON formatında bir searchable memory (docs/memory_bank.json) oluşturup AI-asistan için besleyebilirim.



---
_Oluşturuldu: 2025-11-02_
