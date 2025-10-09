# 🎨 Firebase Firestore - Visual Database Structure

Bu döküman, Firestore database'inin görsel yapısını gösterir.

---

## 📊 Database Tree View

```
🔥 Firestore Database
│
└── 👥 users (Collection)
    │
    └── 📄 {userId} (Document - örn: "test-user")
        │
        ├── 🔑 fcmToken: "dXY1Z2hpajkwMTIzNDU2Nzg5..."
        ├── 🌍 timezone: "Europe/Istanbul"
        ├── 🗣️ language: "tr"
        ├── 📅 createdAt: 2025-10-09T08:00:00Z
        ├── 🔄 lastUpdated: 2025-10-09T08:00:00Z
        │
        ├── 🔔 notificationPreferences (Map)
        │   ├── dailyReminder: true
        │   ├── projectDeadlines: true
        │   ├── milestoneReminders: true
        │   └── reminderTime: "08:00"
        │
        └── 📁 projects (Subcollection)
            │
            ├── 📄 {projectId} (Document - örn: "1734567890000")
            │   │
            │   ├── 🆔 id: 1734567890000
            │   ├── 📝 title: "Mobil Uygulama Geliştirme"
            │   ├── 📖 description: "React Native ile modern mobil uygulama"
            │   ├── 📅 startDate: 2024-12-10T00:00:00Z
            │   ├── ⏰ endDate: 2025-01-12T00:00:00Z
            │   ├── 🎯 status: "active"
            │   ├── ✅ done: false
            │   ├── 🕐 createdAt: 2025-01-09T08:00:00Z
            │   ├── 🔄 updatedAt: 2025-01-09T08:00:00Z
            │   │
            │   ├── 🎯 milestones (Array)
            │   │   ├── [0] {
            │   │   │     id: 1,
            │   │   │     text: "UI/UX Tasarımı",
            │   │   │     completed: true,
            │   │   │     color: "#FF6B6B",
            │   │   │     createdAt: 2024-12-15T00:00:00Z
            │   │   │   }
            │   │   ├── [1] {
            │   │   │     id: 2,
            │   │   │     text: "Backend API Entegrasyonu",
            │   │   │     completed: true,
            │   │   │     color: "#4ECDC4",
            │   │   │     createdAt: 2024-12-20T00:00:00Z
            │   │   │   }
            │   │   └── [2] {
            │   │         id: 3,
            │   │         text: "Testing ve Debug",
            │   │         completed: false,
            │   │         color: "#FFE66D",
            │   │         createdAt: 2024-12-25T00:00:00Z
            │   │       }
            │   │
            │   ├── 📔 journals (Array)
            │   │   ├── [0] {
            │   │   │     id: 1,
            │   │   │     text: "Harika bir gün! Tasarımları tamamladık.",
            │   │   │     emoji: "😊",
            │   │   │     date: 2024-12-15T00:00:00Z
            │   │   │   }
            │   │   └── [1] {
            │   │         id: 2,
            │   │         text: "Backend entegrasyonu biraz zorlandı ama başardık.",
            │   │         emoji: "💪",
            │   │         date: 2024-12-20T00:00:00Z
            │   │       }
            │   │
            │   └── 🔔 notificationsSent (Map)
            │       ├── sevenDays: false
            │       ├── threeDays: false
            │       ├── lastDay: false
            │       └── overdue: false
            │
            ├── 📄 1734567891111 (Document)
            │   └── ... (Kişisel Blog Sitesi)
            │
            ├── 📄 1734567892222 (Document)
            │   └── ... (E-Ticaret Dashboard - Tamamlanmış)
            │
            └── 📄 1734567893333 (Document)
                └── ... (AI Chatbot Entegrasyonu)
```

---

## 🎯 Collection & Document Hierarchy

### Level 1: Users Collection

```
Collection: users
├── Purpose: Kullanıcı verilerini saklar
├── Document ID: userId (örn: "test-user", Firebase Auth UID)
└── Type: Root Collection
```

### Level 2: User Document

```
Document: users/{userId}
├── Fields: 
│   ├── fcmToken (string) → Firebase Cloud Messaging token
│   ├── timezone (string) → Kullanıcı saat dilimi
│   ├── language (string) → Uygulama dili
│   ├── createdAt (timestamp) → Hesap oluşturma zamanı
│   ├── lastUpdated (timestamp) → Son güncelleme
│   └── notificationPreferences (map) → Bildirim tercihleri
└── Subcollections: projects
```

### Level 3: Projects Subcollection

```
Subcollection: users/{userId}/projects
├── Purpose: Kullanıcının projelerini saklar
├── Document ID: projectId (örn: "1734567890000", timestamp)
└── Type: Subcollection
```

