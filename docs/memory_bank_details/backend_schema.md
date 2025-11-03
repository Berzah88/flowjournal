# Backend — Firestore data model & Notification system (technical analysis)

Bu belge backend klasöründeki mevcut çalışan Firebase tabanlı veri yapısını ve bildirim sistemini teknik bir düzlemde açıklar, ardından isteğe bağlı "Milestone deadline bildirim sistemi" için ayrıntılı tasarım ve uygulanabilir adımlar önerir.

Dosyalar incelendi (ana kaynaklar)
- `backend/send_deadline_notifications.py` — hızlı, inline deadline gönderici (Python, firebase-admin).
- `backend/test_project_deadline_detailed.py` — proje deadline'larını analiz eden ve tekil bildirim testleri yapan yardımcı script.
- `backend/test_real_user_notification.py` — gerçek kullanıcıya test bildirimi atmaya yönelik script.
- `backend/flask_app.py` — PythonAnywhere/Flask uygulaması; HTTP endpoint'leri (trigger-daily-reminder, trigger-milestone-reminder, trigger-project-deadline, send-deadline-notifications, vb.).
- `backend/FLASK_CRONJOB_SETUP.md` — PythonAnywhere + cron-job.org kurulumu ve kullanım talimatları.

1) Mevcut mimari — yüksek seviye
- Hosting
  - PythonAnywhere üzerinde çalışan bir Flask API (ör. `flask_app.py`). Cron-job.org ile periyodik tetikleyiciler kurularak düzenli görevler tetikleniyor.
- Firebase
  - Firebase Admin SDK (serviceAccountKey.json) kullanılarak Firestore ve FCM (Cloud Messaging) ile etkileşim.
- Bildirim akışı
  - Topic tabanlı: `trigger-daily-reminder` endpoint'i `topic='daily_reminders'` ile broad push gönderir.
  - Token/tabanlı: belirli kullanıcıya token ile gönderilmesi için `trigger-milestone-reminder`, `trigger-project-deadline` endpoint'leri kullanılır.
  - Cron/inline scripts: `send_deadline_notifications.py` veya Flask içindeki `send-deadline-notifications` endpoint'i, her gün/cron zamanında aktif projelerin deadline'larını tarayıp (gün farkı 0,1,3) FCM ile bildirim yollar.

2) Mevcut Firestore veri şekli (koddan çıkarımla)
- Koleksiyonlar ve ana alanlar (gözlemler):
  - `users` (top level)
    - user doc fields: `fcmToken` (string), `timezone` (opsiyonel), diğer profil alanları
    - Subcollection: `projects`
      - project doc fields:
        - `title` (string)
        - `startDate` (timestamp)
        - `endDate` (timestamp)  ← deadline
        - `status` ("active" | "completed" | ...)
        - `milestones` (array veya nested docs) — yapıya bağlı olarak hem array hem subcollection olabilir
        - `journals` (array) — journal entries
        - `notificationsSent` (map) örneği: `{ 'projectDeadlines': False, 'milestoneReminders': False }` — gönderim durumu / dedupe bilgisi
        - `createdAt` / `updatedAt` (timestamps)

Not: Kod parçalarında `if hasattr(end_date, 'timestamp')` gibi kontroller var; bu Firestore Timestamp objesine göre davranıyor. Kodda aktif proje filtrelemesi `where('status', '==', 'active')` ile yapılıyor.

3) Mevcut bildirim gönderme mantığı (detay)
- Kullanıcılar döngüsü: `db.collection('users').limit(100).stream()` şeklinde sayfalama/limit ile düşük kaynak kullanımı sağlanıyor.
- Proje seçeceği: her kullanıcı için `projects` subcollection içinde `status == 'active'` ve `limit(50)` sorgusu.
- Deadline hesaplama: Firestore Timestamp → Python datetime; sadece tarih kısmı (hour=0...) üzerinden gün farkı hesaplanıyor.
- Gönderim kuralı: days_left ∈ {0,1,3} ise bildirim gönder (kodu bunu gösteriyor).
- Gönderim detayı: `messaging.Message` ile hem `notification` (title/body) hem `data` payload gönderiliyor; AndroidConfig ile yüksek öncelik ve kanal bilgisi ekleniyor.
- Hata yönetimi: her send() try/except içinde; başarısız send log'lanıyor ancak genelde retry/queue mekanizması yok.

