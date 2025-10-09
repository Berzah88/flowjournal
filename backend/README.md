# 🔥 Flow Journal - Backend & Firebase

Bu klasör, Flow Journal uygulamasının backend sistemlerini ve Firebase entegrasyonlarını içerir.

---

## 📂 Dosya Yapısı

```
backend/
├── flask_app.py                        # PythonAnywhere Flask API
├── serviceAccountKey.json              # Firebase Admin SDK credentials (gitignore'da)
│
├── 📧 Notification Scripts
│   ├── send_daily_reminder.py          # Günlük anımsatıcı gönder
│   ├── send_project_deadline_reminder.py  # Proje son günü bildirimi
│   └── check_project_deadlines.py      # Firestore'dan deadline kontrol et
│
├── 🔥 Firestore Setup
│   ├── setup_firestore_test_data.py    # Test verisi oluştur
│   ├── delete_test_data.py             # Test verisini sil
│   └── firestore.rules                 # Güvenlik kuralları
│
└── 📚 Documentation
    ├── README.md                        # Bu dosya
    ├── FIRESTORE_QUICK_START.md         # Hızlı başlangıç (5 dakika)
    ├── FIRESTORE_DATABASE_SETUP.md      # Detaylı database setup
    ├── FIRESTORE_FUTURE_PLAN.md         # Gelecek özellikler planı
    ├── PYTHONANYWHERE_SETUP.md          # PythonAnywhere kurulum
    └── FLASK_CRONJOB_SETUP.md           # Flask API ve Cron setup
```

---

## 🚀 Hızlı Başlangıç

### 1. Firebase Projesi Oluştur

```bash
# 1. Firebase Console'a git
https://console.firebase.google.com/

# 2. Firestore Database aktifleştir
# 3. Service Account Key indir → serviceAccountKey.json

# 4. Backend klasörüne yerleştir
mv ~/Downloads/serviceAccountKey.json backend/
```

### 2. Firestore Database Kur

```bash
cd backend
python3 setup_firestore_test_data.py
```

**Çıktı:**
```
✅ Test kullanıcısı oluşturuldu: test-user
✅ 4 adet örnek proje oluşturuldu
```

### 3. Backend Script Test Et

```bash
# Günlük anımsatıcı gönder (daily_reminders topic)
python3 send_daily_reminder.py

# Proje deadline kontrolü yap (Firestore'dan)
python3 check_project_deadlines.py

# Proje son günü bildirimi gönder (Last_day topic)
python3 send_project_deadline_reminder.py
```

---

## 🌐 PythonAnywhere Deployment

### Flask API Endpoints

**Base URL:** `https://mberzah.pythonanywhere.com`

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/` | GET | API endpoint listesi |
| `/trigger-daily-reminder` | GET | Günlük anımsatıcı tetikle |
| `/trigger-project-deadline-reminder` | GET | Proje son günü tetikle |
| `/trigger-project-deadline-check` | GET | Firestore deadline kontrolü |
| `/health` | GET | Sistem durumu |

**Authentication:** `?secret=YOUR_SECRET_KEY`

**Örnek:**
```bash
curl "https://mberzah.pythonanywhere.com/trigger-daily-reminder?secret=YOUR_SECRET_KEY"
```

### Cron-job.org Setup

1. [cron-job.org](https://cron-job.org) hesabı oluştur
2. **Create Cronjob**:
   - **Title:** Daily Reminder
   - **URL:** `https://mberzah.pythonanywhere.com/trigger-daily-reminder?secret=YOUR_SECRET_KEY`
   - **Schedule:** Her gün 08:00 (Türkiye saati)
   - **Timezone:** Europe/Istanbul

3. **Create Cronjob**:
   - **Title:** Project Deadline Check
   - **URL:** `https://mberzah.pythonanywhere.com/trigger-project-deadline-check?secret=YOUR_SECRET_KEY`
   - **Schedule:** Her gün 09:00 (Türkiye saati)
   - **Timezone:** Europe/Istanbul

---

## 📊 Firestore Database Yapısı

