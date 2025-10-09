# 🔥 Firebase Mimarisi - Basit Anlatım

Firebase'i **en basit şekilde** anlayabilmen için hazırladım! 😊

---

## 🤔 Firebase Nedir?

**Basit Cevap:** Firebase, Google'ın hazır backend servisidir. Kendi backend'ini kodlamana gerek kalmadan:
- Veritabanı (Firestore)
- Kullanıcı girişi (Authentication)
- Bildirimler (Cloud Messaging)
- Dosya depolama (Storage)
- Fonksiyonlar (Cloud Functions)

...gibi şeyleri **anında** kullanabilirsin!

---

## 📊 Bizim Projede Firebase'i Nasıl Kullanıyoruz?

### 🎯 Şu Anda Kullandığımız

```
Flow Journal App
    │
    ├── 🔔 Firebase Cloud Messaging (FCM)
    │   └── Push bildirimleri göndermek için
    │
    └── 🔥 Firestore Database (Hazırlık aşamasında)
        └── Kullanıcı ve proje verilerini saklamak için
```

### ⏳ Gelecekte Ekleyeceğimiz

```
    ├── 🔐 Firebase Authentication
    │   └── Kullanıcı giriş/kayıt
    │
    ├── ⚡ Cloud Functions
    │   └── Otomatik bildirim gönderme
    │
    └── 📦 Firebase Storage
        └── Fotoğraf/dosya yükleme
```

---

## 🏗️ Firebase Mimarisi - ELI5 (5 Yaşındaymış Gibi Anlat)

### 1️⃣ Firestore = Bulutta Excel Tablosu 📊

**Normal Excel:**
```
Satır 1: Ahmet | 25 | İstanbul
Satır 2: Mehmet | 30 | Ankara
```

**Firestore:**
```
users/
  ├── ahmet/
  │   ├── yaş: 25
  │   └── şehir: İstanbul
  └── mehmet/
      ├── yaş: 30
      └── şehir: Ankara
```

**Fark:** 
- Excel → Bilgisayarında
- Firestore → Google'ın bulutunda (her yerden erişilebilir!)

---

### 2️⃣ Collection & Document = Klasör & Dosya 📁

Bilgisayarındaki klasör yapısı gibi düşün:

```
📁 C:\Users\
    📁 Berzah\
        📄 profil.txt
        📁 Projeler\
            📄 proje1.txt
            📄 proje2.txt
```

**Firestore'da aynısı:**

```
📁 users (Collection = Klasör)
    📄 test-user (Document = Dosya)
        data: { isim: "Berzah", ... }
        📁 projects (Subcollection = Alt klasör)
            📄 proje1 (Document)
            📄 proje2 (Document)
```

---

## 🎯 Bizim Projede Firestore Yapısı

### Senaryo: Bir kullanıcının 2 projesi var

```
🔥 Firestore Database
│
└── 👥 users (Collection)
    └── 📄 berzah (Document)
        │
        ├── Data (Document içindeki bilgiler):
        │   ├── fcmToken: "abc123..."
        │   ├── timezone: "Europe/Istanbul"
        │   └── language: "tr"
        │
        └── 📁 projects (Subcollection)
            │
            ├── 📄 project-001 (Document)
            │   ├── title: "Mobil Uygulama"
            │   ├── startDate: 1 Ocak 2025
            │   ├── endDate: 15 Ocak 2025
            │   └── status: "active"
            │
            └── 📄 project-002 (Document)
                ├── title: "Blog Sitesi"
                ├── startDate: 5 Ocak 2025
                ├── endDate: 20 Ocak 2025
                └── status: "active"
```

---

## 📱 Veri Akışı - Adım Adım

### Senaryo: Kullanıcı yeni proje oluşturuyor

