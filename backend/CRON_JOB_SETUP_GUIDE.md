# 🕐 Cron-job.org Setup Guide
## Otomatik Bildirim Sistemi

---

## 📋 **Genel Bakış**

Bu rehber, **cron-job.org** servisini kullanarak Flask API endpoint'lerini otomatik olarak tetiklemek için gerekli adımları açıklar.

### **Neden Cron-job.org?**

PythonAnywhere free tier'da built-in cron job yok. Bu yüzden external bir cron servisi kullanıyoruz.

---

## 🔧 **1. Cron-job.org Hesap Oluşturma**

### **Adımlar:**

1. **https://cron-job.org** sitesine git
2. **Sign Up** → Ücretsiz hesap oluştur
3. **Email doğrulama** yap
4. **Dashboard**'a gir

---

## 📅 **2. Cron Job'ları Oluşturma**

### **A. Günlük Hatırlatma (Daily Reminder)**

**Amaç:** Her gün saat 20:00'de günlük yazma hatırlatması gönder

#### **Ayarlar:**

```
Title: Flow Journal - Daily Reminder
URL: https://mberzah.pythonanywhere.com/trigger-daily-reminder?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1
Schedule: Every day at 20:00 (Türkiye saati - UTC+3)
Notification: Sadece hata durumunda email gönder
```

#### **Cron Expression:**
```
0 17 * * *
```
*(UTC saatine göre - Türkiye 20:00 = UTC 17:00)*

---

### **B. Proje Deadline Kontrolü**

**Amaç:** Her gün saat 09:00'da proje deadline'larını kontrol et

#### **Ayarlar:**

```
Title: Flow Journal - Project Deadline Check
URL: https://mberzah.pythonanywhere.com/check-project-deadlines?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1
Schedule: Every day at 09:00 (Türkiye saati)
Notification: Sadece hata durumunda email gönder
```

#### **Cron Expression:**
```
0 6 * * *
```
*(UTC saatine göre - Türkiye 09:00 = UTC 06:00)*

---

### **C. Proje Son Günü Hatırlatıcısı**

**Amaç:** Her gün saat 08:00'de proje son günü bildirimi gönder

#### **Ayarlar:**

```
Title: Flow Journal - Project Last Day Reminder
URL: https://mberzah.pythonanywhere.com/trigger-project-deadline-reminder?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1
Schedule: Every day at 08:00 (Türkiye saati)
Notification: Sadece hata durumunda email gönder
```

#### **Cron Expression:**
```
0 5 * * *
```
*(UTC saatine göre - Türkiye 08:00 = UTC 05:00)*

---

## 🔐 **3. Güvenlik Ayarları**

### **Secret Key Koruma:**

Cron-job.org'da secret key URL'de görünüyor. Alternatif olarak:

#### **Option 1: Query Parameter (Şu anki)**
```
?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1
```

#### **Option 2: Custom Header (Daha Güvenli)**
```
X-API-Key: py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1
```

**Önerilen:** Query parameter yeterli çünkü cron-job.org SSL kullanıyor.

---

## 📊 **4. Monitoring ve Logging**

### **Cron-job.org Dashboard:**

- ✅ **Execution History:** Son çalıştırmaları görebilirsin
- ✅ **Success Rate:** Başarı oranını takip edebilirsin
- ✅ **Email Alerts:** Hata durumunda email alırsın

### **PythonAnywhere Logs:**

PythonAnywhere'deki **error.log** ve **server.log** dosyalarını kontrol et:

```bash
# PythonAnywhere Console'da
tail -f /var/log/mberzah.pythonanywhere.com.error.log
tail -f /var/log/mberzah.pythonanywhere.com.server.log
```

---

## 🧪 **5. Test Senaryosu**

### **Manuel Test (Hemen Çalıştır):**

1. **Cron-job.org Dashboard'a git**
2. **Job'u seç**
3. **"Run now"** butonuna tık
4. **Execution log'u kontrol et**