```
users/{userId}/
  ├── fcmToken: string
  ├── timezone: string
  ├── language: string
  ├── notificationPreferences: map
  └── projects/{projectId}/
      ├── id: number
      ├── title: string
      ├── startDate: timestamp
      ├── endDate: timestamp
      ├── status: "active" | "completed" | "archived"
      ├── milestones: array
      ├── journals: array
      └── notificationsSent: map
```

**Detaylı yapı:** `FIRESTORE_DATABASE_SETUP.md`

---

## 🔔 Bildirim Sistemi

### 1. Günlük Anımsatıcı (Daily Reminder)

**Topic:** `daily_reminders`  
**Zamanlama:** Her gün 08:00 (Türkiye saati)  
**Script:** `send_daily_reminder.py`

**Mesaj:**
```
Title: 🌅 Günaydın! Yeni Bir Gün Başlıyor
Body: Bugün hangi projelerinizde ilerleme kaydedeceksiniz?
```

### 2. Proje Son Günü (Last Day)

**Topic:** `Last_day`  
**Zamanlama:** Her gün 09:00 (Türkiye saati)  
**Script:** `send_project_deadline_reminder.py`

**Dinamik Abonelik:**
- App, AsyncStorage'dan aktif projeleri kontrol eder
- Bugün son günü olan proje varsa → `Last_day` topic'e subscribe
- Yoksa → Unsubscribe

**Mesaj:**
```
Title: 🎯 Projenizin Son Günü!
Body: Bugün projenizin son günü. Son düzenlemelerinizi yapın ve duygularınızı yazın!
```

### 3. Firestore Deadline Kontrolü (Gelecek)

**Zamanlama:** Her gün 10:00  
**Script:** `check_project_deadlines.py`

**Bildirimler:**
- 7 gün önce: "Projenize 7 gün kaldı"
- 3 gün önce: "Son 3 gün! Hızlanma zamanı"
- 1 gün önce: "Yarın son gün!"
- Gecikme: "Projeniz gecikmede"

**Not:** Şu anda Expo managed workflow Firestore'u desteklemiyor. Expo SDK 53+ bekleniliyor.

---

## 🔧 Environment Variables

### PythonAnywhere

**Dosya:** `.env` (veya Flask app içinde)

```python
# Flask Secret Key
SECRET_KEY = "your-secret-key-here"

# Firebase Admin SDK
FIREBASE_CREDENTIALS_PATH = "/home/mberzah/mysite/serviceAccountKey.json"

# Notification Settings
DAILY_REMINDER_TOPIC = "daily_reminders"
DEADLINE_REMINDER_TOPIC = "Last_day"
```

---

## 🧪 Test Senaryoları

### Test 1: Günlük Anımsatıcı

```bash
# Lokal test
python3 send_daily_reminder.py

# PythonAnywhere test (tarayıcıdan)
https://mberzah.pythonanywhere.com/trigger-daily-reminder?secret=YOUR_SECRET_KEY

# Beklenen: Tüm daily_reminders topic abonelerine bildirim gider
```

### Test 2: Proje Son Günü

```bash
# 1. App'te bugün son günü olan proje oluştur
# 2. App açıldığında otomatik Last_day topic'e subscribe olur
# 3. PythonAnywhere'den tetikle

https://mberzah.pythonanywhere.com/trigger-project-deadline-reminder?secret=YOUR_SECRET_KEY

# Beklenen: Sadece bugün son günü olan projesi olanlar bildirim alır
```

### Test 3: Firestore Deadline Kontrolü

```bash
# 1. setup_firestore_test_data.py ile test verileri oluştur
# 2. Script'i çalıştır

python3 check_project_deadlines.py

# Beklenen: Bugün son günü olan proje için bildirim gönderilir
```

---

## 📚 Dokümantasyon

| Dosya | Açıklama |
|-------|----------|
| `FIRESTORE_QUICK_START.md` | ⚡ 5 dakikada Firestore setup |
| `FIRESTORE_DATABASE_SETUP.md` | 📊 Detaylı database yapısı |
| `FIRESTORE_FUTURE_PLAN.md` | 🚀 Gelecek özellikler planı |
| `PYTHONANYWHERE_SETUP.md` | 🌐 PythonAnywhere deployment |
| `FLASK_CRONJOB_SETUP.md` | ⏰ Flask API ve Cron setup |