### Level 4: Project Document

```
Document: users/{userId}/projects/{projectId}
├── Fields:
│   ├── id (number) → Benzersiz proje ID
│   ├── title (string) → Proje başlığı
│   ├── description (string) → Proje açıklaması
│   ├── startDate (timestamp) → Başlangıç tarihi
│   ├── endDate (timestamp) → Bitiş tarihi
│   ├── status (string) → "active" | "completed" | "archived"
│   ├── done (boolean) → Tamamlanma durumu
│   ├── createdAt (timestamp) → Oluşturma zamanı
│   ├── updatedAt (timestamp) → Güncelleme zamanı
│   ├── milestones (array) → Alt görevler listesi
│   ├── journals (array) → Günlük kayıtları
│   └── notificationsSent (map) → Gönderilen bildirimler
└── Subcollections: Yok (şimdilik)
```

---

## 🔍 Data Type Legend

| Simge | Type | Açıklama | Örnek |
|-------|------|----------|-------|
| 📄 | Document | Firestore document | `users/test-user` |
| 📁 | Collection | Firestore collection | `projects` |
| 🔑 | String | Metin değeri | `"test-user"` |
| 🆔 | Number | Sayısal değer | `1734567890000` |
| ✅ | Boolean | True/False | `true`, `false` |
| 📅 | Timestamp | Tarih/Saat | `2025-10-09T08:00:00Z` |
| 🗺️ | Map | Anahtar-değer çifti | `{ key: value }` |
| 📋 | Array | Liste/Dizi | `[item1, item2]` |

---

## 📊 Sample Queries

### Query 1: Aktif Projeler

```javascript
db.collection('users')
  .doc('test-user')
  .collection('projects')
  .where('status', '==', 'active')
  .orderBy('endDate', 'asc')
  .get()
```

**Sonuç:** Bitiş tarihine göre sıralanmış aktif projeler

---

### Query 2: Bugün Biten Projeler

```javascript
const today = new Date();
today.setHours(0, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

db.collection('users')
  .doc('test-user')
  .collection('projects')
  .where('status', '==', 'active')
  .where('endDate', '>=', today)
  .where('endDate', '<', tomorrow)
  .get()
```

**Sonuç:** Bugün son günü olan projeler

---

### Query 3: Bildirim Gönderilmemiş Projeler

```javascript
db.collection('users')
  .doc('test-user')
  .collection('projects')
  .where('status', '==', 'active')
  .where('notificationsSent.lastDay', '==', false)
  .get()
```

**Sonuç:** Son gün bildirimi gönderilmemiş projeler

---

## 🎨 Veri Akışı Diagramı

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native App                         │
│                                                               │
│  ┌──────────────┐     ┌──────────────┐    ┌──────────────┐ │
│  │ TaskContext  │ --> │   Firebase   │ -> │  Firestore   │ │
│  │  (AsyncS.)   │     │  FCM Service │    │   Service    │ │
│  └──────────────┘     └──────────────┘    └──────────────┘ │
│         │                     │                    │         │
└─────────┼─────────────────────┼────────────────────┼─────────┘
          │                     │                    │
          ▼                     ▼                    ▼
  ┌───────────────┐     ┌───────────────┐   ┌───────────────┐
  │  AsyncStorage │     │  FCM Topics   │   │   Firestore   │
  │   (Local)     │     │               │   │   Database    │
  │               │     │ - daily_rem.  │   │               │
  │ - Projects    │     │ - Last_day    │   │ - users/...   │
  │ - Journals    │     └───────────────┘   │ - projects/.. │
  │ - Milestones  │             │            └───────────────┘
  └───────────────┘             │                    │
          │                     │                    │
          │                     ▼                    ▼
          │            ┌────────────────┐   ┌────────────────┐
          │            │ PythonAnywhere │   │ Cloud Functions│
          │            │   Flask API    │   │   (Gelecek)    │
          │            │                │   │                │
          │            │ - send_daily.. │   │ - checkDead..  │
          │            │ - send_projec..│   │ - sendNotif..  │
          │            └────────────────┘   └────────────────┘
          │                     │                    │
          └─────────────────────┴────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  Firebase Cloud       │
                    │  Messaging (FCM)      │
                    │                       │
                    │  → Android Device     │
                    │  → System Notification│
                    └───────────────────────┘
```

---

## 🔄 Lifecycle: Proje Oluşturma → Bildirim

```
1️⃣ USER ACTION
   └─> App'te yeni proje oluştur
       └─> TaskContext.addTask()

2️⃣ LOCAL STORAGE
   └─> AsyncStorage'a kaydet
       └─> STORAGE_KEYS.TASKS

