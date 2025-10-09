# 📱 React Native Firestore Integration Guide
## Flow Journal - Proje Sync Sistemi

---

## 🎯 **Genel Bakış**

Bu rehber, React Native app'ten Firestore'a proje bilgilerini kaydetme ve senkronize etme sistemini açıklar.

---

## ⚠️ **MEVCUT DURUM**

### **Şu Anda:**
```
❌ Expo Firestore desteği YOK
✅ AsyncStorage çalışıyor
✅ Topic-based notifications çalışıyor
✅ Backend Firestore desteği VAR
```

### **Ne Zaman Çalışacak?**
- **Expo SDK 53+** (2025 Q2-Q3 bekleniyor)
- **Ya da:** Expo'dan çıkıp bare React Native

---

## 🔧 **İKİ SİSTEM VAR**

### **🟢 Sistem 1: AsyncStorage + Topic (ŞU ANDA ÇALIŞIYOR)**

#### **Avantajları:**
- ✅ Şu an çalışıyor
- ✅ Firestore entegrasyonu gerektirmiyor
- ✅ Basit ve hızlı

#### **Dezavantajları:**
- ❌ Proje adı bilmiyor (genel bildirim)
- ❌ Kişiselleştirilemez
- ❌ Sadece "bugün son gün" bildirimi

#### **Nasıl Çalışıyor:**

```javascript
// services/ProjectDeadlineService.js
async checkAndUpdateDeadlineSubscription() {
  // AsyncStorage'dan projeleri al
  const projects = await AsyncStorage.getItem('tasks');
  
  // Bugün son günü olan proje var mı?
  const hasDeadlineToday = projects.some(project => {
    return project.endDate === today;
  });
  
  // Varsa Last_day topic'e abone ol
  if (hasDeadlineToday) {
    await messaging().subscribeToTopic('Last_day');
  } else {
    await messaging().unsubscribeFromTopic('Last_day');
  }
}
```

**Kullanım:**
```javascript
// App.js
useEffect(() => {
  projectDeadlineService.checkAndUpdateDeadlineSubscription();
}, []);
```

---

### **🔵 Sistem 2: Firestore Sync (GELECEK)**

#### **Avantajları:**
- ✅ Proje adı ile bildirim
- ✅ Kişiselleştirilmiş mesajlar
- ✅ 7 gün, 3 gün, 1 gün önce hatırlatma
- ✅ Milestone hatırlatmaları
- ✅ Multi-device sync

#### **Dezavantajları:**
- ❌ Expo SDK 53+ bekliyor
- ❌ Daha karmaşık implementasyon

#### **Nasıl Olacak:**

```javascript
// services/FirestoreService.js (GELECEK)
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

class FirestoreService {
  async saveProject(project) {
    const db = getFirestore();
    const auth = getAuth();
    const userId = auth.currentUser.uid;
    
    // Firestore'a kaydet
    await setDoc(
      doc(db, `users/${userId}/projects`, project.id.toString()),
      {
        id: project.id,
        title: project.title,
        startDate: new Date(project.startDate),
        endDate: new Date(project.endDate),
        status: project.done ? 'completed' : 'active',
        milestones: project.milestones || [],
        journals: project.journals || [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    );
    
    console.log('✅ Proje Firestore\'a kaydedildi:', project.title);
  }
  
  async updateProjectStatus(projectId, status) {
    const db = getFirestore();
    const auth = getAuth();
    const userId = auth.currentUser.uid;
    
    await setDoc(
      doc(db, `users/${userId}/projects`, projectId),
      { status, updatedAt: new Date() },
      { merge: true }
    );
  }
  
  async saveMilestone(projectId, milestone) {
    const db = getFirestore();
    const auth = getAuth();
    const userId = auth.currentUser.uid;
    
    // Mevcut projeyi al
    const projectRef = doc(db, `users/${userId}/projects`, projectId);
    
    // Milestone ekle
    await setDoc(projectRef, {
      milestones: arrayUnion(milestone),
      updatedAt: new Date()
    }, { merge: true });
  }
}

export default new FirestoreService();
```

---

## 📋 **İMPLEMENTASYON ADIMLARI**

### **Adım 1: Firebase Config (GELECEK)**

```javascript
// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "flowjournal-731f7",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
```

---

### **Adım 2: TaskContext'e Firestore Ekle (GELECEK)**

```javascript
// context/TaskContext.js
import FirestoreService from '../services/FirestoreService';

const addTask = async (task) => {
  // AsyncStorage'a kaydet (ŞU AN YAPILIYOR)
  const newTasks = [...tasks, task];
  setTasks(newTasks);
  await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(newTasks));
  
  // Firestore'a kaydet (GELECEKTE EKLENECEK)
  if (FirestoreService.isEnabled) {
    await FirestoreService.saveProject(task);
  }
};

const updateTask = async (id, updates) => {
  // AsyncStorage güncelle
  const updatedTasks = tasks.map(t => 
    t.id === id ? { ...t, ...updates } : t
  );
  setTasks(updatedTasks);
  await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updatedTasks));
  
  // Firestore güncelle (GELECEKTE)
  if (FirestoreService.isEnabled) {
    await FirestoreService.updateProject(id, updates);
  }
};
```

---

### **Adım 3: FCM Token'ı Firestore'a Kaydet (GELECEK)**

```javascript
// services/NotificationService.js
async saveFCMTokenToFirestore() {
  const token = await messaging().getToken();
  const db = getFirestore();
  const auth = getAuth();
  const userId = auth.currentUser.uid;
  
  await setDoc(
    doc(db, 'users', userId),
    {
      fcmToken: token,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: 'tr',
      updatedAt: new Date()
    },
    { merge: true }
  );
  
  console.log('✅ FCM Token Firestore\'a kaydedildi');
}
```