```
┌─────────────────────────────────────────────────────────────┐
│ ADIM 1: Kullanıcı App'te "Yeni Proje" ekler                │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ ADIM 2: React Native (TaskContext)                         │
│   → AsyncStorage'a kaydet (telefonda)                       │
│   → tasks = [...tasks, newProject]                          │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ ADIM 3: FirestoreService (Gelecekte)                       │
│   → Firestore'a da gönder (bulutta)                         │
│   → db.collection('users/berzah/projects').add(newProject)  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ ADIM 4: Firestore Database (Google Cloud)                  │
│   → Veriyi bulutta sakla                                    │
│   → Tüm cihazlardan erişilebilir                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔔 Bildirim Sistemi - Detaylı Akış

### Senaryo: Projenin son günü geldi, bildirim gönder

```
┌──────────────────────────────────────────────────────────────┐
│ ADIM 1: Sabah 09:00 - Cron-job.org tetiklenir              │
│   → Her gün otomatik çalışır                                │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ ADIM 2: PythonAnywhere Flask API                           │
│   → https://mberzah.pythonanywhere.com/trigger...           │
│   → Python script çalıştırılır                              │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ ADIM 3: Python Script (2 yöntem var)                       │
│                                                              │
│ YOL 1: Topic-Based (Şu anda kullandığımız)                 │
│   → "Last_day" topic'e bildirim gönder                      │
│   → Tüm aboneler alır                                       │
│                                                              │
│ YOL 2: Firestore-Based (Gelecek)                           │
│   → Firestore'dan kullanıcıları kontrol et                  │
│   → Bugün son günü olan projeleri bul                       │
│   → Sadece o kullanıcılara bildirim gönder                  │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ ADIM 4: Firebase Cloud Messaging (FCM)                     │
│   → Google'ın bildirim servisi                              │
│   → Bildirimi cihazlara ilet                                │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ ADIM 5: Android Cihaz                                       │
│   → Bildirim gelir!                                          │
│   → "🎯 Projenizin Son Günü!"                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎭 İki Yöntem Karşılaştırması

### 🅰️ Topic-Based Notifications (Şu anda)

**Nasıl Çalışır?**
```
1. App açıldığında:
   → ProjectDeadlineService çalışır
   → AsyncStorage'dan projeleri kontrol eder
   → Bugün son günü olan proje var mı?
      ├─ EVET → FCM.subscribe("Last_day")
      └─ HAYIR → FCM.unsubscribe("Last_day")

2. PythonAnywhere (09:00):
   → FCM.sendToTopic("Last_day", "Son günü!")
   → Sadece subscribe olanlar alır!
```

**Avantajları:**
- ✅ Basit
- ✅ Firestore gerekmez
- ✅ AsyncStorage yeterli
- ✅ Expo managed workflow ile çalışır

**Dezavantajları:**
- ❌ App açık olmalı (subscribe için)
- ❌ Kullanıcı bazlı değil, topic bazlı
- ❌ Esneklik az

---

### 🅱️ Firestore-Based Notifications (Gelecek)

**Nasıl Çalışır?**
```
1. App'te proje oluşturulunca:
   → Firestore'a kaydedilir
   → users/{userId}/projects/{projectId}

2. PythonAnywhere (09:00):
   → Firestore'dan TÜM kullanıcıları kontrol et
   → Her kullanıcının projelerini kontrol et
   → Bugün son günü olan var mı?
      ├─ EVET → O kullanıcının FCM token'ına bildirim gönder
      └─ HAYIR → Atla

3. Cloud Functions (Daha gelişmiş):
   → Her gün otomatik çalışır
   → Manuel PythonAnywhere'e gerek yok
```

**Avantajları:**
- ✅ Kullanıcı bazlı bildirimler
- ✅ 7, 3, 1 gün önceden farklı bildirimler
- ✅ Gecikme bildirimi
- ✅ App kapalıyken bile çalışır
- ✅ Çoklu cihaz senkronizasyonu

**Dezavantajları:**
- ❌ Firestore gerekli
- ❌ Expo managed workflow desteklemiyor (henüz)
- ❌ Biraz daha karmaşık

---

## 🔄 Şu Anki Sistemimiz (Topic-Based)

### 1. App Tarafı (React Native)