---

## 🔒 Güvenlik

### Production Checklist

- [ ] `serviceAccountKey.json` gitignore'da
- [ ] Flask API `SECRET_KEY` environment variable'da
- [ ] Firestore security rules aktif (`firestore.rules`)
- [ ] PythonAnywhere environment variables güvenli
- [ ] Rate limiting aktif (Flask app)
- [ ] HTTPS kullanılıyor (PythonAnywhere)
- [ ] Cron-job.org secret key güvenli

### Firestore Security Rules

```bash
# Security rules'u Firebase Console'a uygula
cat firestore.rules

# Firebase Console → Firestore → Rules → Publish
```

---

## 🐛 Sorun Giderme

### ❌ `serviceAccountKey.json not found`

```bash
# Firebase Console → Project Settings → Service Accounts
# Generate New Private Key → Download → backend/ klasörüne taşı
```

### ❌ `Permission denied` (Firestore)

```bash
# Firebase Console → Firestore → Rules
# Test mode aktif mi kontrol et
```

### ❌ PythonAnywhere 500 Error

```bash
# PythonAnywhere → Web → Error log kontrol et
# Muhtemelen import hatası veya path sorunu
```

### ❌ Bildirim gelmiyor

```bash
# 1. FCM token doğru mu? (App'te kontrol et)
# 2. Topic subscription aktif mi? (FCMService.js logları)
# 3. PythonAnywhere script başarılı mı? (Flask logs)
# 4. Firebase Console → Cloud Messaging → Test notification dene
```

---

## 📊 Monitoring

### PythonAnywhere Logs

```bash
# Web app error log
https://www.pythonanywhere.com/user/mberzah/consoles/

# Flask app logs
# Her endpoint'te logger.info() ile log atılıyor
```

### Firebase Console

```bash
# Firestore kullanım istatistikleri
https://console.firebase.google.com/project/YOUR_PROJECT/firestore/usage

# Cloud Messaging istatistikleri
https://console.firebase.google.com/project/YOUR_PROJECT/notification
```

---

## 🎯 Sonraki Adımlar

### Geliştirme

1. ✅ Firestore test verisi oluştur
2. ✅ Backend script'leri test et
3. ✅ PythonAnywhere deploy
4. ✅ Cron job'ları kur
5. ⏳ React Native Firestore entegrasyonu (Expo SDK 53+ bekle)
6. ⏳ Cloud Functions implementasyonu

### Production

1. ⚠️ Environment variables güvenli yap
2. ⚠️ Security rules uygula
3. ⚠️ Rate limiting ekle
4. ⚠️ Monitoring ve alerting kur
5. ⚠️ Backup stratejisi oluştur

---

## 💡 Faydalı Komutlar

```bash
# Test verisi oluştur
python3 setup_firestore_test_data.py

# Test verisini sil
python3 delete_test_data.py

# Günlük anımsatıcı test
python3 send_daily_reminder.py

# Firestore deadline kontrolü
python3 check_project_deadlines.py

# PythonAnywhere'e deploy
# (Manuel: Files → Upload files)

# Firebase CLI ile backup
firebase firestore:export gs://YOUR_BUCKET/backups/$(date +%Y%m%d)
```

---

## 🤝 Katkıda Bulunma

Backend script'lerde düzenleme yaparken:

1. `serviceAccountKey.json`'u commit etme!
2. Secret key'leri environment variable kullan
3. Log mesajları ekle (debugging için)
4. Error handling ekle (try-except)
5. Documentation güncelle

---

## 📞 İletişim

**Proje:** Flow Journal - WIT App  
**Backend:** Firebase + PythonAnywhere  
**Notification:** Firebase Cloud Messaging (FCM)  
**Database:** Firestore  
**Tarih:** 2025-10-09

---

## 📄 License

MIT License - Flow Journal

