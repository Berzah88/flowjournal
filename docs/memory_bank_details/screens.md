# screens/ — Per-dosya özetler

Aşağıda `screens/` içinde bulunan her dosya için kısa (1–3 cümle) açıklamalar, ana ihracatlar ve nerede kullanıldıklarına dair notlar bulunmaktadır.

- `TutorialScreen.js`
  - Default export: TutorialScreen.
  - Onboarding / eğitim ekranı; çok adımlı, animasyonlu bir tutorial sunar, `EducationContext` ile eğitim akışını başlatır ve uygulama izinlerini (`PermissionManager`) ister. Son adımda `navigation.replace('Main')` ile uygulamanın ana ekranına yönlendirir.

- `overview.js` (OverviewScreen)
  - Default export: OverviewScreen.
  - Günlük genel bakış dashboard'u: günlük giriş/kelime sayıları, tamamlanan/aktif milestone sayıları, haftalık aktivite ve streak hesapları üretir. `useTaskContext` hook'ları, `AIMoodPredictor` ve tema/dil context'leri ile zengin, veri odaklı kartlar gösterir.

- `MyDayScreen.js`
  - Default export: MyDayScreen (memoized).
  - Uygulamanın "My Day" ana içeriği; yatay/vertical bileşenleri birleştirip `HorizontalCalendar`, `TodaysSummary`, `ProjectCard`, `JourneyOverview` vb. bileşenleri render eder. Milestone tamamlamaları, odaklanmış proje yönetimi, celebration tetikleyicileri ve yerel state yönetimini içerir.

- `MoodTrendScreen.js`
  - Default export: MoodTrendScreen.
  - Ruh hali analizi ekranı; son 7 gün verisini toplar, 5-kategori radar grafiği (SVG) çizer, AI destekli kısa analiz / destekleyici mesaj üretir ve görsel olarak zengin özet kutuları sunar.

- `MainScreen.js`
  - Default export: MainScreen (memoized).
  - Uygulamanın ana konteyneri: `MainHeader`, `MainTabNavigation`, mood-statement, modal yöneticileri ve global paylaşılan Reanimated shared-value'ları barındırır. Header collapse koordinasyonu, eğitim (Education) entegrasyonu ve global tetikleyiciler (celebration, parentDateNotification) burada yönetilir.

- `JournalDetailScreen.js`
  - Default export: JournalDetailScreen.
  - Günlük-günlük detay görüntüleyici: belirli bir gün/proje için medya galerisi, fullscreen viewer, ters-geocoding (reverseGeocodeSafe) ile konum gösterimi ve AI tabanlı milestone eşleme/önerisi. `useTaskContext` ile journal entry güncellemeleri yapar.

- `Journal.js`
  - Default export: Journal (modal/editor bileşeni).
  - Günlük oluşturma/düzenleme modal'ı: resim seçme (expo-image-picker), konum alma (expo-location), sürekli duygu/sentiment analizi (`AIMoodPredictor`), mood önerileri ve kaydetme için `useTaskActions` çağrıları içerir. UI performansı ve klavye/dinamik yükseklik için birçok iyileştirme içerir.

- `CompletedProjectsScreen.js`
  - Default export: CompletedProjectsScreen (memoized).
  - Tamamlanmış projelerin listelendiği ekran; kompakt istatistik kartları ve proje kartları (Card bileşeni) gösterir. Bir projeye basıldığında `CompletedActiveProject` modal'ını açar.

- `CompletedActiveProject.js`
  - Default export: CompletedActiveProject.
  - Tamamlanmış bir projenin detay modal'ı: milestone'lara göre gruplanmış journal girişleri, düzenleme/silme/geri alma aksiyonları ve performans odaklı render iyileştirmeleri içerir. `JournalCard` ile tarih-gruplaması yapılır.

- `AddProjectScreen.js`
  - Default export: AddProjectScreen.
  - Yeni proje ekleme modal'ı: başlık girişi + `FlashCalendar` ile tarih seçimi. Eğitim (Education) modunda ilk proje oluşturulduğunda `setEducationProjectId` ve `nextStep()` çağrıları içerir.

- `ActiveProject.js`
  - Default export: ActiveProject.
  - Aktif proje modal'ı: iki sekmeli (milestones, journey) düzen, yatay sekme geçişleri, milestone CRUD ve proje içi journal yönetimi. Çeşitli performans optimizasyonları, pan/gesture yönetimi ve AI öneri bileşenleriyle etkileşir.


Not: Bu özetler kısa referans amaçlıdır — her dosyanın içine girip belirli fonksiyon/prop imzaları, kullanılan context/hook'lar veya render akışlarını detaylandırmak isterseniz bir sonraki adımda o dosyaya özel 6–10 maddelik detay listeleri hazırlayabilirim.