```javascript
// services/ProjectDeadlineService.js

class ProjectDeadlineService {
  async dailyDeadlineCheck() {
    // 1. AsyncStorage'dan projeleri al
    const tasks = await AsyncStorage.getItem('tasks');
    
    // 2. Bugün son günü olan var mı?
    const hasDeadlineToday = tasks.some(task => 
      task.endDate === today && !task.done
    );
    
    // 3. Varsa subscribe, yoksa unsubscribe
    if (hasDeadlineToday) {
      await FCM.subscribeToTopic('Last_day');
    } else {
      await FCM.unsubscribeFromTopic('Last_day');
    }
  }
}
```

### 2. Backend Tarafı (Python)

```python
# backend/send_project_deadline_reminder.py

def send_notification():
    # Firebase Admin SDK kullan
    message = messaging.Message(
        notification=messaging.Notification(
            title='🎯 Projenizin Son Günü!',
            body='Bugün projenizin son günü...'
        ),
        topic='Last_day'  # Topic'e gönder
    )
    
    # Gönder!
    messaging.send(message)
```

### 3. Zamanlama (Cron-job.org)

```
Her gün 09:00'da:
→ https://mberzah.pythonanywhere.com/trigger-project-deadline-reminder
→ Python script çalışır
→ "Last_day" topic'e bildirim gider
```

---

## 🚀 Gelecekteki Sistemimiz (Firestore-Based)

### 1. App Tarafı (React Native)

```javascript
// services/FirestoreSyncService.js

class FirestoreSyncService {
  async syncProjectToFirestore(project) {
    // Firestore'a kaydet
    await firestore()
      .collection('users')
      .doc(userId)
      .collection('projects')
      .doc(project.id)
      .set({
        title: project.title,
        endDate: project.endDate,
        status: 'active',
        notificationsSent: {
          sevenDays: false,
          threeDays: false,
          lastDay: false
        }
      });
  }
}
```

### 2. Backend Tarafı (Python)

```python
# backend/check_project_deadlines.py

def check_all_users():
    # Firestore'dan tüm kullanıcıları al
    users = db.collection('users').get()
    
    for user in users:
        # Her kullanıcının projelerini kontrol et
        projects = user.reference.collection('projects').where('status', '==', 'active').get()
        
        for project in projects:
            days_remaining = calculate_days(project.get('endDate'))
            
            # 7 gün kaldıysa
            if days_remaining == 7 and not project.get('notificationsSent.sevenDays'):
                send_notification(user.get('fcmToken'), '7 Gün Kaldı!')
                mark_as_sent(project, 'sevenDays')
            
            # 3 gün kaldıysa
            elif days_remaining == 3 and not project.get('notificationsSent.threeDays'):
                send_notification(user.get('fcmToken'), '3 Gün Kaldı!')
                mark_as_sent(project, 'threeDays')
            
            # Son gün
            elif days_remaining == 0 and not project.get('notificationsSent.lastDay'):
                send_notification(user.get('fcmToken'), 'Son Gün!')
                mark_as_sent(project, 'lastDay')
```

### 3. Cloud Functions (En İyisi)

```javascript
// Firebase Cloud Functions (Google Cloud'da çalışır)

exports.checkProjectDeadlines = functions.pubsub
  .schedule('every day 09:00')
  .timeZone('Europe/Istanbul')
  .onRun(async (context) => {
    // Yukarıdaki Python kodunun aynısı
    // Ama Google Cloud'da otomatik çalışır!
  });
```

---

## 🗂️ Firestore Veri Yapısı - Pratik Örnek

### Örnek: "Berzah" kullanıcısının 2 projesi

**Firebase Console'da Görünüm:**

```
Firestore Database
├── users (collection)
│   └── berzah (document)
│       ├── fcmToken: "eYz9Vh3..."
│       ├── timezone: "Europe/Istanbul"
│       ├── language: "tr"
│       └── projects (subcollection)
│           ├── 1736428800000 (document)
│           │   ├── id: 1736428800000
│           │   ├── title: "Mobil Uygulama Geliştirme"
│           │   ├── startDate: 2025-01-01
│           │   ├── endDate: 2025-01-15
│           │   ├── status: "active"
│           │   ├── milestones: [...]
│           │   ├── journals: [...]
│           │   └── notificationsSent:
│           │       ├── sevenDays: false
│           │       ├── threeDays: false
│           │       └── lastDay: false
│           │
│           └── 1736515200000 (document)
│               ├── id: 1736515200000
│               ├── title: "Blog Sitesi"
│               ├── startDate: 2025-01-05
│               ├── endDate: 2025-01-20
│               └── ...
```

