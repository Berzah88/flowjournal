# 🔥 Firebase Firestore Database Setup Guide

## 📋 İçerik
1. [Firestore Collection Yapısı](#firestore-collection-yapısı)
2. [Güvenlik Kuralları](#güvenlik-kuralları)
3. [Index Yapılandırması](#index-yapılandırması)
4. [Test Verisi Oluşturma](#test-verisi-oluşturma)
5. [Veri Yapısı Örnekleri](#veri-yapısı-örnekleri)

---

## 🏗️ Firestore Collection Yapısı

### 1. `users` Collection

```
users/{userId}/
  ├── profile (document)
  │   ├── fcmToken: string
  │   ├── timezone: string (default: "Europe/Istanbul")
  │   ├── language: string (default: "tr")
  │   ├── createdAt: timestamp
  │   ├── lastUpdated: timestamp
  │   └── notificationPreferences: map
  │       ├── dailyReminder: boolean
  │       ├── projectDeadlines: boolean
  │       ├── milestoneReminders: boolean
  │       └── reminderTime: string (HH:MM format)
  │
  └── projects (subcollection)
      └── {projectId}/
          ├── id: number
          ├── title: string
          ├── description: string
          ├── startDate: timestamp
          ├── endDate: timestamp
          ├── status: string ("active" | "completed" | "archived")
          ├── done: boolean
          ├── createdAt: timestamp
          ├── updatedAt: timestamp
          ├── milestones: array
          │   └── [{
          │       id: number,
          │       text: string,
          │       completed: boolean,
          │       color: string,
          │       createdAt: timestamp
          │   }]
          ├── journals: array
          │   └── [{
          │       id: number,
          │       text: string,
          │       emoji: string,
          │       date: timestamp
          │   }]
          └── notificationsSent: map
              ├── sevenDays: boolean
              ├── threeDays: boolean
              ├── lastDay: boolean
              └── overdue: boolean
```

---

## 🔒 Güvenlik Kuralları

Firebase Console → Firestore Database → Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      // Profile document
      match /profile {
        allow read: if isOwner(userId);
        allow write: if isOwner(userId);
      }
      
      // Projects subcollection
      match /projects/{projectId} {
        allow read: if isOwner(userId);
        allow create: if isOwner(userId) && request.resource.data.keys().hasAll([
          'id', 'title', 'startDate', 'endDate', 'status', 'done', 'createdAt'
        ]);
        allow update: if isOwner(userId);
        allow delete: if isOwner(userId);
      }
    }
    
    // Admin access (backend scripts için)
    // NOT: Bu kurallar production'da daha güvenli hale getirilmeli
    match /{document=**} {
      allow read, write: if false; // Default deny
    }
  }
}
```

**⚠️ ÖNEMLİ:** Production'da `allow read, write: if false` kuralını kullanın ve backend'den Firebase Admin SDK ile erişin.

---

## 📊 Index Yapılandırması

Firebase Console → Firestore Database → Indexes

### Composite Index 1: Active Projects Query
```
Collection: users/{userId}/projects
Fields:
  - status (Ascending)
  - endDate (Ascending)
Query Scopes: Collection
```

### Composite Index 2: Deadline Notifications
```
Collection: users/{userId}/projects
Fields:
  - status (Ascending)
  - endDate (Ascending)
  - notificationsSent.sevenDays (Ascending)
Query Scopes: Collection
```

**Automatic Index Creation:**
Firebase otomatik olarak bazı index'leri oluşturur. Eğer query'leriniz hata verirse, Firebase Console'da önerilen index'i oluşturun.

---

## 🧪 Test Verisi Oluşturma

### Manuel Olarak (Firebase Console)

1. **Firestore Database** → **Start Collection** → `users`
2. **Document ID:** `test-user`
3. **Add Field:**
   - Field: `profile` (Map)
   - Value: `{ fcmToken: "your-token-here", timezone: "Europe/Istanbul", language: "tr" }`

### Otomatik Olarak (Python Script)

**Dosya:** `backend/setup_firestore_test_data.py`

```python
#!/usr/bin/env python3
"""
Firebase Firestore Test Data Setup Script
Bu script test kullanıcısı ve örnek projeler oluşturur.
"""

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta
import os

# Service Account Key
cred_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')
cred = credentials.Certificate(cred_path)

# Firebase Admin SDK başlat
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

def setup_test_user(user_id='test-user'):
    """Test kullanıcısı oluştur"""
    print(f'📝 Test kullanıcısı oluşturuluyor: {user_id}')
    
    user_ref = db.collection('users').document(user_id)
    
    # Profile document
    user_ref.set({
        'profile': {
            'fcmToken': '',  # Uygulama çalıştığında otomatik doldurulacak
            'timezone': 'Europe/Istanbul',
            'language': 'tr',
            'createdAt': firestore.SERVER_TIMESTAMP,
            'lastUpdated': firestore.SERVER_TIMESTAMP,
            'notificationPreferences': {
                'dailyReminder': True,
                'projectDeadlines': True,
                'milestoneReminders': True,
                'reminderTime': '08:00'
            }
        }
    })
    
    print(f'✅ Test kullanıcısı oluşturuldu: {user_id}')
    return user_ref

def create_sample_projects(user_id='test-user'):
    """Örnek projeler oluştur"""
    print(f'📝 Örnek projeler oluşturuluyor...')
    
    projects_ref = db.collection('users').document(user_id).collection('projects')
    
    # Proje 1: Yaklaşan deadline (3 gün sonra)
    project1_id = '1734567890000'
    projects_ref.document(project1_id).set({
        'id': 1734567890000,
        'title': 'Mobil Uygulama Geliştirme',
        'description': 'React Native ile modern mobil uygulama',
        'startDate': datetime.now() - timedelta(days=30),
        'endDate': datetime.now() + timedelta(days=3),
        'status': 'active',
        'done': False,
        'createdAt': firestore.SERVER_TIMESTAMP,
        'updatedAt': firestore.SERVER_TIMESTAMP,
        'milestones': [
            {
                'id': 1,
                'text': 'UI/UX Tasarımı',
                'completed': True,
                'color': '#FF6B6B',
                'createdAt': datetime.now() - timedelta(days=25)
            },
            {
                'id': 2,
                'text': 'Backend API Entegrasyonu',
                'completed': True,
                'color': '#4ECDC4',
                'createdAt': datetime.now() - timedelta(days=20)
            },
            {
                'id': 3,
                'text': 'Testing ve Debug',
                'completed': False,
                'color': '#FFE66D',
                'createdAt': datetime.now() - timedelta(days=15)
            }
        ],
        'journals': [
            {
                'id': 1,
                'text': 'Harika bir gün! Tasarımları tamamladık.',
                'emoji': '😊',
                'date': datetime.now() - timedelta(days=25)
            },
            {
                'id': 2,
                'text': 'Backend entegrasyonu biraz zorlandı ama başardık.',
                'emoji': '💪',
                'date': datetime.now() - timedelta(days=20)
            }
        ],
        'notificationsSent': {
            'sevenDays': False,
            'threeDays': False,
            'lastDay': False,
            'overdue': False
        }
    })
    print(f'✅ Proje 1 oluşturuldu: {project1_id}')
    
    # Proje 2: Bugün son gün
    project2_id = '1734567891111'
    projects_ref.document(project2_id).set({
        'id': 1734567891111,
        'title': 'Kişisel Blog Sitesi',
        'description': 'Next.js ile modern blog platformu',
        'startDate': datetime.now() - timedelta(days=15),
        'endDate': datetime.now(),
        'status': 'active',
        'done': False,
        'createdAt': firestore.SERVER_TIMESTAMP,
        'updatedAt': firestore.SERVER_TIMESTAMP,
        'milestones': [
            {
                'id': 1,
                'text': 'CMS Entegrasyonu',
                'completed': True,
                'color': '#95E1D3',
                'createdAt': datetime.now() - timedelta(days=12)
            },
            {
                'id': 2,
                'text': 'SEO Optimizasyonu',
                'completed': False,
                'color': '#F38181',
                'createdAt': datetime.now() - timedelta(days=8)
            }
        ],
        'journals': [
            {
                'id': 1,
                'text': 'CMS entegrasyonu tamamlandı, çok heyecanlıyım!',
                'emoji': '🎉',
                'date': datetime.now() - timedelta(days=12)
            }
        ],
        'notificationsSent': {
            'sevenDays': False,
            'threeDays': False,
            'lastDay': False,
            'overdue': False
        }
    })
    print(f'✅ Proje 2 oluşturuldu: {project2_id}')
    
    # Proje 3: Tamamlanmış proje
    project3_id = '1734567892222'
    projects_ref.document(project3_id).set({
        'id': 1734567892222,
        'title': 'E-Ticaret Dashboard',
        'description': 'Admin paneli ve raporlama sistemi',
        'startDate': datetime.now() - timedelta(days=60),
        'endDate': datetime.now() - timedelta(days=10),
        'status': 'completed',
        'done': True,
        'createdAt': firestore.SERVER_TIMESTAMP,
        'updatedAt': firestore.SERVER_TIMESTAMP,
        'milestones': [
            {
                'id': 1,
                'text': 'Dashboard Tasarımı',
                'completed': True,
                'color': '#A8E6CF',
                'createdAt': datetime.now() - timedelta(days=55)
            },
            {
                'id': 2,
                'text': 'Grafik Entegrasyonu',
                'completed': True,
                'color': '#FFD3B6',
                'createdAt': datetime.now() - timedelta(days=50)
            },
            {
                'id': 3,
                'text': 'Deployment',
                'completed': True,
                'color': '#FFAAA5',
                'createdAt': datetime.now() - timedelta(days=40)
            }
        ],
        'journals': [
            {
                'id': 1,
                'text': 'Projeyi başarıyla tamamladık! Müşteri çok memnun.',
                'emoji': '🚀',
                'date': datetime.now() - timedelta(days=10)
            }
        ],
        'notificationsSent': {
            'sevenDays': True,
            'threeDays': True,
            'lastDay': True,
            'overdue': False
        }
    })
    print(f'✅ Proje 3 oluşturuldu: {project3_id}')
    
    # Proje 4: Gelecek proje (7 gün sonra)
    project4_id = '1734567893333'
    projects_ref.document(project4_id).set({
        'id': 1734567893333,
        'title': 'AI Chatbot Entegrasyonu',
        'description': 'GPT-4 ile akıllı müşteri desteği',
        'startDate': datetime.now(),
        'endDate': datetime.now() + timedelta(days=7),
        'status': 'active',
        'done': False,
        'createdAt': firestore.SERVER_TIMESTAMP,
        'updatedAt': firestore.SERVER_TIMESTAMP,
        'milestones': [
            {
                'id': 1,
                'text': 'API Araştırması',
                'completed': False,
                'color': '#B4A7D6',
                'createdAt': datetime.now()
            },
            {
                'id': 2,
                'text': 'Prototype Geliştirme',
                'completed': False,
                'color': '#D4A5A5',
                'createdAt': datetime.now()
            }
        ],
        'journals': [],
        'notificationsSent': {
            'sevenDays': False,
            'threeDays': False,
            'lastDay': False,
            'overdue': False
        }
    })
    print(f'✅ Proje 4 oluşturuldu: {project4_id}')

def main():
    """Ana fonksiyon"""
    print('🚀 Firestore test verisi oluşturuluyor...\n')
    
    # Test kullanıcısı oluştur
    setup_test_user('test-user')
    
    # Örnek projeler oluştur
    create_sample_projects('test-user')
    
    print('\n✅ Tüm test verileri başarıyla oluşturuldu!')
    print('📍 Firebase Console: https://console.firebase.google.com/project/YOUR_PROJECT_ID/firestore')
    print('🔍 Kullanıcı ID: test-user')
    print('🎯 4 adet örnek proje oluşturuldu')

if __name__ == '__main__':
    main()
```

---

## 📦 Veri Yapısı Örnekleri

### User Profile Example

```json
{
  "users": {
    "test-user": {
      "profile": {
        "fcmToken": "dXY1Z2hpajkwMTIzNDU2Nzg5...",
        "timezone": "Europe/Istanbul",
        "language": "tr",
        "createdAt": "2025-10-09T08:00:00.000Z",
        "lastUpdated": "2025-10-09T08:00:00.000Z",
        "notificationPreferences": {
          "dailyReminder": true,
          "projectDeadlines": true,
          "milestoneReminders": true,
          "reminderTime": "08:00"
        }
      }
    }
  }
}
```

### Active Project Example

```json
{
  "id": 1734567890000,
  "title": "Mobil Uygulama Geliştirme",
  "description": "React Native ile modern mobil uygulama",
  "startDate": "2024-12-10T00:00:00.000Z",
  "endDate": "2025-01-12T00:00:00.000Z",
  "status": "active",
  "done": false,
  "createdAt": "2025-01-09T08:00:00.000Z",
  "updatedAt": "2025-01-09T08:00:00.000Z",
  "milestones": [
    {
      "id": 1,
      "text": "UI/UX Tasarımı",
      "completed": true,
      "color": "#FF6B6B",
      "createdAt": "2024-12-15T00:00:00.000Z"
    },
    {
      "id": 2,
      "text": "Backend API Entegrasyonu",
      "completed": true,
      "color": "#4ECDC4",
      "createdAt": "2024-12-20T00:00:00.000Z"
    },
    {
      "id": 3,
      "text": "Testing ve Debug",
      "completed": false,
      "color": "#FFE66D",
      "createdAt": "2024-12-25T00:00:00.000Z"
    }
  ],
  "journals": [
    {
      "id": 1,
      "text": "Harika bir gün! Tasarımları tamamladık.",
      "emoji": "😊",
      "date": "2024-12-15T00:00:00.000Z"
    },
    {
      "id": 2,
      "text": "Backend entegrasyonu biraz zorlandı ama başardık.",
      "emoji": "💪",
      "date": "2024-12-20T00:00:00.000Z"
    }
  ],
  "notificationsSent": {
    "sevenDays": false,
    "threeDays": false,
    "lastDay": false,
    "overdue": false
  }
}
```

### Completed Project Example

```json
{
  "id": 1734567892222,
  "title": "E-Ticaret Dashboard",
  "description": "Admin paneli ve raporlama sistemi",
  "startDate": "2024-11-10T00:00:00.000Z",
  "endDate": "2024-12-30T00:00:00.000Z",
  "status": "completed",
  "done": true,
  "createdAt": "2024-11-10T08:00:00.000Z",
  "updatedAt": "2024-12-30T15:30:00.000Z",
  "milestones": [
    {
      "id": 1,
      "text": "Dashboard Tasarımı",
      "completed": true,
      "color": "#A8E6CF",
      "createdAt": "2024-11-15T00:00:00.000Z"
    },
    {
      "id": 2,
      "text": "Grafik Entegrasyonu",
      "completed": true,
      "color": "#FFD3B6",
      "createdAt": "2024-11-20T00:00:00.000Z"
    },
    {
      "id": 3,
      "text": "Deployment",
      "completed": true,
      "color": "#FFAAA5",
      "createdAt": "2024-11-30T00:00:00.000Z"
    }
  ],
  "journals": [
    {
      "id": 1,
      "text": "Projeyi başarıyla tamamladık! Müşteri çok memnun.",
      "emoji": "🚀",
      "date": "2024-12-30T00:00:00.000Z"
    }
  ],
  "notificationsSent": {
    "sevenDays": true,
    "threeDays": true,
    "lastDay": true,
    "overdue": false
  }
}
```

---

## 🎯 Manuel Firestore Setup Adımları

### 1. Firebase Console'a Git
```
https://console.firebase.google.com/
```

### 2. Firestore Database Oluştur
1. **Build** → **Firestore Database** → **Create Database**
2. **Start in test mode** (geliştirme için) veya **Start in production mode**
3. **Location:** `eur3 (europe-west)` seç
4. **Enable** tıkla

### 3. Collection Oluştur
1. **Start Collection** → Collection ID: `users`
2. **Document ID:** `test-user`
3. **Add Field:**
   - **Type:** Map
   - **Field:** `profile`
   - **Value:** (alt alanlara expand et)
     - `fcmToken` (string): `""`
     - `timezone` (string): `"Europe/Istanbul"`
     - `language` (string): `"tr"`
     - `createdAt` (timestamp): *şimdi*
     - `notificationPreferences` (map):
       - `dailyReminder` (boolean): `true`
       - `projectDeadlines` (boolean): `true`

### 4. Projects Subcollection Oluştur
1. `users/test-user` document'ine tıkla
2. **Start Collection** → Collection ID: `projects`
3. **Document ID:** `1734567890000`
4. Yukarıdaki **Active Project Example** verilerini ekle

---

## 🔧 Python Script Kullanımı

### Setup Script Çalıştır

```bash
cd backend
python3 setup_firestore_test_data.py
```

### Beklenen Çıktı

```
🚀 Firestore test verisi oluşturuluyor...

📝 Test kullanıcısı oluşturuluyor: test-user
✅ Test kullanıcısı oluşturuldu: test-user
📝 Örnek projeler oluşturuluyor...
✅ Proje 1 oluşturuldu: 1734567890000
✅ Proje 2 oluşturuldu: 1734567891111
✅ Proje 3 oluşturuldu: 1734567892222
✅ Proje 4 oluşturuldu: 1734567893333

✅ Tüm test verileri başarıyla oluşturuldu!
📍 Firebase Console: https://console.firebase.google.com/project/YOUR_PROJECT_ID/firestore
🔍 Kullanıcı ID: test-user
🎯 4 adet örnek proje oluşturuldu
```

---

## 📊 Firestore Console'da Doğrulama

### Query Test 1: Aktif Projeler
```
Collection: users/test-user/projects
WHERE status == 'active'
ORDER BY endDate ASC
```

### Query Test 2: Son Gün Yaklaşan Projeler
```
Collection: users/test-user/projects
WHERE status == 'active'
WHERE endDate >= TODAY
WHERE endDate < TODAY + 1 day
```

### Query Test 3: Bildirim Gönderilmemiş Projeler
```
Collection: users/test-user/projects
WHERE status == 'active'
WHERE notificationsSent.lastDay == false
```

---

## 🎉 Tamamlandı!

Artık Firebase Firestore database'iniz hazır! 

**Sonraki Adımlar:**
1. ✅ Backend script'lerini test et
2. ✅ React Native app'i Firestore'a bağla
3. ✅ Cloud Functions deploy et
4. ✅ Production güvenlik kurallarını uygula

**Dosya:** `backend/FIRESTORE_DATABASE_SETUP.md`
**Tarih:** 2025-10-09
**Proje:** Flow Journal - WIT App

