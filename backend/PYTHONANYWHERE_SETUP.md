# 🐍 PythonAnywhere Setup - Daily Reminder System

## 📋 **Genel Bakış**

Bu dokümantasyon, **FCM (Firebase Cloud Messaging)** ile **PythonAnywhere** üzerinde günlük hatırlatma sistemi kurulumunu açıklar.

**Sistem Mimarisi:**
- ✅ **React Native App** → FCM topic'e subscribe
- ✅ **PythonAnywhere** → Scheduled task ile günlük bildirim gönder
- ✅ **Firebase FCM** → Topic'teki tüm cihazlara bildirim ilet

---

## 🔧 **1. Firebase Admin SDK Kurulumu**

### **A) PythonAnywhere'e Giriş Yap**
https://www.pythonanywhere.com → **Login**

### **B) Bash Console Aç**
`Consoles` sekmesi → **Bash**

### **C) Firebase Admin SDK Yükle**
```bash
pip3 install --user firebase-admin
```

**Kontrol:**
```bash
pip3 list | grep firebase
```

Çıktı:
```
firebase-admin   6.x.x
```

---

## 📁 **2. Firebase Service Account Key Yükle**

### **A) Firebase Console'dan Key İndir**
1. https://console.firebase.google.com
2. **Project Settings** (⚙️) → **Service Accounts** sekmesi
3. **Generate new private key** → **Generate key**
4. `serviceAccountKey.json` dosyasını indir

### **B) PythonAnywhere'e Yükle**
1. **Files** sekmesine git
2. `mysite` dizinine git (veya kendi dizinin)
3. **Upload a file** → `serviceAccountKey.json` seç

**Path:**
```
/home/KULLANICI_ADIN/mysite/serviceAccountKey.json
```

---

## 📝 **3. Python Script Oluştur**

### **A) Script Dosyasını Yükle**
1. **Files** sekmesi → `mysite` dizini
2. **Upload a file** → `send_daily_reminder.py` seç
   (Veya **New file** ile oluştur ve içeriği yapıştır)

### **B) Script İçeriğini Kontrol Et**
`send_daily_reminder.py` dosyasını aç ve şu satırı bul:

```python
cred_path = '/home/KULLANICI_ADIN/mysite/serviceAccountKey.json'
```

**⚠️ ÖNEMLİ:** `KULLANICI_ADIN` kısmını kendi PythonAnywhere kullanıcı adınla değiştir!

**Örnek:**
```python
cred_path = '/home/berzah/mysite/serviceAccountKey.json'
```

---

## 🧪 **4. Script'i Test Et**

### **Bash Console'dan Test:**
```bash
cd ~/mysite
python3 send_daily_reminder.py
```

### **Beklenen Çıktı:**
```
🚀 PythonAnywhere Daily Reminder Script başlatılıyor...
============================================================
✅ Firebase Admin SDK başlatıldı
📅 Günlük hatırlatma gönderiliyor... (2025-10-08 20:30:00)
✅ Bildirim başarıyla gönderildi!
📱 Message ID: projects/witapp-fcm/messages/0:1234567890
🔥 Topic: daily_reminders
============================================================
✅ Script başarıyla tamamlandı!
```

**Telefonuna HEMEN bildirim gelmeli!** 🔥

### **Hata Durumunda:**
```
❌ serviceAccountKey.json bulunamadı: /home/xxx/mysite/serviceAccountKey.json
```
→ Path'i kontrol et, `KULLANICI_ADIN` doğru mu?

```
❌ Firebase başlatma hatası: Permission denied
```
→ `serviceAccountKey.json` dosyasının izinlerini kontrol et

---

## ⏰ **5. Scheduled Task Oluştur**

### **A) Tasks Sekmesine Git**
**Tasks** sekmesi → **Create a new scheduled task**

### **B) Task Ayarları**

**Hour:** `16` (UTC saat)  
**Minute:** `00`

**Command:**
```bash
python3 /home/KULLANICI_ADIN/mysite/send_daily_reminder.py
```

**⚠️ ÖNEMLİ:** `KULLANICI_ADIN` kısmını değiştir!