**Python ile Okuma:**

```python
# Kullanıcının projelerini al
projects = db.collection('users').document('berzah').collection('projects').get()

for project in projects:
    print(project.get('title'))
    print(project.get('endDate'))
```

**React Native ile Okuma:**

```javascript
// Kullanıcının projelerini al
const projects = await firestore()
  .collection('users')
  .doc('berzah')
  .collection('projects')
  .get();

projects.forEach(doc => {
  console.log(doc.data().title);
  console.log(doc.data().endDate);
});
```

---

## 🎯 Firebase Components Detayı

### 1. Firebase Cloud Messaging (FCM)

**Ne İşe Yarar?**
- Push bildirim gönderir

**Nasıl Çalışır?**
```
1. App açıldığında FCM token alır (benzersiz ID)
   → Token: "eYz9Vh3Kx7..."

2. Backend'e bu token'ı kaydederiz:
   → Firestore: users/berzah/fcmToken = "eYz9Vh3..."

3. Bildirim göndermek istediğinde:
   → Backend: FCM.send(token, "Mesaj!")
   → FCM: Cihaza iletir
   → Cihaz: Bildirim gösterir
```

**Topic Sistemi:**
```
// Subscribe (abone ol)
FCM.subscribeToTopic('Last_day');

// Backend'den gönder
FCM.sendToTopic('Last_day', 'Mesaj!');

// Unsubscribe (abonelikten çık)
FCM.unsubscribeFromTopic('Last_day');
```

---

### 2. Firestore Database

**Ne İşe Yarar?**
- NoSQL database (SQL'e benzer ama daha esnek)
- Bulutta veri saklar
- Gerçek zamanlı senkronizasyon

**Nasıl Çalışır?**
```
// Veri Yaz
await db.collection('users').doc('berzah').set({
  isim: 'Berzah',
  yaş: 25
});

// Veri Oku
const user = await db.collection('users').doc('berzah').get();
console.log(user.data().isim); // "Berzah"

// Veri Güncelle
await db.collection('users').doc('berzah').update({
  yaş: 26
});

// Veri Sil
await db.collection('users').doc('berzah').delete();
```

**Realtime Updates:**
```
// Veri değişince otomatik güncelle
db.collection('users').doc('berzah').onSnapshot(snapshot => {
  console.log('Veri değişti!', snapshot.data());
});
```

---

### 3. Cloud Functions

**Ne İşe Yarar?**
- Google Cloud'da çalışan fonksiyonlar
- Backend kodunu Google yönetir
- Otomatik ölçeklendirme

**Örnek:**
```javascript
// Firestore'da yeni proje oluşturulunca çalışır
exports.onProjectCreated = functions.firestore
  .document('users/{userId}/projects/{projectId}')
  .onCreate((snapshot, context) => {
    const project = snapshot.data();
    console.log('Yeni proje:', project.title);
    
    // Hoşgeldin bildirimi gönder
    return sendNotification(context.params.userId, 'Proje oluşturuldu!');
  });

// Her gün 09:00'da çalışır
exports.dailyCheck = functions.pubsub
  .schedule('every day 09:00')
  .onRun(() => {
    return checkAllProjectDeadlines();
  });
```

---

## 🔐 Firebase Security Rules

**Ne İşe Yarar?**
- Kimin ne okuyabileceğini/yazabileceğini kontrol eder

**Örnek:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Kullanıcı sadece kendi verilerine erişebilir
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      
      // Herkes kendi projelerini görebilir
      match /projects/{projectId} {
        allow read: if request.auth.uid == userId;
        allow write: if request.auth.uid == userId;
      }
    }
  }
}
```

**Açıklama:**
```
✅ Berzah → users/berzah → İZİNLİ
❌ Berzah → users/ahmet → İZİNSİZ
```

---

## 🎓 Özet: Hangi Sistem Ne Zaman?

### Şu Anda (AsyncStorage + FCM Topics)

```
✅ Kullan:
- Basit bildirimler için
- Firestore olmadan çalışmak için
- Expo managed workflow zorunluysa

