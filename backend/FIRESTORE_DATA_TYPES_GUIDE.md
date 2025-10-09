# 🎯 Firestore Data Types - Doğru Yapı

## ✅ Senin Hazırladığın Yapı

```javascript
// User Document Structure
{
  // Root level fields ✅ DOĞRU
  "fcmToken": "string",           // ✅ String
  "timezone": "string",            // ✅ String
  "language": "string",            // ✅ String
  
  // Notification Preferences ✅ DOĞRU (Map olarak)
  "notificationPreferences": {
    "dailyReminder": true,         // ✅ Boolean
    "projectDeadlines": true,      // ✅ Boolean
    "milestoneReminders": true,    // ✅ Boolean
    "reminderTime": "08:00"        // ✅ String
  },
  
  // Timestamps (otomatik eklenir)
  "createdAt": "timestamp",        // ✅ Firestore Timestamp
  "lastUpdated": "timestamp"       // ✅ Firestore Timestamp
}
```

---

## 📊 Firebase Console'da Nasıl Görünür?

### User Document (users/test-user)

```
users/test-user (Document)
├── fcmToken (string): "eYz9Vh3KxL7mN2pQr5sT8..."
├── timezone (string): "Europe/Istanbul"
├── language (string): "tr"
├── createdAt (timestamp): January 9, 2025 at 8:00:00 AM UTC+3
├── lastUpdated (timestamp): January 9, 2025 at 8:00:00 AM UTC+3
└── notificationPreferences (map)
    ├── dailyReminder (boolean): true
    ├── projectDeadlines (boolean): true
    ├── milestoneReminders (boolean): true
    └── reminderTime (string): "08:00"
```

---

## 🔧 Firebase Console'da Manuel Oluşturma

### Adım 1: User Document Oluştur

1. **Firestore Database** → **Start collection**
2. **Collection ID:** `users`
3. **Document ID:** `test-user`

### Adım 2: Fields Ekle

#### Field 1: fcmToken
```
Field:  fcmToken
Type:   string
Value:  (boş bırak, app çalıştığında doldurulacak)
```

#### Field 2: timezone
```
Field:  timezone
Type:   string
Value:  Europe/Istanbul
```

#### Field 3: language
```
Field:  language
Type:   string
Value:  tr
```

#### Field 4: createdAt
```
Field:  createdAt
Type:   timestamp
Value:  (şu anki zamanı seç)
```

#### Field 5: lastUpdated
```
Field:  lastUpdated
Type:   timestamp
Value:  (şu anki zamanı seç)
```

#### Field 6: notificationPreferences (Map)
```
Field:  notificationPreferences
Type:   map
```

**notificationPreferences içindeki alt fieldlar:**

1. **dailyReminder**
   ```
   Field:  dailyReminder
   Type:   boolean
   Value:  true
   ```

2. **projectDeadlines**
   ```
   Field:  projectDeadlines
   Type:   boolean
   Value:  true
   ```

3. **milestoneReminders**
   ```
   Field:  milestoneReminders
   Type:   boolean
   Value:  true
   ```

4. **reminderTime**
   ```
   Field:  reminderTime
   Type:   string
   Value:  08:00
   ```

---

## 📝 Python Script ile Oluşturma

```python
from firebase_admin import credentials, firestore
import firebase_admin

# Firebase Admin SDK başlat
cred = credentials.Certificate('serviceAccountKey.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

# User document oluştur
user_ref = db.collection('users').document('test-user')

user_data = {
    'fcmToken': '',  # Boş, app çalıştığında doldurulacak
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

user_ref.set(user_data)
print('✅ User oluşturuldu!')
```

---

## ⚛️ React Native ile Oluşturma (Gelecek)

```javascript
import firestore from '@react-native-firebase/firestore';

// User document oluştur
const createUser = async (userId) => {
  await firestore()
    .collection('users')
    .doc(userId)
    .set({
      fcmToken: '',  // Boş, sonra güncellenecek
      timezone: 'Europe/Istanbul',
      language: 'tr',
      createdAt: firestore.FieldValue.serverTimestamp(),
      lastUpdated: firestore.FieldValue.serverTimestamp(),
      notificationPreferences: {
        dailyReminder: true,
        projectDeadlines: true,
        milestoneReminders: true,
        reminderTime: '08:00'
      }
    });
  
  console.log('✅ User oluşturuldu!');
};
```

---

## 🎯 Field Type Özeti

| Field | Firebase Type | JavaScript Type | Python Type | Örnek Değer |
|-------|--------------|-----------------|-------------|-------------|
| **fcmToken** | string | string | str | `"eYz9Vh3..."` |
| **timezone** | string | string | str | `"Europe/Istanbul"` |
| **language** | string | string | str | `"tr"` |
| **createdAt** | timestamp | Date | datetime | `2025-01-09T08:00:00Z` |
| **lastUpdated** | timestamp | Date | datetime | `2025-01-09T08:00:00Z` |
| **notificationPreferences** | map | object | dict | `{ ... }` |
| └─ **dailyReminder** | boolean | boolean | bool | `true` |
| └─ **projectDeadlines** | boolean | boolean | bool | `true` |
| └─ **milestoneReminders** | boolean | boolean | bool | `true` |
| └─ **reminderTime** | string | string | str | `"08:00"` |

