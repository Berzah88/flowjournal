# 🚀 Firestore + Cloud Functions Notification System - Future Plan

## 📋 Genel Bakış

Bu doküman, gelecekte Expo SDK'nın Firestore desteği geldiğinde kurulacak gelişmiş bildirim sisteminin planını içerir.

---

## 🎯 Özellikler

### 1. Akıllı Deadline Tespiti
- **7 gün önce**: "Projenize 7 gün kaldı, planlama yapın"
- **3 gün önce**: "Son 3 gün! Hızlanma zamanı"
- **Son gün**: "Bugün projenizin son günü!"
- **Gecikme**: "Projeniz gecikmede, hemen tamamlayın"

### 2. İnteraktif Bildirimler
- **✅ Tamamla**: Doğrudan projeyi tamamla
- **📝 Günlük Yaz**: Journal ekranına git
- **⏰ Snooze**: 2 saat sonra hatırlat

### 3. Çoklu Cihaz Senkronizasyonu
- Firestore ile tüm cihazlarda senkronize proje yönetimi
- Offline support ile kesintisiz çalışma

---

## 🏗️ Sistem Mimarisi

### Firestore Collections

```
users/{userId}/
  profile:
    - fcmToken: string
    - timezone: string
    - language: string
    - notificationPreferences: object
    
  projects/{projectId}:
    - title: string
    - startDate: timestamp
    - endDate: timestamp
    - status: "active" | "completed" | "archived"
    - milestones: array
    - journals: array
    - notificationsSent:
        - sevenDays: boolean
        - threeDays: boolean
        - lastDay: boolean
        - overdue: boolean
    - createdAt: timestamp
    - updatedAt: timestamp
```

---

## 📦 Gerekli Paketler (Expo SDK 53+)

```json
{
  "dependencies": {
    "@react-native-firebase/app": "^latest",
    "@react-native-firebase/firestore": "^latest",
    "@react-native-firebase/messaging": "^latest",
    "@react-native-firebase/functions": "^latest"
  }
}
```

---

## ☁️ Firebase Cloud Functions

### 1. Scheduled Function - Günlük Kontrol

**Dosya:** `functions/checkProjectDeadlines.js`

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.checkProjectDeadlines = functions.pubsub
  .schedule('every day 05:00')
  .timeZone('Europe/Istanbul')
  .onRun(async (context) => {
    const db = admin.firestore();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Tüm kullanıcıları al
    const usersSnapshot = await db.collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const profileDoc = await db
        .collection('users')
        .doc(userId)
        .collection('profile')
        .doc('data')
        .get();
      
      const fcmToken = profileDoc.data()?.fcmToken;
      if (!fcmToken) continue;
      
      // Kullanıcının aktif projelerini al
      const projectsSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('projects')
        .where('status', '==', 'active')
        .get();
      
      for (const projectDoc of projectsSnapshot.docs) {
        const project = projectDoc.data();
        const projectId = projectDoc.id;
        const endDate = project.endDate.toDate();
        
        const daysRemaining = Math.ceil(
          (endDate - today) / (1000 * 60 * 60 * 24)
        );
        
        // Bildirimleri gönder
        await checkAndSendNotification(
          userId, 
          fcmToken, 
          project, 
          projectId, 
          daysRemaining
        );
      }
    }
  });

