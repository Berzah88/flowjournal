# 🚀 Flask API + Cron-job.org Setup

## 📋 **Genel Bakış**

Bu sistem, **external cronjob servisi** (Cron-job.org) ile **PythonAnywhere Flask API**'yi birleştirerek **süresiz, otomatik bildirim** sistemi sağlar.

**Avantajlar:**
- ✅ **Expiry yok** - Sonsuza kadar çalışır
- ✅ **Otomatik** - Manuel extend gerekmez
- ✅ **Ölçeklenebilir** - Günlük, milestone, deadline bildirimleri
- ✅ **Ücretsiz** - Hem PythonAnywhere hem Cron-job.org free plan yeterli

---

## 🔧 **ADIM 1: PythonAnywhere Flask App Kurulumu**

### **A) Flask App Oluştur**

1. **PythonAnywhere Dashboard** → **Web** sekmesi
2. **"Add a new web app"** butonuna tıkla
3. **Domain seç** (örn: `yourusername.pythonanywhere.com`)
4. **Flask** framework'ünü seç
5. **Python 3.10** seç

### **B) flask_app.py Dosyasını Yükle**

1. **Files** sekmesi → `mysite` dizini
2. **Upload a file** → `flask_app.py` yükle
3. Dosyayı aç ve **2 yer değiştir:**

**Satır 41:** Secret key
```python
SECRET_KEY = os.environ.get('NOTIFICATION_SECRET_KEY', 'YOUR_STRONG_SECRET_KEY_HERE')
```
**Güçlü bir secret key oluştur!** Örnek:
```
jK8mP3nQ9rT5wX2yZ7aB4cF6hL1vN0sU
```

**Satır 55:** serviceAccountKey.json path
```python
cred_path = '/home/KULLANICI_ADIN/mysite/serviceAccountKey.json'
```

### **C) WSGI Configuration**

1. **Web** sekmesi → **WSGI configuration file** linkine tıkla
2. Dosyayı aç ve **tamamını şununla değiştir:**

```python
import sys
import os

# PythonAnywhere kullanıcı adını değiştir!
path = '/home/KULLANICI_ADIN/mysite'
if path not in sys.path:
    sys.path.append(path)

from flask_app import app as application
```

**Kaydet!** (Ctrl+S)

### **D) Flask Dependencies Yükle**

**Bash console** aç ve:
```bash
pip3 install --user flask firebase-admin
```

### **E) Web App'i Reload**

1. **Web** sekmesine dön
2. Yeşil **"Reload"** butonuna bas 🔄
3. Domain'ine git (örn: `https://yourusername.pythonanywhere.com`)
4. Şunu göreceksin:
```json
{
  "status": "active",
  "service": "Flow Journal Notification API",
  "version": "1.0.0"
}
```

✅ **Flask app çalışıyor!**

---

## 🔐 **ADIM 2: API Test**

### **A) Health Check**

Tarayıcıdan:
```
https://yourusername.pythonanywhere.com/health
```