4) Güvenlik ve operasyonel notlar
- Secret key: `flask_app.py` içinde istekleri doğrulamak için basit secret-key doğrulaması (`X-API-Key` veya query param) kullanılıyor. Secret kesinlikle repo'ya commit edilmemeli ve environment variable olarak sunulmalı.
- serviceAccountKey.json: backend dizininde veya env ile yol veriliyor; bu dosya hassastır — hiçbir zaman açığa çıkarılmamalı.
- Timeouts: PythonAnywhere free plan limitlerine göre scriptler `limit`/`timeout` parametresi kullanıyor; büyük kullanıcı tabanlarında sayfalama/queue gerekebilir.

5) Gözlemler / zayıf noktalar
- Dedupe / idempotency: bildirim gönderildi bilgisi sınırlı (genelde `notificationsSent` gibi flag'ler), fakat detaylı kayıt/işlem geçmişi yok. Aynı bildirimin birden fazla kez gönderilmesini engellemek için daha net bir kayıt mekanizması gerekli.
- Ölçeklenebilirlik: Kod basit `for user in users` döngüsü ile ilerliyor; 100+ kullanıcı olduğunda cron süresi ve concurrent limitler problem olabilir. Batching, pagination ve background job queue (Cloud Tasks / PubSub) düşünülebilir.
- Hata/Retry: messaging.send() hatalarında otomatik retry yok; kritik hatalar için persistan bir retry kuyruğu önerilir.

6) İsteğe bağlı: "Milestone deadline bildirim sistemi" — tasarım
Amaç: Kullanıcıların projelerinin içindeki milestone'lar için isteğe bağlı, kişiselleştirilebilir hatırlatmalar sağlamak (örn. milestone 3 gün/1 gün/0 gün kala). Sistem minimal riskle devreye alınabilmeli ve kullanıcı bazında açık/kapalı ayarlanabilmeli.

6.1 Veri model önerisi (Firestore)
- İki alternatif:
  A) Milestones subcollection (tercih)
    - `users/{userId}/projects/{projectId}/milestones/{milestoneId}`
    - Fields:
      - `title` (string)
      - `dueDate` (timestamp)
      - `enabled` (bool) — reminders açık mı
      - `remindBeforeDays` (array of ints) — e.g. [0,1,3]
      - `lastNotified` (map) — e.g. `{ '0': timestamp, '1': timestamp }` veya `notificationsSent` map
      - `metadata` (optional: duration, notes)

  B) Milestones as array on project (simpler migration)
    - `milestones: [{ id, title, dueDate, enabled, remindBeforeDays, lastNotified }]`

6.2 Operational design (how it runs)
- Scheduler options:
  - Option 1 (recommended): Daily cron (PythonAnywhere / Cron-job.org) triggers a dedicated `send_milestone_reminders.py` (or calls Flask inline endpoint) at scheduled time.
  - Option 2: Per-milestone scheduled Cloud Tasks / Cloud Functions (more precise but more infra).

- Scanning algorithm (daily job):
  1. Query users (paged, limit e.g. 200).
  2. For each user, query `projects` where `status=='active'`.
  3. For each project, query `milestones` subcollection where `enabled==true` and `dueDate` within next N days (N = max of remindBeforeDays configured for milestones, e.g. 7).
  4. For each matching milestone compute days_left. If days_left in milestone.remindBeforeDays AND not already recorded in milestone.lastNotified for that days_left value → schedule/send notification.
  5. After successful send, write back `milestones/{id}.lastNotified.<days_left> = now` (atomic update) to avoid duplicates.

6.3 Delivery strategy
- Use per-user `fcmToken` send (token-based) for personal reminders.
- For batching: group messages per token using `messaging.send_all` / `send_multicast` when sending same payload to multiple tokens (but reminders are per-user and personalized, so batching is limited).

6.4 Idempotency & retries
- Mark `lastNotified` immediately after successful send. For failures, retry with exponential backoff and write failure logs in a `notifications_logs` collection for later reconciliation.

6.5 API endpoints & UI
- Add endpoints to toggle per-milestone reminders and to query `remindBeforeDays` options. Example endpoints (Flask):
  - `POST /projects/{projectId}/milestones/{milestoneId}/toggle-reminder` (auth + body: enabled)
  - `POST /projects/{projectId}/milestones/{milestoneId}/set-reminders` (body: remindBeforeDays array)

