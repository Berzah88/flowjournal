# 🔑 Firebase Service Account Key Nasıl Alınır?

## 🚨 Problem: `serviceAccountKey.json` Dosyası Yok!

Firebase Admin SDK için Service Account Key gerekli!

---

## 🎯 Adım Adım Service Account Key Alma

### 1️⃣ Firebase Console'a Git

```
https://console.firebase.google.com/
```

### 2️⃣ Proje Seç

- Flow Journal projenizi seçin
- Eğer proje yoksa → **"Create Project"** tıkla

### 3️⃣ Project Settings'e Git

- Sol menüde **⚙️ (Settings)** → **"Project settings"** tıkla

### 4️⃣ Service Accounts Tab'ına Git

- **"Service accounts"** tab'ına tıkla
- **"Firebase Admin SDK"** bölümünde **"Python"** seçili olduğundan emin ol

### 5️⃣ Generate New Private Key

- **"Generate new private key"** butonuna tıkla
- **"Generate key"** onayla
- JSON dosyası otomatik indirilir

### 6️⃣ Dosyayı Backend Klasörüne Taşı

```
İndirilen dosya: flow-journal-xxxxx-firebase-adminsdk-xxxxx.json
Yeni isim: serviceAccountKey.json

Taşı: Downloads → backend/serviceAccountKey.json
```

---

## 📁 Dosya Yapısı Kontrolü

Script çalıştırmadan önce:

```
backend/
├── setup_firestore_test_data.py
├── serviceAccountKey.json ← BU DOSYA OLMALI!
└── ...
```

---

## 🔧 Dosya İçeriği Örneği

`serviceAccountKey.json` dosyası şöyle görünmeli:

```json
{
  "type": "service_account",
  "project_id": "flow-journal-xxxxx",
  "private_key_id": "xxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\nxxxxx\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@flow-journal-xxxxx.iam.gserviceaccount.com",
  "client_id": "xxxxx",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40flow-journal-xxxxx.iam.gserviceaccount.com"
}
```

---

## ⚠️ Güvenlik Uyarısı

```
🚨 ÖNEMLİ: Bu dosya çok hassas!
❌ GitHub'a yükleme
❌ Başkalarıyla paylaşma
✅ .gitignore'da olmalı (zaten var)
✅ Sadece senin bilgisayarında olmalı
```

---

## 🧪 Test: Script Çalıştırma

Service Account Key'i aldıktan sonra:

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

---

## 🎯 Firebase Console'da Kontrol

Script çalıştıktan sonra:

```
1. Firebase Console → Firestore Database → Data
2. users → test-user
3. projects (subcollection)
4. 4 adet proje görmelisin
```

---

## 🔄 Alternatif: Manuel Oluşturma

Eğer Service Account Key alamıyorsan:

### 1. Firebase Console'da Manuel Oluştur

```
1. Firestore Database → Data
2. Start collection → users
3. Document ID: test-user
4. Fields ekle (önceki dökümanlardaki gibi)
```

### 2. Projects Subcollection Manuel

```
1. test-user document'ine tıkla
2. Start collection → projects
3. İlk project document oluştur
4. Fields ekle
```

---

## 💡 İpuçları

### Service Account Key Bulunamıyor

```
✅ Firebase Console → Project Settings → Service Accounts
✅ "Generate new private key" butonuna tıkla
✅ JSON dosyası indirilir
✅ backend/ klasörüne taşı
✅ serviceAccountKey.json olarak yeniden adlandır
```

### Dosya İsimlendirme

```
❌ flow-journal-xxxxx-firebase-adminsdk-xxxxx.json
✅ serviceAccountKey.json
```

### Güvenlik

```
✅ .gitignore'da zaten var
✅ GitHub'a yüklenmez
✅ Sadece senin bilgisayarında
```

---

## 🎉 Sonraki Adım

Service Account Key'i aldıktan sonra:

```bash
python3 setup_firestore_test_data.py
```

Tüm test verileri otomatik oluşturulacak! 🚀

---

**Proje:** Flow Journal - WIT App  
**Tarih:** 2025-01-09