3️⃣ FIRESTORE SYNC (Gelecek)
   └─> FirestoreService.saveProject()
       └─> users/{userId}/projects/{projectId}

4️⃣ FCM TOPIC SUBSCRIPTION
   └─> ProjectDeadlineService.checkAndUpdateDeadlineSubscription()
       └─> Bugün son gün mü?
           ├─> Evet → Subscribe to "Last_day"
           └─> Hayır → Unsubscribe from "Last_day"

5️⃣ BACKEND SCHEDULED CHECK
   └─> Cron-job.org triggers (09:00)
       └─> PythonAnywhere Flask API
           └─> send_project_deadline_reminder.py
               └─> FCM send to "Last_day" topic

6️⃣ NOTIFICATION DELIVERY
   └─> FCM → Android Device
       └─> FCMService.onMessage()
           └─> Local notification (sadece foreground)
```

---

## 📦 Field Types & Constraints

### User Document

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| fcmToken | string | No | `""` | Max 255 chars |
| timezone | string | Yes | `"Europe/Istanbul"` | IANA timezone |
| language | string | Yes | `"tr"` | ISO 639-1 code |
| createdAt | timestamp | Yes | `SERVER_TIMESTAMP` | Auto-generated |
| lastUpdated | timestamp | Yes | `SERVER_TIMESTAMP` | Auto-updated |
| notificationPreferences | map | Yes | See below | - |

### Notification Preferences

| Field | Type | Required | Default |
|-------|------|----------|---------|
| dailyReminder | boolean | Yes | `true` |
| projectDeadlines | boolean | Yes | `true` |
| milestoneReminders | boolean | Yes | `true` |
| reminderTime | string | Yes | `"08:00"` |

### Project Document

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | number | Yes | `Date.now()` | Unique, positive |
| title | string | Yes | - | 1-100 chars |
| description | string | No | `""` | Max 500 chars |
| startDate | timestamp | Yes | - | - |
| endDate | timestamp | Yes | - | After startDate |
| status | string | Yes | `"active"` | Enum: active/completed/archived |
| done | boolean | Yes | `false` | - |
| createdAt | timestamp | Yes | `SERVER_TIMESTAMP` | Auto-generated |
| updatedAt | timestamp | Yes | `SERVER_TIMESTAMP` | Auto-updated |
| milestones | array | No | `[]` | Max 50 items |
| journals | array | No | `[]` | Max 365 items |
| notificationsSent | map | Yes | All false | - |

---

## 🎯 Index Requirements

### Composite Index 1
```
Collection: users/{userId}/projects
Fields: 
  - status (Ascending)
  - endDate (Ascending)
```

### Composite Index 2
```
Collection: users/{userId}/projects
Fields:
  - status (Ascending)
  - notificationsSent.sevenDays (Ascending)
  - endDate (Ascending)
```

**Not:** Firebase Console bu index'leri otomatik olarak önerir.

---

## 🔒 Security Rules Summary

```javascript
✅ Allowed:
- User kendi verilerini okuyabilir/yazabilir
- Admin her şeye erişebilir
- Project CRUD sadece owner için

❌ Denied:
- Başka kullanıcıların verilerini okuma
- Başka kullanıcıların projelerini değiştirme
- Gerekli field'lar olmadan proje oluşturma
- Invalid status değerleri
```

---

## 📊 Storage Estimation

### Per User

| Data Type | Average Size | Max Count | Total Size |
|-----------|--------------|-----------|------------|
| User Profile | ~500 bytes | 1 | 500 bytes |
| Project | ~1 KB | 100 | 100 KB |
| Milestone | ~100 bytes | 50/project | 5 KB/project |
| Journal | ~200 bytes | 365/project | 73 KB/project |
| **Total per user** | - | - | **~7.8 MB** |

### For 1000 Users

```
1000 users × 7.8 MB = 7.8 GB
```

**Firestore Free Tier:** 1 GB → Yeterli değil (500 user için yeterli)  
**Firestore Blaze Plan:** Pay-as-you-go → Önerilen

---

## 🚀 Performance Tips

1. **Index Everything:** Sık kullanılan query'ler için index oluştur
2. **Batch Operations:** Çoklu yazma işlemleri için batch kullan
3. **Offline Persistence:** `enablePersistence()` ile offline support
4. **Pagination:** Büyük listeler için `limit()` ve `startAfter()` kullan
5. **Realtime Updates:** Sadece gerekli yerlerde `onSnapshot()` kullan

---

**Proje:** Flow Journal - WIT App  
**Tarih:** 2025-10-09  
**Version:** 1.0

