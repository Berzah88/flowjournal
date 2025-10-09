# 🚀 Production Deployment Guide
## Flow Journal - Backend Production Setup

---

## 📋 **Genel Bakış**

Bu rehber, Flow Journal backend sistemini production ortamına deploy etmek için gereken adımları açıklar.

---

## 🔐 **1. Güvenlik Ayarları**

### **A. Secret Key Yönetimi**

#### **Şu Anki Durum (❌ Güvensiz):**
```python
SECRET_KEY = 'py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1'
```

#### **Production (✅ Güvenli):**

**PythonAnywhere'de:**

1. **Bash console** aç
2. **Environment variable** ekle:
   ```bash
   echo 'export NOTIFICATION_SECRET_KEY="py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1"' >> ~/.bashrc
   source ~/.bashrc
   ```

3. **Flask app'te kullan:**
   ```python
   SECRET_KEY = os.environ.get('NOTIFICATION_SECRET_KEY')
   
   if not SECRET_KEY:
       raise ValueError("NOTIFICATION_SECRET_KEY environment variable not set!")
   ```

---

### **B. serviceAccountKey.json Güvenliği**

#### **Permissions Kontrolü:**

```bash
# PythonAnywhere Console'da
cd /home/mberzah/mysite
chmod 600 serviceAccountKey.json
ls -la serviceAccountKey.json

# Beklenen çıktı:
# -rw------- 1 mberzah mberzah 2394 Oct 09 08:00 serviceAccountKey.json
```

#### **Backup:**

```bash
# Yerel makinede yedek al (Git'e ekleme!)
cp serviceAccountKey.json serviceAccountKey.json.backup
```

#### **.gitignore Kontrolü:**

```bash
# Backend klasöründe
cat .gitignore | grep serviceAccountKey

# Beklenen çıktı:
# **/serviceAccountKey.json
# serviceAccountKey.json
```

---

### **C. Firestore Security Rules**