async function checkAndSendNotification(userId, fcmToken, project, projectId, daysRemaining) {
  const db = admin.firestore();
  
  let notificationType = null;
  let notification = null;
  
  if (daysRemaining === 7 && !project.notificationsSent?.sevenDays) {
    notificationType = 'sevenDays';
    notification = {
      title: '📅 7 Gün Kaldı!',
      body: `"${project.title}" projenizin son gününe 7 gün kaldı. Planlama yapma zamanı!`,
    };
  } else if (daysRemaining === 3 && !project.notificationsSent?.threeDays) {
    notificationType = 'threeDays';
    notification = {
      title: '⏰ 3 Gün Kaldı!',
      body: `"${project.title}" projenizin son gününe sadece 3 gün kaldı! Hızlanın!`,
    };
  } else if (daysRemaining === 0 && !project.notificationsSent?.lastDay) {
    notificationType = 'lastDay';
    notification = {
      title: '🎯 Son Gün!',
      body: `Bugün "${project.title}" projenizin son günü! Bugün tamamlayın.`,
    };
  } else if (daysRemaining < 0 && !project.notificationsSent?.overdue) {
    notificationType = 'overdue';
    notification = {
      title: '⚠️ Gecikme!',
      body: `"${project.title}" projeniz ${Math.abs(daysRemaining)} gün gecikmede!`,
    };
  }
  
  if (!notification) return;
  
  // FCM mesajını gönder
  const message = {
    token: fcmToken,
    notification: notification,
    data: {
      type: 'project_deadline',
      projectId: projectId,
      userId: userId,
      daysRemaining: String(daysRemaining),
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'project_deadlines',
        sound: 'default',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        actions: [
          {
            action: 'complete',
            title: '✅ Tamamla',
          },
          {
            action: 'journal',
            title: '📝 Günlük Yaz',
          },
          {
            action: 'snooze',
            title: '⏰ 2 Saat Sonra',
          },
        ],
      },
    },
  };
  
  try {
    await admin.messaging().send(message);
    
    // Firestore'da işaretle
    await db
      .collection('users')
      .doc(userId)
      .collection('projects')
      .doc(projectId)
      .update({
        [`notificationsSent.${notificationType}`]: true,
      });
    
    console.log(`✅ Notification sent to ${userId} for project ${projectId}`);
  } catch (error) {
    console.error(`❌ Error sending notification: ${error}`);
  }
}
```

---

## 📱 React Native Implementation

### 1. Firestore Sync Service

**Dosya:** `services/FirestoreSyncService.js`

```javascript
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

class FirestoreSyncService {
  constructor() {
    this.isOnline = true;
    this.pendingSync = [];
  }

  // Kullanıcı ID'sini al
  async getCurrentUserId() {
    // TODO: Auth implementasyonu
    return await AsyncStorage.getItem('userId') || 'test-user';
  }

  // Projeyi Firestore'a senkronize et
  async syncProjectToFirestore(project) {
    try {
      const userId = await this.getCurrentUserId();
      
      await firestore()
        .collection('users')
        .doc(userId)
        .collection('projects')
        .doc(project.id)
        .set({
          title: project.title,
          startDate: firestore.Timestamp.fromDate(new Date(project.startDate)),
          endDate: firestore.Timestamp.fromDate(new Date(project.endDate)),
          status: project.done ? 'completed' : 'active',
          milestones: project.milestones || [],
          journals: project.journals || [],
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
          notificationsSent: {
            sevenDays: false,
            threeDays: false,
            lastDay: false,
            overdue: false,
          },
        }, { merge: true });
      
      console.log('✅ Proje Firestore\'a senkronize edildi:', project.id);
    } catch (error) {
      console.error('❌ Firestore senkronizasyon hatası:', error);
      
      // Offline ise, pending queue'ya ekle
      this.pendingSync.push(project);
    }
  }

  // Projeyi Firestore'dan sil
  async deleteProjectFromFirestore(projectId) {
    try {
      const userId = await this.getCurrentUserId();
      
      await firestore()
        .collection('users')
        .doc(userId)
        .collection('projects')
        .doc(projectId)
        .delete();
      
      console.log('✅ Proje Firestore\'dan silindi:', projectId);
    } catch (error) {
      console.error('❌ Firestore silme hatası:', error);
    }
  }