6.6 Migration & backward compatibility
- If milestones are currently arrays on project, create a migration script to convert to subcollection or augment array items with `enabled` and `remindBeforeDays` fields. Initially, default `remindBeforeDays` could be `[1]` (1 day before) or mirror existing `notificationsSent` behavior.

6.7 Performance & cost considerations
- Read amplification: querying per-user/per-project/per-milestone can be read-heavy; mitigate by:
  - Precomputing an `upcomingReminders` collection for quick queries.
  - Using subcollection queries with index on `dueDate` and `enabled`.
  - Paged scanning and short-circuiting users without fcmToken.
- FCM costs are usage-based but generally low for push notifications; main cost is read/write operations on Firestore.

7) Örnek pseudo-code (milestone scanner) — Python (kısa)
```
for users in paged_users(limit=200):
  if not user.fcmToken: continue
  for project in active_projects(user):
    for milestone in milestones_enabled_within_range(project, days=7):
      days_left = (milestone.dueDate - today).days
      if days_left in milestone.remindBeforeDays and not milestone.lastNotified.get(str(days_left)):
        try:
          send_push(token=user.fcmToken, title=f"{milestone.title}", body=f"{project.title} — {days_left} gün kaldı")
          milestone.update({ f'lastNotified.{days_left}': now })
        except Error as e:
          log_failure(...)
```

8) Testler & Acceptance Criteria
- Unit / integration tests:
  - `test_milestone_scanner.py` mocking Firestore docs and ensuring reminders are sent exactly once per configured remindBeforeDays.
  - `test_flask_toggle_reminder.py` verifying API toggles update Firestore correctly.
- QA checklist:
  - Manual test: create a test user, add a milestone due tomorrow with `remindBeforeDays: [1]`, run scanner, assert notification received and `lastNotified.1` is set.
  - Edge case: milestone in past doesn't notify; completed projects/milestones don't notify.

9) Uygulama adımları (adım-adım)
1. Data model: karara göre `milestones` subcollection veya array alanını genişletin.
2. API: ek endpoint'ler ile UI'den kullanıcı tercihlerini alın (enable/disable, remindBeforeDays).
3. Backend scanner: `send_milestone_reminders.py` ile günlük cron job oluşturun (veya Flask inline endpoint olarak barındırın) — paging, limits, logging ve atomic writes ile.
4. UI: `ActiveProject`/`MyDay` içinde milestone detayına küçük toggle ve 'Hatırlat: 3 gün/1 gün/0 gün' seçeneği ekleyin.
5. Test & staging: staging ortamında `test_real_user_notification.py` gibi scriptlerle doğrulayın.
6. İzleme: `notifications_logs` koleksiyonu ve PythonAnywhere logları ile gönderim oranını ve hataları izleyin.

10) Güvenlik & Operasyonel öneriler
- Secret yönetimi: `NOTIFICATION_SECRET_KEY` ve `GOOGLE_APPLICATION_CREDENTIALS` environment variable ile yönetilsin.
- Rate limiting: günlük veya dakikalık limit uygulamak için endpoint'lerde basit rate-limiter ekleyin (ör. Flask-limiter) veya cron frequency'yi agresif ayarlamayın.
- Rollback: notification feature'ı aktifte sorun olursa cron job'ı pasif hale getirebilecek talimatları (cron-job.org' da disable) ve secret'i geçersiz kılma adımları dokümante edin.

11) Sonuç — kısa
Mevcut sistem, proje deadline'ları için temel ve çalışan bir pipeline sunuyor (token/topic, Flask + cron). Önerilen milestone-reminder özelliği, küçük veri modeli genişletmesi ve günlük tarama scripti ile güvenle eklenebilir. Önerilen adımlar: (1) model genişletme, (2) basit scanner script ve atomic `lastNotified` güncellemesi, (3) UI toggle ve staging testleri.

Eğer isterseniz, şimdi bu dokümanı temel alarak:
- A) `send_milestone_reminders.py` için tam, çalıştırılabilir bir Python script hazırlayayım (staging-ready, idempotent), veya
- B) `flask_app.py`'ye yeni endpoint'ler ekleyip küçük bir PR hazırlayayım (örneğin `POST /projects/{projectId}/milestones/{milestoneId}/set-reminders`).

Hangi adımı hemen uygulamamı istiyorsunuz? (A veya B veya başka bir öncelik)
