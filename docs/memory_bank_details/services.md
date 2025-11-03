# services/ klasör özeti

Bu dosya `services/` altındaki servis modüllerinin kısa özetlerini içerir. Her madde: dosya yolu, ana export ve kısa kullanım/amaç açıklaması.

---

`services/PermissionManager.js`
- Export: default singleton `permissionManager`
- Açıklama: Expo izinlerini yönetir (bildirim, konum, medya galerisi). İlk açılışta izin isteme akışı, izin durumunun kaydedilmesi (AsyncStorage) ve helper fonksiyonlar içerir.

`services/NotificationService.js`
- Export: default singleton `notificationService`
- Açıklama: Lokal scheduled notifications ve FCM token debug yardımcıları içerir. Planlı bildirimleri listeleme ve iptal etme gibi basit yardımcılar sağlar; ana FCM mantığı `FCMService` içinde tutulmuş.

`services/FirestoreService.js`
- Export: default singleton `firestoreService`
- Açıklama: Firestore ile CRUD operasyonlarını soyutlar: kullanıcı profili, projeler, milestone'lar için save/get/update/delete metodları içerir. Token yönetimi, Timestamp dönüşümleri, undefined alan temizleme ve basit cache/aktif proje filtreleme mantığı mevcut. Uygulama-side için Firestore sync noktası görevi görür.

`services/FCMService.js`
- Export: default singleton `__fcmServiceInstance` (global singleton)
- Açıklama: FCM (Firebase Cloud Messaging) entegrasyonu. Token alma/yenileme, foreground/background mesaj işleme, duplicate-guard ve kritik-bildirim mantığı, topic subscribe/unsubscribe (ör. `daily_reminders`) ve local notification gösterme karar mantığını içerir. Background handler index.js'e taşındığı için burada foreground/response handling ve token kaydetme ağırlıklı işlemler var.

---

Not: `services/` temelinde bildirim ve Firestore entegrasyonu uygulamanın merkezinde. `FCMService` kritik bildirim kararları ve dedupe mantığı içeriyor; `FirestoreService` ise offline/online senkronizasyon ve tip dönüşümleri için önemli. İsterseniz şimdi `screens/` klasörüne geçip aynı özetleme sürecini uygulayayım.
