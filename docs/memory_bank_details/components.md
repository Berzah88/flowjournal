# components/ klasör özeti

Bu dosya `components/` altındaki bileşenlerin kısa özetlerini içerir. Her madde: dosya yolu, ana export ve kısa kullanım/amaç açıklaması.

---

`components/ActiveTaskMenu.js`
- Export: default React component `ActiveTaskMenu`
- Açıklama: Görev üzerine açılan küçük işlem menüsü (Düzenle, Tamamla, Sil). Reanimated ile açılış/kapanış animasyonları içerir ve tema/dil bağlamını kullanır.

`components/AddTaskModal.js`
- Export: default React component `AddTaskModal`
- Açıklama: Yeni milestone/görev eklemek veya düzenlemek için tam ekran modal. Tarih aralığı seçimi, calendar önizlemesi, form doğrulama ve tema/dil entegrasyonu içerir. `FlashCalendar` ve `useSpringAnimation` hook'larını kullanır.

`components/ActiveProjectTasks.js`
- Export: default memoized component
- Açıklama: Aktif bir projenin milestone listesini işler ve hiyerarşik gösterir. `MileStone` ve `CompletedTasksList` ile etkileşir; ekleme/attach/complete işlemlerini yönlendirir.

`components/ActiveProjectHeader.js`
- Export: default memoized component
- Açıklama: Aktif proje ekranının üst başlığı; tarih aralığı, sekme (Tasks / Journey) ve animasyonlu gösterge içerir. Pan gesture için sarmalayıcı destekler.

`components/CelebrationModal.js`
- Export: default component
- Açıklama: Tamamlama / başarı durumunda gösterilen kutlama modalı. Basit animasyonlar, AI mesaj (getContextualMessage util) ve journal'a yönlendirme butonu içerir.

`components/Card.js`
- Export: default memoized `Card`
- Açıklama: Proje/Task kartı bileşeni — başlık, tarih aralığı, ilerleme çemberi, durum rozeti ve küçük mood tag'leri gösterir. Performans izlemesi, animasyonlar ve SVG ile progress bar içerir. `ProjectCard` ile benzer görünümde, listelerde kullanılır.

`components/AITaskSuggestion.js`
- Export: default component
- Açıklama: Günlük yazılarından (journalEntries) basit pattern-matching ile milestone önerileri üreten AI-simulation bileşeni. Kabul/reddet işlemleri tetikler ve UI listesi sunar.

`components/CompletedProjectCard.js`
- Export: default memoized component
- Açıklama: Tamamlanmış projeler için gösterim kartı — tarih, milestone istatistikleri, tamamlanma yüzdesi ve progress bar içerir.

`components/CompletedTasksList.js`
- Export: default memoized component
- Açıklama: Completed (tamamlanmış) milestone listesini katlanabilir şekilde gösterir. `MileStone` öğelerini grup hiyerarşisiyle render eder.

`components/ContentScrollView.js`
- Export: (dosya boş)
- Açıklama: Mevcut repo sürümünde boş dosya; muhtemel eski bir wrapper ya da placeholder.

`components/ErrorBoundary.js`
- Export: default class `ErrorBoundary`
- Açıklama: React hata sınır bileşeni; error capture, retry (max 3) ve kullanıcıya fallback UI sunar. Geliştirme zamanında detaylı logging içerir.

`components/EducationOverlay.js`
- Export: default component
- Açıklama: Uygulama içi öğretici overlay'leri yönetir (education steps). `EducationContext` ile config yükler, giriş/çıkış animasyonları ve adım bazlı yönlendirme sağlar.

`components/EditModal.js`
- Export: default component
- Açıklama: Proje düzenleme modalı — başlık, tarih seçici (FlashCalendar) ve kaydet/iptal işlemleri. ActiveProject / AddProject ile benzer animasyon düzenini kullanır.

`components/DataRecoveryMenu.js`
- Export: default component
- Açıklama: Küçük menü; yedek oluşturma, verileri geri yükleme ve dil ayarlarına erişim gibi veri yönetimi eylemlerini sunar. Animasyonlu açılır menü tasarımı.

`components/DailyMoodSummary.js`
- Export: default component
- Açıklama: Seçili tarih için günlük duygu özetini, AI-tarzı hızlı ipuçlarını ve bugünkü ilerleme yüzdesini hesaplayıp gösterir. Journal entry'leri tarayıp recency-weighted dominant mood bulur.

`components/JournalCard.js`
- Export: default memoized component
- Açıklama: Bir gün içindeki journal girişlerini özetleyen kart. Medya (resim) önizlemeleri, konum çevrimleri (reverse geocode), long-press silme ve AI-milestone eşleme gibi zengin işlevsellik içerir.

`components/HorizontalCalendar.js`
- Export: default component
- Açıklama: Yatay kayan 7 günlük takvim şeridi; tarih seçimi için kullanılır. Tarih hizalaması/snap özellikleri ve locale-aware başlıklar içerir.

`components/FlashCalendar.js`
- Export: default component
- Açıklama: Tarih aralığı seçici modal (react-native-calendars). Tek gün veya aralık seçimi, presetler (1 hafta/1 ay vb.) ve işlevsel onConfirm callback sağlar.

`components/MoodStatement.js`
- Export: default memoized component
- Açıklama: Kullanıcının ruh hali (mood) özetini, trendleri ve streak bilgilerini hesaplayıp gösteren kapsamlı bileşen. On-device JS predictor entegrasyonu için hazırlık ve recency-weighted hesaplama içerir.

