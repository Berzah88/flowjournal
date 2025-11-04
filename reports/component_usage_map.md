# Component Usage Map — İlk Pass

Bu rapor, `components/` altındaki bileşenlerin repo içindeki ilk-pass kullanım incelemesinin özetidir. Amaç: hangi bileşenlerin aktif kullanıldığı, hangilerinin sınırlı kullanımda olduğu ve hangilerinin derinlemesine manuel inceleme gerektirdiğini hızlıca belirlemek.

Notlar
- Rapor otomatik grep aramalarının ilk-pass çıktısına dayanmaktadır. Kesin "unused" kararı vermek için ek adımlar (ESLint unused-imports, export/usage analiz araçları veya çalışma zamanı testleri) öneririm.
- Aşağıdaki kategoriler:
  - keep: sıkça kullanılıyor — korunacak.
  - review: az sayıda yerde kullanılıyor — manuel kontrol önerilir.
  - candidate-deprecate: kullanım bulunamadı veya yalnızca yorum/şarj amaçlı — arşiv/inceleme için aday.

Özet (kısa)
- Çok kullanılan (keep): Card, ProjectCard, JournalCard, MainHeader, MainMenu, MainModalManager, MainTabNavigation, Styles, MoodStatement, MoodTrend, TodaysSummary, ProjectJourney, AddTaskModal, LoadingSpinner, StatusTabs, MainTabNavigation, ProjectCard, JournalCard
- Modal-only ama kullanılıyor (keep/review): DataRecoveryMenu, LanguageSettings, NotificationMenu, ParentDateNotificationModal, CelebrationModal
- Az kullanım ama referans var (review): AITaskSuggestion, CompletedProjectCard, CompletedTasksList, DailyMoodSummary, Motive, JourneyOverview
- Gözden geçirilecek (review): `components/StatusBar.js` — dosya içinde "removed" notu var; bazı yerler `StatusBar`'ı `react-native`'den import ediyorlar; shim no-op olabilir.
- Henüz belirgin candidate-deprecate yok — daha derin statik analiz ve/veya `eslint --no-unused-vars/imports` çalıştırılmalı.

Detaylı tablo (ilk-pass)