  // FCM Token'ı güncelle
  async updateFCMToken(fcmToken) {
    try {
      const userId = await this.getCurrentUserId();
      
      await firestore()
        .collection('users')
        .doc(userId)
        .collection('profile')
        .doc('data')
        .set({
          fcmToken: fcmToken,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      
      console.log('✅ FCM token Firestore\'a kaydedildi');
    } catch (error) {
      console.error('❌ FCM token kaydetme hatası:', error);
    }
  }

  // Offline senkronizasyonu
  async syncPendingChanges() {
    if (this.pendingSync.length === 0) return;
    
    console.log(`🔄 ${this.pendingSync.length} adet pending senkronizasyon başlatılıyor...`);
    
    const pending = [...this.pendingSync];
    this.pendingSync = [];
    
    for (const project of pending) {
      await this.syncProjectToFirestore(project);
    }
  }
}

const firestoreSyncService = new FirestoreSyncService();
export default firestoreSyncService;
```

### 2. Notification Action Handler

**Dosya:** `services/NotificationActionHandler.js`

```javascript
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';

class NotificationActionHandler {
  constructor() {
    this.setupHandlers();
  }

  setupHandlers() {
    // App açıldığında bildirime tıklama
    messaging().onNotificationOpenedApp(async (remoteMessage) => {
      await this.handleNotificationAction(remoteMessage);
    });

    // App kapalıyken bildirime tıklama
    messaging()
      .getInitialNotification()
      .then(async (remoteMessage) => {
        if (remoteMessage) {
          await this.handleNotificationAction(remoteMessage);
        }
      });
  }

  async handleNotificationAction(remoteMessage) {
    const { data, notification } = remoteMessage;
    
    if (data.type === 'project_deadline') {
      const action = data.action || 'open';
      const projectId = data.projectId;
      
      console.log(`🎯 Notification action: ${action} for project ${projectId}`);
      
      switch (action) {
        case 'complete':
          await this.completeProject(projectId);
          break;
        case 'journal':
          await this.openJournal(projectId);
          break;
        case 'snooze':
          await this.snoozeNotification(notification, data);
          break;
        default:
          await this.openProject(projectId);
      }
    }
  }

  async completeProject(projectId) {
    // TaskContext'ten projeyi tamamla
    const { completeTask } = require('../context/TaskContext');
    await completeTask(projectId);
    
    // Navigate to completed projects
    // TODO: Navigation implementasyonu
  }

  async openJournal(projectId) {
    // Journal ekranına git
    // TODO: Navigation implementasyonu
  }

  async snoozeNotification(notification, data) {
    // 2 saat sonra tekrar hatırlat
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: data,
      },
      trigger: {
        seconds: 2 * 60 * 60, // 2 saat
      },
    });
    
    console.log('⏰ Bildirim 2 saat sonra tekrar hatırlatılacak');
  }

  async openProject(projectId) {
    // Proje detay ekranına git
    // TODO: Navigation implementasyonu
  }
}

const notificationActionHandler = new NotificationActionHandler();
export default notificationActionHandler;
```

---

## 📅 Uygulama Takvimi

### Faz 1: Hazırlık (Bekleme - Q2 2025)
- [ ] Expo SDK 53+ çıkışını bekle
- [ ] Firestore managed workflow desteğini doğrula
- [ ] Test environment hazırla

### Faz 2: Firestore Entegrasyonu (1 hafta)
- [ ] `FirestoreSyncService.js` implementasyonu
- [ ] User/Project collection yapısı
- [ ] `TaskContext.js` entegrasyonu
- [ ] Offline support + pending sync

### Faz 3: Cloud Functions (3 gün)
- [ ] `checkProjectDeadlines` function
- [ ] Notification sender logic
- [ ] Testing + deployment

### Faz 4: İnteraktif Bildirimler (2 gün)
- [ ] Android notification actions
- [ ] `NotificationActionHandler.js`
- [ ] Deep linking implementasyonu
- [ ] Navigation flow

### Faz 5: Testing & Polish (2 gün)
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Production deployment
- [ ] User documentation

**Toplam Süre:** ~2 hafta

---

## 🎯 Beklenen Faydalar

1. **Akıllı Hatırlatmalar:**
   - Kullanıcılar deadline'larını asla kaçırmaz
   - 7, 3, 1 gün önceden hatırlatma
   
2. **Hızlı Aksiyon:**
   - Bildirimden direkt proje tamamlama
   - Tek tıkla günlük yazma
   
3. **Çoklu Cihaz:**
   - Telefon, tablet, web senkronizasyonu
   - Her cihazda güncel veri

4. **Ölçeklenebilirlik:**
   - Cloud Functions ile sınırsız kullanıcı
   - Otomatik ölçeklendirme

---

## 💡 Notlar

- **Expo SDK 53+** çıkana kadar mevcut `Last_day` topic sistemi kullanılacak
- Bu plan, Firestore desteği geldiğinde hızlı implementasyon için hazırlanmıştır
- Cloud Functions için Firebase Blaze planı (ödeme yapılabilen) gereklidir
- Android 12+ için bildirim action'ları tam destek sağlar

---

**Hazırlayan:** AI Assistant  
**Tarih:** 2025-10-08  
**Proje:** Flow Journal - WIT App