`components/MoodCalendar.js`
- Export: default component
- Açıklama: Ay bazlı takvim üzerinde mood / proje / milestone göstergeleri sunar. Tüm görevlerden journal verilerini çekip ilgili güne mood ikonu/küçük dot gösterir.

`components/MileStone.js`
- Export: default `MileStone` fonksiyonel component
- Açıklama: Milestone (görev parçası) öğesinin asıl görüntülenmesi ve etkileşimlerini yönetir. Edit, complete, detach/attach, drag/swipe davranışları, progress circle, FlashCalendar ve JournalCard entegrasyonları içerir. En büyük ve en karmaşık bileşenlerden biridir.

`components/MainTabNavigation.js`
- Export: default component
- Açıklama: Uygulamanın ana yatay tab navigasyonu (MyDay / Active). Reanimated pan gesture tab switching, MyDayScreen ve active FlatList sarmalayıcılarını içerir.

`components/MainModalManager.js`
- Export: default component
- Açıklama: Uygulama genelindeki modal'ları tek yerde yönetir (AddProject, ActiveProject, Journal, AddTaskModal, DataRecoveryMenu, NotificationMenu, LanguageSettings, CelebrationModal, ParentDateNotificationModal). Bir çeşit modal orkestratörüdür.

`components/MainMenu.js`
- Export: default component
- Açıklama: Üst menü açılır penceresi; tutorial, completed projects, notifications, theme toggle ve settings çağrılarını içerir.

`components/MainHeader.js`
- Export: default component
- Açıklama: Uygulama üst başlığı (logo + başlık) ve içine gömülebilen `statusTabs` alanı. Animated stiller parent tarafından sağlanır; header gesture yönetimi parent tarafında tutulmuş.

`components/LoadingSpinner.js`
- Export: default component
- Açıklama: Basit yükleniyor göstergesi (ActivityIndicator + mesaj). Küçük ortak UI bileşeni.

`components/LanguageSettings.js`
- Export: default component
- Açıklama: Dil seçimi menüsü; locale değişikliği, AsyncStorage ve LanguageContext entegrasyonu. Açılır animasyonlu menü.

`components/JourneyOverview.js`
- Export: default component
- Açıklama: Kullanıcının proje yolculuğu özetini (active/completed projects, entry sayıları, kelime sayısı) gösteren küçük gösterge kartı. Dominant mood ve basit istatistikler sunar.

`components/NestedHeader.js`
- Export: default forwardRef component
- Açıklama: `MainHeader` sarmalayıcısı; shared value gözlemleme ve JS imperatif API (`collapseTo`) sağlar. `onHeaderClosed` callback tetikleyebilir.

`components/NotificationMenu.js`
- Export: default component
- Açıklama: Bildirim ayarları menüsü. FCM topic aboneliği toggle'ı (fcmService) ve AsyncStorage ile abonelik durumu takibi içerir.

`components/Motive.js`
- Export: default component
- Açıklama: Kısa motive edici mesaj/teklif gösteren küçük slide-in kart. Manuel kapanma ve basit animasyon içerir.

`components/MoodTrend.js`
- Export: default component
- Açıklama: Son 7 gün ruh hali trendini hesaplar ve iyileşme/düşüş/kararlı bilgisi verir. Trend kartı, yeterli veri yoksa kullanıcıya daha fazla journal yazması gerektiğini söyler.

`components/TodaysSummary.js`
- Export: default memoized component
- Açıklama: Seçili tarih için bugünün özetini listeler; o güne ait aktif projeler/milestones ve progress göstergeleri. `ProjectCard` tipi bileşenleri render eder.

`components/ThemeToggle.js`
- Export: default component (+ named export ThemeSettingsModal)
- Açıklama: Tema (dark/light/system) anahtarı ve küçük modal ile tema tercihleri yöneticisi.

`components/StatusTabs.js`
- Export: default component
- Açıklama: MyDay / Active sekmeleri için animasyonlu tab bar. Reanimated kullanır; header içine gömülebilir.

`components/StatusBar.js`
- Export: default null (no-op)
- Açıklama: Orijinal StatusBar bileşeni kaldırılmış; repo'daki importları kırmamak için no-op export konulmuş.

`components/ProjectJourney.js`
- Export: default component
- Açıklama: Tek bir projenin journal geçmişini gruplar ve `JournalCard` bileşenleri şeklinde gösterir. Project-based journal modelleri ile çalışır.

`components/ProjectCard.js`
- Export: default memoized component
- Açıklama: MyDay içinde kullanılan proje özet kartı (başlık, tarih, milestone kısa erişimleri, badge'ler). Long-press / touch animasyonları ve milestone kısmi listesi içerir.

`components/ProjectCalendar.js`
- Export: default component
- Açıklama: Projeler/ tüm milestone'ların ay bazlı takvim görünümü; milestone dot'ları, mood tag'ları ve legend içerir.

`components/ParentDateNotificationModal.js`
- Export: default component
- Açıklama: Parent (üst) milestone tarih değişiklikleri hakkında kullanıcıyı bilgilendiren küçük modal. Swipe-to-dismiss ve animasyonlu gösterim içerir.

---

Not: Bu özet `components/` içindeki okunmuş dosyalar baz alınarak hazırlandı. İsterseniz aynı yaklaşımı `screens/`, `services/`, `hooks/`, `context/`, `utils/` gibi diğer klasörler için de uygularım.