---

## ✅ Doğrulama Checklist

Firestore'da oluşturduktan sonra kontrol et:

```
✅ fcmToken field'ı var mı? (string, boş olabilir)
✅ timezone = "Europe/Istanbul" mi?
✅ language = "tr" mi?
✅ createdAt timestamp mi?
✅ lastUpdated timestamp mi?
✅ notificationPreferences bir map mi?
   ✅ dailyReminder boolean true mi?
   ✅ projectDeadlines boolean true mi?
   ✅ milestoneReminders boolean true mi?
   ✅ reminderTime string "08:00" mi?
```

---

## 🔍 Firebase Console'da Kontrol

### Yol 1: Data Tab
```
Firestore Database → Data
└── users
    └── test-user
        └── (tüm fieldları görebilirsin)
```

### Yol 2: Query
```
Collection: users
Document ID: test-user
→ Document içeriği görünür
```

---

## 📦 JSON Formatı (Export)

Firestore'dan export edersen böyle görünür:

```json
{
  "fcmToken": "",
  "timezone": "Europe/Istanbul",
  "language": "tr",
  "createdAt": {
    "_seconds": 1736406000,
    "_nanoseconds": 0
  },
  "lastUpdated": {
    "_seconds": 1736406000,
    "_nanoseconds": 0
  },
  "notificationPreferences": {
    "dailyReminder": true,
    "projectDeadlines": true,
    "milestoneReminders": true,
    "reminderTime": "08:00"
  }
}
```

---

## 🎨 Firestore Data Types Listesi

### Temel Types

| Type | Açıklama | Örnek |
|------|----------|-------|
| **string** | Metin | `"Merhaba"` |
| **number** | Sayı | `42`, `3.14` |
| **boolean** | True/False | `true`, `false` |
| **timestamp** | Tarih/Saat | `2025-01-09T08:00:00Z` |
| **map** | Anahtar-değer | `{ key: "value" }` |
| **array** | Liste | `[1, 2, 3]` |
| **null** | Boş değer | `null` |
| **geopoint** | Konum | `GeoPoint(41.0082, 28.9784)` |
| **reference** | Document referansı | `users/test-user` |

---

## 💡 Best Practices

### ✅ Doğru Kullanım

```javascript
// Map kullan (iç içe yapı için)
notificationPreferences: {
  dailyReminder: true,
  projectDeadlines: true
}

// SERVER_TIMESTAMP kullan (timestamp için)
createdAt: firestore.FieldValue.serverTimestamp()

// Boş string kullan (null yerine)
fcmToken: ''
```

### ❌ Yanlış Kullanım

```javascript
// Map yerine string kullanma
notificationPreferences: "dailyReminder:true,projectDeadlines:true"  // ❌

// Manuel timestamp kullanma
createdAt: "2025-01-09"  // ❌ String değil, timestamp olmalı

// Undefined kullanma
fcmToken: undefined  // ❌ Boş string kullan
```

---

## 🔄 Veri Güncelleme

### FCM Token Güncelle

```python
# Python
db.collection('users').document('test-user').update({
    'fcmToken': 'yeni_token_buraya',
    'lastUpdated': firestore.SERVER_TIMESTAMP
})
```

```javascript
// JavaScript
await firestore()
  .collection('users')
  .doc('test-user')
  .update({
    fcmToken: 'yeni_token_buraya',
    lastUpdated: firestore.FieldValue.serverTimestamp()
  });
```

### Notification Preferences Güncelle

```python
# Python - Sadece bir field güncelle
db.collection('users').document('test-user').update({
    'notificationPreferences.dailyReminder': False
})
```

```javascript
// JavaScript - Sadece bir field güncelle
await firestore()
  .collection('users')
  .doc('test-user')
  .update({
    'notificationPreferences.dailyReminder': false
  });
```

---

## 🎯 Özet

**Senin Hazırladığın Yapı Tamamen Doğru! ✅**

```
✅ fcmToken → string
✅ timezone → string
✅ language → string
✅ notificationPreferences → map (object)
   ✅ dailyReminder → boolean
   ✅ projectDeadlines → boolean
   ✅ milestoneReminders → boolean
   ✅ reminderTime → string
✅ createdAt → timestamp
✅ lastUpdated → timestamp
```

**Hiçbir değişiklik gerekmez!** 🎉

Şimdi Firebase Console'da oluşturabilirsin veya `setup_firestore_test_data.py` script'ini çalıştırabilirsin!

---

**Proje:** Flow Journal - WIT App  
**Tarih:** 2025-01-09

