# ⚡ Cron-job.org Hızlı Kurulum
## 5 Dakikada Otomatik Bildirim Sistemi

---

## 🚀 **Hızlı Başlangıç**

### **1️⃣ Hesap Oluştur (2 dk)**

1. **https://cron-job.org/en/signup** → Sign up
2. Email doğrula
3. **https://console.cron-job.org** → Login

---

### **2️⃣ İlk Cron Job'u Oluştur (3 dk)**

#### **Dashboard'da "Create cronjob" butonuna tık**

---

## 📋 **Job #1: Günlük Hatırlatma**

### **Ayarlar:**

```
Title:
  Flow Journal - Daily Reminder

URL:
  https://mberzah.pythonanywhere.com/trigger-daily-reminder?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1

Schedule:
  Days: Every day
  Time: 17:00 (UTC) → 20:00 (Türkiye)
  
Advanced:
  Request method: GET
  Request timeout: 30 seconds
  
Notifications:
  ☑️ Only notify me in case of errors
```

### **Save & Enable!** ✅

---

## 📋 **Job #2: Proje Deadline Kontrolü**

### **Ayarlar:**

```
Title:
  Flow Journal - Deadline Check

URL:
  https://mberzah.pythonanywhere.com/check-project-deadlines?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1

Schedule:
  Days: Every day
  Time: 06:00 (UTC) → 09:00 (Türkiye)
  
Advanced:
  Request method: GET
  Request timeout: 60 seconds
  
Notifications:
  ☑️ Only notify me in case of errors
```

### **Save & Enable!** ✅

---

## 📋 **Job #3: Proje Son Günü**

### **Ayarlar:**

```
Title:
  Flow Journal - Last Day Reminder

URL:
  https://mberzah.pythonanywhere.com/trigger-project-deadline-reminder?secret=py_mberzah_fcm_secret_2025_secure_key_a7b9c4d8e2f1

Schedule:
  Days: Every day
  Time: 05:00 (UTC) → 08:00 (Türkiye)
  
Advanced:
  Request method: GET
  Request timeout: 30 seconds
  
Notifications:
  ☑️ Only notify me in case of errors
```

### **Save & Enable!** ✅

---

## 🧪 **3️⃣ Test Et (1 dk)**

### **Her Job için:**

1. **Job'a tıkla**
2. **"Run now"** butonuna bas
3. **Execution log**'u kontrol et
4. ✅ **Status 200** görmeli veya **success: true**

---

## 📊 **4️⃣ Monitoring**

### **Dashboard'da görmelisin:**

```
✅ Flow Journal - Daily Reminder      | Next: Today 17:00 UTC
✅ Flow Journal - Deadline Check      | Next: Tomorrow 06:00 UTC  
✅ Flow Journal - Last Day Reminder   | Next: Tomorrow 05:00 UTC
```

---

## ✅ **Kurulum Tamamlandı!**

### **Günlük Çalışma Sırası:**

- 🕔 **05:00 UTC** (08:00 TR) → Proje son günü hatırlatıcısı
- 🕕 **06:00 UTC** (09:00 TR) → Proje deadline kontrolü
- 🕔 **17:00 UTC** (20:00 TR) → Günlük hatırlatma

---

## 🔧 **Troubleshooting**

### **Test Failed?**

```bash
# Manuel test
curl "https://mberzah.pythonanywhere.com/health"

# Expected: {"status": "healthy", "firebase": "initialized"}
```

### **Notification Gelmiyor?**

1. React Native app'te topic subscription kontrol et
2. Firebase Console → Cloud Messaging → kontrol et
3. PythonAnywhere logs kontrol et

---

## 📞 **Yardım**

Sorun olursa:
1. Cron-job.org execution history kontrol et
2. PythonAnywhere error logs kontrol et
3. Flask API `/health` endpoint test et

---

**🎉 Artık sistem tamamen otomatik çalışıyor!**

**Son Güncelleme:** 2025-10-09