**Örnek:**
```bash
python3 /home/berzah/mysite/send_daily_reminder.py
```

### **C) Create Butonuna Bas** ✅

---

## 🕐 **6. Saat Hesaplama**

### **Türkiye Saati → UTC:**
- Türkiye = **UTC+3**
- **19:00 Türkiye** = **16:00 UTC** ✅
- **20:00 Türkiye** = **17:00 UTC**
- **21:00 Türkiye** = **18:00 UTC**

### **Task Hour Ayarı:**
```
19:00 Türkiye için → Hour: 16
```

---

## 🔥 **7. Task'ı Hemen Test Et**

### **Run Now Butonu:**
1. **Tasks** listesinde yeni task'ını gör
2. Sağ tarafta **"Run now"** butonuna bas
3. **Telefonuna HEMEN bildirim gelmeli!** 🔥

### **Log Kontrol:**
1. Task'ın yanında **log link** var
2. Tıkla ve çıktıyı gör:
   ```
   ✅ Firebase Admin SDK başlatıldı
   ✅ Bildirim başarıyla gönderildi!
   ```

---

## 📱 **8. React Native App Tarafı**

### **App.js:**
```javascript
// Otomatik olarak daily reminders topic'ine subscribe ol
const subscribed = await fcmService.subscribeToDailyReminders();
```

### **Kontrol:**
Uygulama başladığında konsol logları:
```
✅ FCM token başarıyla alındı: eExyBGCm...
✅ Daily reminders topic'ine subscribe olundu!
✅ Bildirimler PythonAnywhere + FCM ile gelecek
```

---

## ✅ **Kontrol Listesi**

- [ ] Firebase Admin SDK yüklü (`pip3 install --user firebase-admin`)
- [ ] `serviceAccountKey.json` yüklendi
- [ ] `send_daily_reminder.py` script'i yüklendi
- [ ] Script'te `KULLANICI_ADIN` değiştirildi
- [ ] Script test edildi (`python3 send_daily_reminder.py`)
- [ ] Telefonuna test bildirimi geldi ✅
- [ ] Scheduled task oluşturuldu (Hour: 16)
- [ ] Task command'ında `KULLANICI_ADIN` değiştirildi
- [ ] "Run now" ile task test edildi
- [ ] Task log'ları kontrol edildi

---

## 🐛 **Sorun Giderme**

### **1. Bildirim Gelmiyor**
- ✅ Uygulama açık mı? FCM token alındı mı?
- ✅ Topic'e subscribe olundu mu? (`✅ Daily reminders topic'ine subscribe olundu!`)
- ✅ PythonAnywhere task çalıştı mı? (Log kontrol et)
- ✅ Firebase Console → Cloud Messaging → Topic mesajı göndermeyi test et

### **2. Task Hata Veriyor**
- ✅ `KULLANICI_ADIN` doğru mu?
- ✅ `serviceAccountKey.json` path'i doğru mu?
- ✅ Python version: `python3 --version` (3.8+ olmalı)
- ✅ Firebase Admin SDK yüklü mü? `pip3 list | grep firebase`

### **3. Script Elle Çalışıyor Ama Task Çalışmıyor**
- ✅ Task command'ı tam path ile yazıldı mı?
- ✅ Task enabled mi? (Disabled olabilir)
- ✅ Task saati doğru mu? (UTC saat kullan)

---

## 📞 **Destek**

Sorun mu yaşıyorsun? Konsol loglarını ve error mesajlarını paylaş!

**Gerekli Bilgiler:**
1. Uygulama konsol logları (FCM token, topic subscription)
2. PythonAnywhere task log'ları
3. `python3 send_daily_reminder.py` çıktısı

---

## 🎉 **Başarı!**

Her şey çalışıyorsa:
- ✅ Uygulama başladığında otomatik topic'e subscribe olur
- ✅ PythonAnywhere her gün 19:00'da (Türkiye saati) bildirim gönderir
- ✅ FCM tüm abone cihazlara bildirimi iletir
- ✅ Bildirim hem foreground hem background'da gelir

**Sistem tamamen otomatik çalışır!** 🚀🔥

