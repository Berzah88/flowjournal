# 🚀 Firestore Quick Start Guide

Bu rehber, Firebase Firestore database'ini hızlıca kurmak ve test etmek için gereken adımları içerir.

---

## ⚡ 5 Dakikada Firestore Setup

### 1️⃣ Firebase Projesi Oluştur

1. [Firebase Console](https://console.firebase.google.com/) → **Create Project**
2. Proje adı: `flow-journal` (veya istediğiniz isim)
3. Google Analytics: **Enable** (opsiyonel)
4. Proje oluşturulana kadar bekle

### 2️⃣ Firestore Database Aktifleştir

1. **Build** → **Firestore Database** → **Create Database**
2. **Mode:** Start in **test mode** (geliştirme için)
3. **Location:** `eur3 (europe-west)` seç
4. **Enable** → Database oluşturulana kadar bekle (1-2 dakika)

### 3️⃣ Service Account Key İndir

1. **Project Settings** (⚙️ simgesi) → **Service Accounts**
2. **Generate New Private Key** → **Generate Key**
3. İndirilen JSON dosyasını `backend/serviceAccountKey.json` olarak kaydet
4. ⚠️ **ÖNEMLİ:** Bu dosyayı `.gitignore`'a ekle!

### 4️⃣ Test Verisi Oluştur

```bash
cd backend
python3 setup_firestore_test_data.py
```

**Beklenen Çıktı:**
```
🚀 Firestore test verisi oluşturuluyor...

📝 Test kullanıcısı oluşturuluyor: test-user
✅ Test kullanıcısı oluşturuldu: test-user
📝 Örnek projeler oluşturuluyor...
✅ Proje 1 oluşturuldu: 1734567890000
✅ Proje 2 oluşturuldu: 1734567891111
✅ Proje 3 oluşturuldu: 1734567892222
✅ Proje 4 oluşturuldu: 1734567893333

🔍 Veri doğrulama yapılıyor...
✅ Kullanıcı bulundu: test-user
   - Timezone: Europe/Istanbul
   - Language: tr

📊 Toplam 4 proje bulundu:
...
```

### 5️⃣ Firebase Console'dan Kontrol

1. [Firebase Console](https://console.firebase.google.com/) → Proje seç
2. **Firestore Database** → **Data** tab
3. `users` → `test-user` → `projects` kontrol et

✅ 4 proje görmelisin:
- Mobil Uygulama Geliştirme (3 gün sonra biter)
- Kişisel Blog Sitesi (bugün biter)
- E-Ticaret Dashboard (tamamlanmış)
- AI Chatbot Entegrasyonu (7 gün sonra biter)

---

## 🔥 Security Rules Uygula

### Test Mode → Production Mode

**Test mode** varsayılan olarak **30 gün** sonra devre dışı kalır. Production için güvenlik kuralları uygula:

1. Firebase Console → **Firestore Database** → **Rules**
2. `backend/firestore.rules` dosyasının içeriğini kopyala
3. Firebase Console'daki rules editörüne yapıştır
4. **Publish** → Kurallar aktif olur

**Önemli:** Production'da `test mode` kullanma! Herkes veritabanına erişebilir.

---

## 🧪 Test Senaryoları

### Test 1: Backend Script ile Bildirim Gönder

```bash
cd backend
python3 check_project_deadlines.py
```

**Beklenen:** 
- Bugün biten proje için bildirim gönderilmeli (Kişisel Blog Sitesi)
- Console'da `✅ Notification sent` mesajı görülmeli

### Test 2: Flask API Test

```bash
# PythonAnywhere'den trigger et (tarayıcıdan)
https://mberzah.pythonanywhere.com/trigger-project-deadline-check?secret=YOUR_SECRET_KEY
```

**Beklenen Response:**
```json
{
  "message": "Project deadlines checked successfully",
  "success": true,
  "timestamp": "2025-10-09T10:30:00"
}
```

### Test 3: Manuel Firestore Query

Firebase Console → Firestore → Query

**Query 1: Aktif Projeler**
```
Collection: users/test-user/projects
WHERE status == 'active'
```

**Sonuç:** 3 aktif proje görülmeli

**Query 2: Bugün Biten Projeler**
```
Collection: users/test-user/projects
WHERE status == 'active'
WHERE endDate >= TODAY
WHERE endDate < TODAY + 1
```

**Sonuç:** 1 proje görülmeli (Kişisel Blog Sitesi)

---

## 📱 React Native Entegrasyonu

### Firestore Service'i Aktifleştir

**Dosya:** `services/FirestoreService.js`

```javascript
// Line 9: isEnabled'ı true yap
this.isEnabled = true; // ✅ AKTIF
```

**⚠️ NOT:** Şu anda Expo managed workflow Firestore'u desteklemiyor. Expo SDK 53+ bekleniliyor.

---

## 🔧 Sorun Giderme

### ❌ `serviceAccountKey.json not found`

**Çözüm:**
1. Firebase Console → Project Settings → Service Accounts
2. Generate New Private Key → Download
3. `backend/serviceAccountKey.json` olarak kaydet

### ❌ `Permission denied`

**Çözüm:**
1. Firebase Console → Firestore → Rules
2. Test mode'da mısın kontrol et:
```javascript
allow read, write: if true; // Test mode - sadece geliştirme için!
```

### ❌ `Index not found`

**Çözüm:**
1. Error mesajında verilen link'e tıkla
2. Firebase otomatik olarak index oluşturur
3. 1-2 dakika bekle, tekrar dene

### ❌ `Firebase Admin SDK already initialized`

**Çözüm:**
```python
# Script başında kontrol et
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)
```

---

## 📊 Firestore Kullanım İstatistikleri

### Free Tier (Spark Plan) Limits

| İşlem | Günlük Limit |
|-------|--------------|
| Document Reads | 50,000 |
| Document Writes | 20,000 |
| Document Deletes | 20,000 |
| Storage | 1 GB |

**Not:** Flow Journal app için Free Tier yeterli. Büyük ölçekli production için **Blaze Plan** (pay-as-you-go) gerekli.

---

## 🎯 Sonraki Adımlar

### Geliştirme (Development)

1. ✅ Test verisi oluşturuldu
2. ✅ Backend script'ler çalışıyor
3. ⏳ React Native Firestore entegrasyonu (Expo SDK 53+ bekle)
4. ⏳ Cloud Functions implementasyonu

### Production

1. ⚠️ Security rules uygula (`backend/firestore.rules`)
2. ⚠️ Service Account Key'i güvenli sakla
3. ⚠️ Environment variables kullan (PythonAnywhere)
4. ⚠️ Rate limiting uygula (Flask app)
5. ⚠️ Monitoring ve alerting ekle

---

## 💡 Faydalı Komutlar

### Tüm Test Verisini Sil

```python
# backend/delete_test_data.py
import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate('serviceAccountKey.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

# Test kullanıcısının tüm projelerini sil
projects_ref = db.collection('users').document('test-user').collection('projects')
for doc in projects_ref.stream():
    doc.reference.delete()
    print(f'🗑️ Proje silindi: {doc.id}')

# Test kullanıcısını sil
db.collection('users').document('test-user').delete()
print('✅ Test kullanıcısı silindi')
```

### Firestore Export (Backup)

```bash
# Firebase CLI gerekli: npm install -g firebase-tools
firebase login
firebase firestore:export gs://YOUR_BUCKET/backups/$(date +%Y%m%d)
```

### Firestore Import (Restore)

```bash
firebase firestore:import gs://YOUR_BUCKET/backups/20250109
```

---

## 📚 Faydalı Linkler

- [Firebase Console](https://console.firebase.google.com/)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Security Rules Reference](https://firebase.google.com/docs/firestore/security/rules-structure)
- [Firebase Admin SDK (Python)](https://firebase.google.com/docs/admin/setup#python)
- [Firebase CLI](https://firebase.google.com/docs/cli)

---

## 🎉 Başarılı Setup!

Artık Firebase Firestore database'iniz tamamen hazır! 

**Yardım için:**
- `backend/FIRESTORE_DATABASE_SETUP.md` → Detaylı setup
- `backend/FIRESTORE_FUTURE_PLAN.md` → Gelecek özellikler planı
- `backend/PYTHONANYWHERE_SETUP.md` → PythonAnywhere setup

**Proje:** Flow Journal - WIT App  
**Tarih:** 2025-10-09