### **Test Endpoint'leri (Local):**

```bash
# Test 1: Daily Reminder
curl "https://mberzah.pythonanywhere.com/trigger-daily-reminder?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1"

# Test 2: Project Deadline Check
curl "https://mberzah.pythonanywhere.com/check-project-deadlines?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1"

# Test 3: Project Last Day Reminder
curl "https://mberzah.pythonanywhere.com/trigger-project-deadline-reminder?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1"
```

---

## 📅 **6. Zamanlama Tablosu**

| Job | Saat (TR) | Saat (UTC) | Cron Expression | Amaç |
|-----|-----------|-----------|-----------------|------|
| **Proje Son Günü** | 08:00 | 05:00 | `0 5 * * *` | Last_day topic'e bildirim |
| **Deadline Check** | 09:00 | 06:00 | `0 6 * * *` | Firestore'dan deadline kontrol |
| **Günlük Hatırlatma** | 20:00 | 17:00 | `0 17 * * *` | Daily_reminders topic'e bildirim |

---

## 🎯 **7. Kurulum Adımları (Özet)**

### **Hızlı Kurulum:**

1. ✅ **cron-job.org**'a üye ol
2. ✅ **3 adet cron job oluştur** (yukarıdaki ayarlarla)
3. ✅ **Test et** ("Run now" butonu)
4. ✅ **Email notifications**'ı aktif et (sadece hata için)
5. ✅ **Execution history**'yi kontrol et

### **Dashboard Link:**
```
https://console.cron-job.org/jobs
```

---

## 🔧 **8. Troubleshooting**

### **Problem 1: Job Başarısız Oluyor**

**Çözüm:**
- Secret key'i kontrol et
- Flask API'nin çalıştığını doğrula (`/health` endpoint)
- PythonAnywhere log'larını kontrol et

### **Problem 2: Bildirim Gönderilmiyor**

**Çözüm:**
- Firebase Console'da message count'u kontrol et
- React Native app'te topic subscription'ı kontrol et
- FCM token'ın geçerli olduğunu doğrula

### **Problem 3: Timezone Yanlış**

**Çözüm:**
- Cron expression'ı UTC saatine göre ayarla
- Türkiye UTC+3 → UTC saatini hesapla

---

## 📞 **9. Support**

### **Cron-job.org:**
- **Documentation:** https://cron-job.org/en/documentation/
- **Support:** support@cron-job.org

### **PythonAnywhere:**
- **Forum:** https://www.pythonanywhere.com/forums/
- **Help:** help@pythonanywhere.com

---

## ✅ **10. Checklist**

### **Kurulum Tamamlandı mı?**

- [ ] Cron-job.org hesabı oluşturuldu
- [ ] 3 cron job oluşturuldu
- [ ] Secret key ayarlandı
- [ ] Zamanlama ayarlandı (Türkiye saati)
- [ ] Email notifications aktif
- [ ] Manuel test yapıldı
- [ ] Execution history kontrol edildi
- [ ] PythonAnywhere logs kontrol edildi

---

## 🎉 **Kurulum Tamamlandı!**

Artık Flow Journal bildirim sistemi tamamen otomatik çalışıyor! 🚀

**Test için bir gün bekle ve:**
- React Native app'te bildirimleri kontrol et
- Cron-job.org dashboard'unda execution history'ye bak
- Firebase Console'da message statistics'i kontrol et

---

## 📊 **Expected Results**

### **Her Gün:**

- **08:00:** Proje son günü hatırlatıcısı (Last_day topic)
- **09:00:** Proje deadline kontrolü (Firestore'dan)
- **20:00:** Günlük hatırlatma (daily_reminders topic)

### **Firebase Console:**

```
Messages sent (last 7 days):
- Daily reminders: 7
- Project deadlines: varies
- Last day reminders: varies
```

---

**Son Güncelleme:** 2025-10-09  
**Versiyon:** 1.0.0