---

## 🔄 **SYNC STRATEJİSİ**

### **Öncelik 1: AsyncStorage (Şu An)**
```
Proje oluştur → AsyncStorage'a kaydet → ✅
App başlat → AsyncStorage'dan oku → ✅
```

### **Öncelik 2: Hybrid (Geçiş Dönemi)**
```
Proje oluştur → AsyncStorage + Firestore → ✅
App başlat → AsyncStorage (hızlı) → ✅
Background → Firestore sync → ✅
```

### **Öncelik 3: Firestore First (Gelecek)**
```
Proje oluştur → Firestore'a kaydet → ✅
App başlat → Firestore'dan oku (cache) → ✅
Offline → AsyncStorage fallback → ✅
```

---

## 🧪 **TEST SENARYOSU**

### **Test 1: Proje Oluşturma**

```javascript
// Proje oluştur
const newProject = {
  id: Date.now(),
  title: "Test Projesi",
  startDate: new Date(),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 gün sonra
  milestones: []
};

// AsyncStorage'a kaydet
await AsyncStorage.setItem('tasks', JSON.stringify([newProject]));

// Firestore'a kaydet (GELECEK)
await FirestoreService.saveProject(newProject);

// Backend'de kontrol et
// 7 gün sonra bildirim gelmeli
```

---

### **Test 2: Milestone Güncelleme**

```javascript
// Milestone tamamla
const milestone = {
  title: "UI Tasarımı",
  status: "completed",
  completedAt: new Date()
};

// AsyncStorage güncelle
// Firestore güncelle (GELECEK)
await FirestoreService.updateMilestone(projectId, milestone);

// Backend'de kontrol et
// "🎉 UI Tasarımı tamamlandı!" bildirimi gelmeli
```

---

## 📊 **NOTIFICATION SENARYOLARI**

### **Senaryo 1: Proje Deadline (7 gün kala)**

**Backend:**
```python
if days_remaining == 7:
    message = f"📅 {project_name} projesine 7 gün kaldı!"
```

**React Native:**
```javascript
// Bildirim geldiğinde
onNotificationReceived((notification) => {
  if (notification.data.type === 'project_deadline') {
    navigateToProject(notification.data.projectId);
  }
});
```

---

### **Senaryo 2: Milestone Hatırlatıcısı**

**Backend:**
```python
if milestone['status'] == 'pending' and days_until_due <= 3:
    message = f"🎯 {milestone['title']} için 3 gün kaldı!"
```

**React Native:**
```javascript
// Milestone'a git
onNotificationReceived((notification) => {
  if (notification.data.type === 'milestone_reminder') {
    openMilestoneModal(notification.data.milestoneId);
  }
});
```

---

### **Senaryo 3: Proje Tamamlanma Hatırlatıcısı**

**Backend:**
```python
if days_remaining == 0:
    message = f"🎯 {project_name} bugün bitiyor! Son kontrollerini yap!"
```

---

## 🚀 **ŞUAN YAPILMASI GEREKENLER**

### **✅ Hemen Yapılabilir (AsyncStorage Sistemi):**

```javascript
// App.js veya MainScreen.js
import projectDeadlineService from './services/ProjectDeadlineService';

useEffect(() => {
  // Her app açıldığında deadline kontrolü
  projectDeadlineService.checkAndUpdateDeadlineSubscription();
  
  // Günlük kontrol (optional)
  const interval = setInterval(() => {
    projectDeadlineService.checkAndUpdateDeadlineSubscription();
  }, 24 * 60 * 60 * 1000); // Her 24 saatte bir
  
  return () => clearInterval(interval);
}, []);
```

---

### **⏳ Expo SDK 53+ Çıkınca Yapılacak:**

1. **Firebase Packages Yükle:**
   ```bash
   npx expo install firebase
   ```

2. **FirestoreService Aktif Et:**
   ```javascript
   // services/FirestoreService.js
   this.isEnabled = true; // false'dan true'ya çevir
   ```

3. **TaskContext Güncelle:**
   ```javascript
   // Her proje oluşturma/güncelleme fonksiyonuna Firestore sync ekle
   ```

4. **FCM Token Kaydet:**
   ```javascript
   // App başlangıcında FCM token'ı Firestore'a kaydet
   ```

---

## 📋 **CHECKLİST**

### **Şu An:**

- [x] ProjectDeadlineService.js hazır
- [x] AsyncStorage çalışıyor
- [x] Topic-based notifications çalışıyor
- [x] Backend Firestore desteği hazır
- [ ] App'te ProjectDeadlineService çağrısı ekle
- [ ] Cron-job.org kurulumu

### **Expo SDK 53+ Sonrası:**

- [ ] Firebase packages yükle
- [ ] FirestoreService aktif et
- [ ] TaskContext'e Firestore sync ekle
- [ ] FCM token kaydetme ekle
- [ ] Multi-device sync test et
- [ ] Kişiselleştirilmiş bildirimleri test et

---

## 🎯 **ÖZET**

### **Şu Anda Çalışan:**
```
AsyncStorage → ProjectDeadlineService → Last_day topic
                                            ↓
                                    Genel bildirim
```

### **Gelecekte Olacak:**
```
Firestore → Backend check → Kişiselleştirilmiş bildirim
            ↓
   "Mobil Uygulama projesine 3 gün kaldı!"
```

---

**Son Güncelleme:** 2025-10-09  
**Durum:** AsyncStorage sistemi ✅ HAZIR, Firestore sistemi ⏳ EXPO SDK 53+ BEKLİYOR