**Beklenen:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-08T20:45:00",
  "firebase": "initialized"
}
```

### **B) Daily Reminder Test**

Tarayıcıdan (secret key ekle):
```
https://yourusername.pythonanywhere.com/trigger-daily-reminder?key=YOUR_SECRET_KEY
```

**Telefonuna HEMEN bildirim gelmeli!** 🔥

**Beklenen response:**
```json
{
  "success": true,
  "message": "Daily reminder sent successfully",
  "message_id": "projects/...",
  "topic": "daily_reminders"
}
```

---

## 🕐 **ADIM 3: Cron-job.org Setup**

### **A) Hesap Oluştur**

1. https://cron-job.org → **Sign up** (ücretsiz)
2. E-posta doğrula

### **B) Cronjob Oluştur**

1. **Dashboard** → **Create cronjob**

**Ayarlar:**

**Title:** `Flow Journal - Daily Reminder`

**URL:**
```
https://yourusername.pythonanywhere.com/trigger-daily-reminder?key=YOUR_SECRET_KEY
```

**Schedule (Expression):**
```
0 16 * * *
```
**Açıklama:** Her gün 16:00 UTC (Türkiye 19:00)

**Request method:** `GET`

**Request timeout:** `30` seconds

**Enabled:** ✅ Aktif

**Save & start!** 🚀

### **C) Test Et**

1. Cronjob listesinde yeni job'ı gör
2. **"Run now"** butonuna bas (sağ tarafta)
3. **Telefonuna bildirim gelmeli!**
4. **History** sekmesinde log'u gör:
```
Status: 200 OK
Response: {"success": true, ...}
```

---

## 📱 **ADIM 4: Gelecek Bildirimler İçin Hazırlık**

### **Milestone Reminder (Token Bazlı)**

**Endpoint:** `/trigger-milestone-reminder`

**Method:** `POST`

**Headers:**
```
X-API-Key: YOUR_SECRET_KEY
Content-Type: application/json
```

**Body:**
```json
{
  "fcm_token": "USER_FCM_TOKEN_HERE",
  "milestone_name": "Backend API Tamamla",
  "project_name": "E-ticaret Sitesi"
}
```

**Kullanım:** React Native app'ten kullanıcı milestone tarihi geldiğinde API'ye request at.

### **Project Deadline (Token Bazlı)**

**Endpoint:** `/trigger-project-deadline`

**Method:** `POST`

**Headers:**
```
X-API-Key: YOUR_SECRET_KEY
Content-Type: application/json
```

**Body:**
```json
{
  "fcm_token": "USER_FCM_TOKEN_HERE",
  "project_name": "E-ticaret Sitesi",
  "days_left": 3
}
```

**Kullanım:** React Native app'ten kullanıcının proje bitiş tarihine 3 gün kala API'ye request at.

---

## 🔒 **GÜVENLİK**

### **Secret Key Koruma:**

1. ❌ **ASLA git'e commit etme!**
2. ✅ Environment variable kullan
3. ✅ Güçlü, rastgele key oluştur (32+ karakter)
4. ✅ Her environment için farklı key

### **Rate Limiting:**

PythonAnywhere free plan:
- **100,000 requests/day** limit
- Günlük bildirim: **30 requests/day** (bol bol yeterli)

---

## 📊 **MONITORING**

### **PythonAnywhere Logs:**

1. **Web** sekmesi → **Log files** bölümü
2. **Error log:** `/var/log/xxx.pythonanywhere.com.error.log`
3. **Server log:** `/var/log/xxx.pythonanywhere.com.server.log`

### **Cron-job.org Logs:**

1. **Cronjob** listesinde job'ı seç
2. **History** sekmesi → Tüm çalışma kayıtları
3. **Status codes** ve **response times**

---

## 🐛 **SORUN GİDERME**

### **1. "Unauthorized" Hatası**
```json
{"error": "Unauthorized", "message": "Invalid API key"}
```
→ Secret key yanlış. URL'deki `?key=...` kısmını kontrol et.

### **2. "Firebase initialization failed"**
```json
{"error": "Firebase initialization failed"}
```
→ `serviceAccountKey.json` path'i yanlış veya dosya yok.

### **3. Bildirim Gelmiyor**
- ✅ Flask app reload edildi mi?
- ✅ FCM token doğru mu?
- ✅ Topic'e subscribe olundu mu?
- ✅ PythonAnywhere error log'larını kontrol et

### **4. Cronjob Çalışmıyor**
- ✅ Cronjob **enabled** mi?
- ✅ Schedule expression doğru mu?
- ✅ URL doğru mu?
- ✅ Cron-job.org **History** log'larını kontrol et

---

## ✅ **FİNAL KONTROL LİSTESİ**

- [ ] Flask app oluşturuldu
- [ ] `flask_app.py` yüklendi ve düzenlendi
- [ ] Secret key değiştirildi
- [ ] WSGI configuration güncellendi
- [ ] Flask dependencies yüklendi (`flask`, `firebase-admin`)
- [ ] Web app reload edildi
- [ ] Health check test edildi (`/health`)
- [ ] Daily reminder test edildi (`/trigger-daily-reminder?key=...`)
- [ ] Cron-job.org hesabı oluşturuldu
- [ ] Cronjob oluşturuldu (16:00 UTC)
- [ ] Cronjob "Run now" ile test edildi
- [ ] Telefonuna bildirim geldi ✅

---

## 🎉 **BAŞARI!**

Artık **süresiz, otomatik bildirim sisteminiz** çalışıyor! 🔥

**Her gün 19:00'da** (Türkiye saati) otomatik bildirim gelecek!

**Gelecekte eklenecek bildirimler:**
- ✅ Milestone hatırlatmaları (token bazlı)
- ✅ Proje deadline'ları (token bazlı, 1/3/7 gün önceden)
- ✅ Haftalık özet bildirimleri
- ✅ Başarı rozetleri
- ✅ Custom user notifications

**Herhangi bir sorun olursa:**
- PythonAnywhere error logs
- Cron-job.org history
- Flask `/health` endpoint

🚀 **Happy Coding!** 💝