❌ Kullanma:
- Kullanıcı bazlı bildirimler için
- Çoklu cihaz sync için
- Detaylı bildirim kontrolü için
```

### Gelecekte (Firestore + Cloud Functions)

```
✅ Kullan:
- Kullanıcı bazlı bildirimler
- 7-3-1 gün önceden farklı mesajlar
- Çoklu cihaz senkronizasyonu
- Ölçeklenebilir sistem

❌ Kullanma:
- Expo managed workflow şu anda desteklemiyor
- Biraz daha karmaşık
```

---

## 📚 Faydalı Kaynaklar

### Firebase Dokümantasyon
- [Firestore Get Started](https://firebase.google.com/docs/firestore/quickstart)
- [FCM Overview](https://firebase.google.com/docs/cloud-messaging)
- [Cloud Functions](https://firebase.google.com/docs/functions)

### Video Tutorials
- [Fireship: Firestore in 100 Seconds](https://youtu.be/v_hR4K4auoQ)
- [Firebase Tutorial for Beginners](https://youtu.be/9kRgVxULbag)

### Bizim Dökümanlar
- `FIRESTORE_QUICK_START.md` → Hızlı başlangıç
- `FIRESTORE_DATABASE_SETUP.md` → Detaylı setup
- `FIRESTORE_VISUAL_STRUCTURE.md` → Görsel yapı

---

## 💡 Sık Sorulan Sorular

### S1: AsyncStorage ile Firestore arasındaki fark nedir?

**AsyncStorage:**
- 📱 Sadece o cihazda
- ❌ Başka cihazdan erişemezsin
- ✅ İnternet olmadan çalışır
- ✅ Basit
- ❌ Senkronizasyon yok

**Firestore:**
- ☁️ Bulutta (Google'da)
- ✅ Her cihazdan erişebilirsin
- ❌ İnternet gerekir
- ❌ Biraz karmaşık
- ✅ Otomatik senkronizasyon

**İkisini Beraber Kullan:**
```
AsyncStorage (local) ↔ Senkronizasyon ↔ Firestore (cloud)
```

---

### S2: FCM Topic ne demek?

**Açıklama:**
- Topic = Kanal (YouTube kanalı gibi)
- Subscribe = Abone ol
- Unsubscribe = Abonelikten çık

**Örnek:**
```
Topic: "haberler"
- Ahmet subscribe oldu → Haber alır
- Mehmet subscribe olmadı → Haber almaz

Backend: FCM.sendToTopic("haberler", "Yeni haber!")
→ Sadece Ahmet alır
```

---

### S3: Cloud Functions neden gerekli?

**Şu anki sistem:**
```
PythonAnywhere (manuel)
└── Her gün 09:00 cron job
    └── Script çalıştır
    └── Bildirim gönder
```

**Cloud Functions ile:**
```
Google Cloud (otomatik)
└── Kendisi her gün 09:00 çalışır
    └── Ölçeklendirme otomatik
    └── Her şeyi Google yönetir
```

**Avantajı:** Sen hiçbir şey yapmazsın, Google halleder!

---

## 🎉 Sonuç

Firebase karmaşık görünse de aslında çok basit:

1. **Firestore** = Buluttaki Excel
2. **FCM** = Bildirim gönderme sistemi
3. **Cloud Functions** = Otomatik çalışan kod
4. **Topic** = Bildirim kanalı
5. **Security Rules** = Kimin ne okuyabileceği

**Bizim sistemimiz:**
```
AsyncStorage (telefonda) + FCM Topics (şu anda)
↓
Firestore (bulutta) + Cloud Functions (gelecek)
```

Kafan karıştığında bu dökümanı oku! Her şey netleşir! 😊

---

**Proje:** Flow Journal - WIT App  
**Hazırlayan:** AI Assistant (Sana özel! 💖)  
**Tarih:** 2025-10-09