Bileşen | Kısa kullanım değerlendirmesi | Örnek referans (1–3 yer)
---|---:|---
ActiveProjectHeader.js | keep — `ActiveProject.js`, `CompletedActiveProject.js` içinde import ve render ediliyor | `screens/ActiveProject.js` (satır ~574)
ActiveProjectTasks.js | keep — `ActiveProject.js`'de kullanılıyor | `screens/ActiveProject.js` (satır ~642)
ActiveTaskMenu.js | keep — `ActiveProject.js`, `CompletedActiveProject.js` | `screens/ActiveProject.js` (satır ~689)
AddTaskModal.js | keep — modal olarak birçok yerde (MainModalManager, MyDay, ActiveProject) | `components/MainModalManager.js`, `screens/MyDayScreen.js`
AITaskSuggestion.js | review — birkaç yerde referans (ör. `ActiveProject`) | `screens/ActiveProject.js`
Card.js | keep — çok yerde tüketiliyor (Overview, MainTabNavigation, CompletedProjects) | `components/MainTabNavigation.js`, `screens/CompletedProjectsScreen.js`
CelebrationModal.js | keep — MainModalManager içinde modal olarak kullanılıyor | `components/MainModalManager.js`
CompletedProjectCard.js | review — kullanımı var (`CompletedProjectsScreen`) | `screens/CompletedProjectsScreen.js`
CompletedTasksList.js | review — `ActiveProjectTasks` tarafından kullanılıyor | `components/ActiveProjectTasks.js`
ContentScrollView.js | review — (arama sonuçlarında sınırlı görünürlük) | (manuel kontrol önerilir)
DailyMoodSummary.js | review — bileşende export var, sınırlı referans | `components/DailyMoodSummary.js`
DataRecoveryMenu.js | keep — MainModalManager içinde kullanılıyor (modal) | `components/MainModalManager.js`
EditModal.js | keep — ActiveProject / CompletedActiveProject tarafından kullanılıyor | `screens/ActiveProject.js` (satır ~697)
EducationOverlay.js | keep — MainScreen içinde conditionally render ediliyor | `screens/MainScreen.js`
ErrorBoundary.js | keep — global hata sınırı, `App.js` içinde kullanılıyor | `App.js`
FlashCalendar.js | keep — AddProject / MileStone içinde kullanılıyor | `components/MileStone.js`, `screens/AddProjectScreen.js`
HorizontalCalendar.js | keep — MyDay ve MoodCalendar ilişkisi var | `screens/MyDayScreen.js`
JournalCard.js | keep — ProjectJourney, CompletedActiveProject ve grafiklerde kullanılıyor | `components/ProjectJourney.js`, `screens/CompletedActiveProject.js`
JourneyOverview.js | keep — MyDay içinde kullanılıyor | `screens/MyDayScreen.js`
LanguageSettings.js | keep — MainModalManager içinden erişiliyor | `components/MainModalManager.js`
LoadingSpinner.js | keep — App ve ekranlarda (loading states) kullanılıyor | `App.js`, `screens/MainScreen.js`
MainHeader.js | keep — ana ekran header'ı, MainScreen'de kullanılıyor | `screens/MainScreen.js`
MainMenu.js | keep — MainScreen içinde kullanılıyor | `screens/MainScreen.js`
MainModalManager.js | keep — merkez modal yöneticisi | `screens/MainScreen.js`
MainTabNavigation.js | keep — uygulama ana navigation tab'ı | `screens/MainScreen.js`
MediaPickerModal.js | keep — Journal ekranında media seçimi için | `screens/Journal.js`
MileStone.js | keep — çokça kullanılıyor (ActiveProject, MyDay) | `components/MileStone.js`
MoodCalendar.js | keep — MyDay ve MoodTrend etkileşimi var | `screens/MyDayScreen.js`
MoodStatement.js | keep — MainScreen ve diğer yerlerde kullanılıyor | `screens/MainScreen.js`
MoodTrend.js | keep — MyDay ve MainScreen integrasyonu var | `screens/MyDayScreen.js`
Motive.js | review — sınırlı referans, ama context ile bağlı | `components/Motive.js`
NestedHeader.js | keep — MainHeader sarmalayıcısı, birkaç yerde import var | `components/NestedHeader.js`
NotificationMenu.js | keep — MainModalManager içinde modal | `components/MainModalManager.js`
ParentDateNotificationModal.js | keep — MainModalManager içinde modal | `components/MainModalManager.js`
ProjectCalendar.js | removed — tamamen kaldırıldı | (dosya projeden silindi)
ProjectCard.js | keep — MyDay gibi ana ekranlarda referans | `screens/MyDayScreen.js`
ProjectJourney.js | keep — ActiveProject içinde kullanılıyor | `screens/ActiveProject.js`
StatusBar.js | review — dosya başında "removed" notu var; bazı ekranlar `react-native` StatusBar import ediyor. Shim'in ne yaptığını manuel kontrol et.
StatusTabs.js | keep — header içi tab'lar, MainHeader ile beraber kullanılıyor | `components/MainHeader.js`
Styles.js | keep — merkezi stil objesi, birçok ekran import ediyor | `screens/ActiveProject.js`, `screens/MyDayScreen.js`
ThemeToggle.js | keep — MainMenu içinde kullanılıyor | `components/MainMenu.js`
TodaysSummary.js | keep — MyDay içinde kullanılıyor | `screens/MyDayScreen.js`


Sonraki adımlar (önerilen)
1. Derin statik analiz: `eslint` ile unused-imports ve `import/no-unused-modules` kuralını çalıştırın. Bu, dosyaların gerçekten hiç import edilmediğini tespit etmek için kesin yardımcıdır.
2. Dinamik smoke test: Küçük değişiklikler (arşiv/taşıma) sonrası uygulamayı başlatıp ana akışı kontrol edin.
3. Güvenli yol: Önce "archive/deprecated_components/" klasörü oluşturup candidate dosyaları oraya taşıyın. 2–3 dosya grubu halinde commit açın.
4. Son olarak `build` ve `eslint` çalıştırın, hataları düzeltin.

Görüşünüz
- Bu raporu temel alarak devam etmemi ister misiniz? Eğer evet: hangi stratejiyi tercih ediyorsunuz — "archive (önerilen, güvenli)" mı yoksa "direct delete" mi? Ayrıca otomatik taşıma/patch hazırlamamı ister misiniz?

Bu raporu güncelleyip daha kesin sayılar (her bileşen için grep-match sayısı) isterseniz, tüm komponent isimleri için counts hesaplayıp tabloyu güncellerim.