#### **Mevcut Rules (`backend/firestore.rules`):**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - sadece kendi verisini görebilir
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Projects subcollection
      match /projects/{projectId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

#### **Deploy Etme:**

1. **Firebase Console** → **Firestore Database** → **Rules**
2. Yukarıdaki kuralları yapıştır
3. **Publish** butonuna tık

---

## 📊 **2. Monitoring ve Logging**

### **A. PythonAnywhere Logs**

#### **Log Dosyaları:**

```bash
# Error logs
/var/log/mberzah.pythonanywhere.com.error.log

# Server logs  
/var/log/mberzah.pythonanywhere.com.server.log
```

#### **Log Monitoring:**

```bash
# Canlı log takibi
tail -f /var/log/mberzah.pythonanywhere.com.error.log

# Son 50 satır
tail -n 50 /var/log/mberzah.pythonanywhere.com.error.log
```

---

### **B. Firebase Console Monitoring**

#### **Cloud Messaging Stats:**

1. **Firebase Console** → **Cloud Messaging**
2. **Kontrol et:**
   - Messages sent (last 7 days)
   - Success rate
   - Error rates

#### **Firestore Usage:**

1. **Firebase Console** → **Firestore** → **Usage**
2. **Kontrol et:**
   - Document reads/writes
   - Storage size
   - Network egress

---

### **C. Custom Logging (Flask App)**

#### **Gelişmiş Logging Ekle:**

```python
import logging
from logging.handlers import RotatingFileHandler

# Log handler
handler = RotatingFileHandler(
    '/home/mberzah/mysite/logs/app.log',
    maxBytes=10000000,  # 10MB
    backupCount=5
)

handler.setFormatter(logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
))

app.logger.addHandler(handler)
app.logger.setLevel(logging.INFO)

# Kullanım
@app.route('/trigger-daily-reminder')
def trigger_daily_reminder():
    app.logger.info(f'Daily reminder triggered from {request.remote_addr}')
    # ... rest of code
```

---

### **D. Cron-job.org Email Alerts**

#### **Email Ayarları:**

1. **Cron-job.org Dashboard**
2. **Her job için:**
   - ☑️ **Only notify me in case of errors**
   - Email: Your email address

#### **Test:**

```bash
# Hatalı endpoint test et
curl "https://mberzah.pythonanywhere.com/wrong-endpoint?secret=..."

# Cron-job.org email gönderecek
```

---

## ⚡ **3. Performance Optimization**

### **A. Response Time Optimization**

#### **Mevcut Performance:**

```
Health endpoint: ~0.67s (Mükemmel!)
Notification endpoints: 2-3s (Firebase API gecikme)
```

#### **İyileştirme Önerileri:**

1. **Async Processing:**
   ```python
   from threading import Thread
   
   def send_notification_async(message):
       Thread(target=messaging.send, args=(message,)).start()
   ```

2. **Caching:**
   ```python
   from functools import lru_cache
   
   @lru_cache(maxsize=1)
   def get_firebase_app():
       # Firebase initialization cache
       pass
   ```

---

### **B. Database Query Optimization**

#### **Firestore Indexes:**

1. **Firebase Console** → **Firestore** → **Indexes**
2. **Composite index oluştur:**
   - Collection: `users/{userId}/projects`
   - Fields: `status`, `endDate`
   - Query scope: Collection

---

## 🔧 **4. Error Handling**

### **A. Flask Error Handlers**

```python
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Not found',
        'message': 'Endpoint not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    app.logger.error(f'Internal error: {error}')
    return jsonify({
        'error': 'Internal server error',
        'message': 'Please try again later'
    }), 500

@app.errorhandler(Exception)
def handle_exception(e):
    app.logger.error(f'Unhandled exception: {e}')
    return jsonify({
        'error': 'Internal server error',
        'message': str(e)
    }), 500
```

---

### **B. Notification Error Handling**

```python
try:
    response = messaging.send(message)
    logger.info(f'✅ Notification sent: {response}')
except messaging.ApiCallError as e:
    logger.error(f'❌ FCM API error: {e}')
    # Retry logic veya alternative action
except Exception as e:
    logger.error(f'❌ Unexpected error: {e}')
    # Fallback mechanism
```

---

## 📈 **5. Scaling Considerations**

### **A. PythonAnywhere Limits**

#### **Free Tier:**
- 1 web app
- 512 MB disk space
- 100 seconds CPU time per day
- No scheduled tasks (cron-job.org ile çözüldü ✅)

#### **Upgrade Gerekirse:**

**Paid Plan ($5/month):**
- Multiple web apps
- 1 GB disk space
- Scheduled tasks (built-in cron)
- More CPU time

---

### **B. Firebase Limits**

#### **Free Tier (Spark Plan):**

| Resource | Limit |
|----------|-------|
| **FCM Messages** | Unlimited (free!) |
| **Firestore Reads** | 50,000/day |
| **Firestore Writes** | 20,000/day |
| **Firestore Storage** | 1 GB |

#### **Current Usage (Tahmini):**

```
FCM Messages: ~30/day (3 users × 10 notifications)
Firestore Reads: ~300/day (deadline checks)
Firestore Writes: ~50/day (project updates)

✅ Free tier yeterli!
```

---

## 🧪 **6. Testing Checklist**

### **Pre-Production Tests:**

- [ ] **Security:**
  - [ ] Secret key environment variable test
  - [ ] Unauthorized access test (401)
  - [ ] Firestore rules test

- [ ] **Functionality:**
  - [ ] Daily reminder endpoint
  - [ ] Deadline check endpoint
  - [ ] Last day reminder endpoint
  - [ ] Health check endpoint

- [ ] **Performance:**
  - [ ] Response time < 5s
  - [ ] No timeout errors
  - [ ] Concurrent request handling

- [ ] **Monitoring:**
  - [ ] Error logs accessible
  - [ ] Firebase console stats
  - [ ] Cron-job.org email alerts

---

## 📋 **7. Production Deployment Checklist**

### **Backend (PythonAnywhere):**

- [ ] serviceAccountKey.json uploaded (chmod 600)
- [ ] Environment variables ayarlandı
- [ ] Flask app reload edildi
- [ ] Error logs kontrol edildi
- [ ] Health check endpoint test edildi

### **Firebase:**

- [ ] Firestore security rules deployed
- [ ] FCM topics oluşturuldu
- [ ] Console monitoring aktif

### **Cron-job.org:**

- [ ] 3 cron job oluşturuldu
- [ ] Zamanlama ayarlandı (TR timezone)
- [ ] Email alerts aktif
- [ ] Test run yapıldı

### **React Native App:**

- [ ] ProjectDeadlineService entegrasyonu
- [ ] FCM token alma
- [ ] Topic subscription test
- [ ] Bildirim izinleri

---

## 🚨 **8. Disaster Recovery**

### **A. Backup Strategy**

#### **Firestore Backup:**

1. **Firebase Console** → **Firestore** → **Import/Export**
2. **Export to Cloud Storage** (manuel)

#### **Script Backup:**

```bash
# Git repository backup
git push origin master

# serviceAccountKey.json backup (local, encrypted)
# DO NOT push to Git!
```

---

### **B. Rollback Plan**

#### **PythonAnywhere:**

```bash
# Git history'den eski versiyon
git log
git checkout <commit-hash>

# Web app reload
# PythonAnywhere Dashboard → Reload button
```

---

## 📞 **9. Support ve Troubleshooting**

### **A. Common Issues**

#### **Issue 1: FCM Notifications Gelmiyor**

**Checklist:**
1. Firebase Console'da message sent mi?
2. Topic subscription var mı?
3. App notification permissions açık mı?
4. FCM token geçerli mi?

---

#### **Issue 2: Cron Job Başarısız**

**Checklist:**
1. Secret key doğru mu?
2. Flask app çalışıyor mu? (`/health`)
3. PythonAnywhere logs kontrol et
4. Cron-job.org execution log kontrol et

---

#### **Issue 3: Firestore Connection Error**

**Checklist:**
1. serviceAccountKey.json geçerli mi?
2. Firebase project ID doğru mu?
3. Internet connection var mı?
4. Firebase quota doldu mu?

---

### **B. Support Contacts**

**PythonAnywhere:**
- Forum: https://www.pythonanywhere.com/forums/
- Email: help@pythonanywhere.com

**Firebase:**
- Documentation: https://firebase.google.com/docs
- Support: https://firebase.google.com/support

**Cron-job.org:**
- Documentation: https://cron-job.org/en/documentation/
- Email: support@cron-job.org

---

## ✅ **10. Production Launch Checklist**

### **Final Steps:**

- [ ] Tüm testler başarılı
- [ ] Monitoring aktif
- [ ] Backup stratejisi hazır
- [ ] Error handling implement edildi
- [ ] Security best practices uygulandı
- [ ] Documentation tamamlandı
- [ ] Team training yapıldı

---

## 🎉 **Production Ready!**

**Next Steps:**

1. Deploy to production
2. Monitor for 24 hours
3. Check logs and metrics
4. Optimize based on usage patterns
5. Scale as needed

---

**Son Güncelleme:** 2025-10-09  
**Versiyon:** 1.0.0  
**Status:** ✅ Production Ready

