// services/FCMService.js
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

const STORAGE_KEYS = {
  FCM_TOKEN: 'fcmToken',
  DAILY_REMINDER_TIME: 'dailyReminderTime',
};

class FCMService {
  constructor() {
    this.fcmToken = null;
    this.onNotificationReceived = null;
    this.onNotificationResponse = null;
    this.isInitialized = false;
    this.foregroundUnsubscribe = null;
    this.notificationOpenedUnsubscribe = null;
    this.backgroundHandlerRegistered = false;
    // Persist across fast refresh
    if (!globalThis.__fcmHandledMessageIds) {
      globalThis.__fcmHandledMessageIds = new Set();
    }
    if (!globalThis.__fcmOnMessageRegistered) {
      globalThis.__fcmOnMessageRegistered = false;
    }
    if (!globalThis.__fcmOnNotificationOpenedRegistered) {
      globalThis.__fcmOnNotificationOpenedRegistered = false;
    }
    if (!globalThis.__fcmBackgroundHandlerRegistered) {
      globalThis.__fcmBackgroundHandlerRegistered = false;
    }
    if (!globalThis.__fcmRecentMessageKeys) {
      globalThis.__fcmRecentMessageKeys = new Map(); // key -> timestamp
    }
  }

  // Create a stable key for deduplication
  getMessageKey(remoteMessage) {
    const id = remoteMessage?.messageId || remoteMessage?.messageIdString || '';
    const title = remoteMessage?.notification?.title || remoteMessage?.data?.title || '';
    const body = remoteMessage?.notification?.body || remoteMessage?.data?.body || '';
    const sent = String(remoteMessage?.sentTime || '');
    return id || `${title}|${body}|${sent}`;
  }

  // Decide whether to process message, with TTL to avoid burst duplicates
  shouldProcessMessage(remoteMessage, ttlMs = 10000) {
    try {
      const key = this.getMessageKey(remoteMessage);
      if (!key) return true;
      const now = Date.now();
      const last = globalThis.__fcmRecentMessageKeys.get(key);
      if (last && now - last < ttlMs) {
        return false;
      }
      globalThis.__fcmRecentMessageKeys.set(key, now);
      // Cleanup occasionally
      if (globalThis.__fcmRecentMessageKeys.size > 200) {
        const cutoff = now - ttlMs;
        for (const [k, t] of globalThis.__fcmRecentMessageKeys.entries()) {
          if (t < cutoff) globalThis.__fcmRecentMessageKeys.delete(k);
        }
      }
      return true;
    } catch {
      return true;
    }
  }

  // FCM servisini başlat
  async init({ onNotificationReceived, onNotificationResponse } = {}) {
    try {
      this.onNotificationReceived = onNotificationReceived;
      this.onNotificationResponse = onNotificationResponse;

      if (this.isInitialized) {
        console.log('ℹ️ FCMService zaten başlatılmış, yeniden başlatma atlandı');
        return true;
      }

      // Re-entrancy guard: prevent parallel init from double-registering listeners
      if (this._initializingPromise) {
        await this._initializingPromise;
        return true;
      }

      this._initializingPromise = (async () => {
        // Firebase'in hazır olmasını bekle
        await this.waitForFirebase();
        
        // FCM token al
        await this.getFCMToken();
        
        // Background message handler
        this.setupBackgroundMessageHandler();
        
        // Foreground message handler
        this.setupForegroundMessageHandler();
        
        // Notification response handler
        this.setupNotificationResponseHandler();

        this.isInitialized = true;
      })();

      await this._initializingPromise;
      this._initializingPromise = null;

      return true;
    } catch (error) {
      console.error('❌ FCM servisi başlatılamadı:', error);
      return false;
    }
  }

  // Firebase'in hazır olmasını bekle
  async waitForFirebase() {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      try {
        // Firebase app'in hazır olup olmadığını kontrol et
        const app = messaging().app;
        if (app) {
          console.log('✅ Firebase hazır');
          return true;
        }
      } catch (error) {
        console.log(`⏳ Firebase hazırlanıyor... (${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }
    
    throw new Error('Firebase hazırlanamadı');
  }

  // FCM token al
  async getFCMToken() {
    try {
      console.log('🔥 FCM token alınmaya çalışılıyor...');

      // İzin iste
      const authStatus = await messaging().requestPermission();
      const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                     authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('❌ FCM izni verilmemiş');
        return null;
      }

      console.log('✅ FCM izni verildi');

      // Token al - yeni API kullan
      const token = await messaging().getToken();
      console.log('✅ FCM token başarıyla alındı:', token ? token.substring(0, 20) + '...' : 'null');
      
      // Token'ı kaydet
      if (token) {
        await AsyncStorage.setItem(STORAGE_KEYS.FCM_TOKEN, token);
        this.fcmToken = token;
      }
      
      return token;
    } catch (error) {
      console.error('❌ FCM token alınamadı:', error);
      return null;
    }
  }

  // Background message handler
  setupBackgroundMessageHandler() {
    if (this.backgroundHandlerRegistered || globalThis.__fcmBackgroundHandlerRegistered) {
      return;
    }

    messaging().setBackgroundMessageHandler(async remoteMessage => {
      // Strong duplicate guard (before logging)
      if (!this.shouldProcessMessage(remoteMessage)) {
        return;
      }

      console.log('📱 FCM background bildirim alındı:', remoteMessage);
      
      // ÖNEMLİ: Notification payload içeren mesajları Android zaten gösterir.
      // Background'da ASLA local bildirim gösterme - sistem zaten gösteriyor!
      console.log('ℹ️ Background mesaj - sistem tarafından gösterilecek');
    });

    this.backgroundHandlerRegistered = true;
    globalThis.__fcmBackgroundHandlerRegistered = true;
  }

  // Foreground message handler
  setupForegroundMessageHandler() {
    if (globalThis.__fcmOnMessageRegistered) {
      console.log('ℹ️ Foreground handler zaten kayıtlı, atlıyorum');
      return this.foregroundUnsubscribe;
    }

    // Global handler wrapper - sadece bir kez kayıt ol
    if (!globalThis.__fcmForegroundHandler) {
      console.log('🔥 Foreground handler kaydediliyor...');
      
      globalThis.__fcmForegroundHandler = async (remoteMessage) => {
        // Strong duplicate guard (before logging)
        if (!this.shouldProcessMessage(remoteMessage, 5000)) {
          console.log('⏭️ Duplicate mesaj atlandı');
          return;
        }

        console.log('📱 FCM foreground bildirim alındı:', remoteMessage);
        
        // ÖNEMLİ: Sadece uygulama GERÇEKTEN foreground'dayken local bildirim göster
        const appState = AppState.currentState;
        console.log('📊 App durumu:', appState);
        
        if (appState === 'active' && remoteMessage.notification) {
          // Sadece uygulama aktifken local bildirim göster
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: remoteMessage.notification.title || 'Bildirim',
                body: remoteMessage.notification.body || '',
                data: remoteMessage.data || {},
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
              },
              trigger: null, // Hemen göster
            });
            
            console.log('✅ Local bildirim gösterildi');
          } catch (error) {
            console.error('❌ Local bildirim hatası:', error);
          }
        } else if (appState !== 'active') {
          console.log('ℹ️ App arka planda - local bildirim gösterilmedi (sistem gösterecek)');
        }
        
        if (typeof this.onNotificationReceived === 'function') {
          try {
            this.onNotificationReceived(remoteMessage);
          } catch (e) {
            console.warn('Foreground message handler hatası:', e);
          }
        }
      };

      const unsubscribe = messaging().onMessage(globalThis.__fcmForegroundHandler);
      this.foregroundUnsubscribe = unsubscribe;
      console.log('✅ Foreground handler kaydedildi');
    }

    globalThis.__fcmOnMessageRegistered = true;
    return this.foregroundUnsubscribe;
  }

  // Notification response handler
  setupNotificationResponseHandler() {
    if (globalThis.__fcmOnNotificationOpenedRegistered) {
      return this.notificationOpenedUnsubscribe;
    }

    const unsubscribe = messaging().onNotificationOpenedApp(remoteMessage => {
      if (typeof this.onNotificationResponse === 'function') {
        try {
          this.onNotificationResponse(remoteMessage);
        } catch (e) {
          console.warn('Notification response handler hatası:', e);
        }
      }
    });

    this.notificationOpenedUnsubscribe = unsubscribe;
    globalThis.__fcmOnNotificationOpenedRegistered = true;
    return unsubscribe;
  }

  // Günlük bildirim planla (Native scheduled notification ile)
  async scheduleDailyReminder(hour = 19, minute = 0) {
    try {
      // Önceki bildirimleri iptal et
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Hedef zamanı hesapla
      const now = new Date();
      const targetTime = new Date();
      targetTime.setHours(hour, minute, 0, 0);
      
      // Eğer bugünün hedef saati geçmişse, yarın için planla
      if (targetTime <= now) {
        targetTime.setDate(targetTime.getDate() + 1);
      }
      
      // Zamanı AsyncStorage'a kaydet
      await AsyncStorage.setItem(STORAGE_KEYS.DAILY_REMINDER_TIME, JSON.stringify({ hour, minute }));
      
      // Native scheduled notification kullan - arka planda da çalışır!
      const timeUntilTarget = targetTime.getTime() - now.getTime();
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '📖 Günlük Hatırlatma',
          body: 'Bugün neler hissettin? Günlüğüne birkaç satır ekle 💭',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          seconds: Math.round(timeUntilTarget / 1000), // Kalan süre saniye cinsinden
        },
      });
      
      return notificationId;
    } catch (error) {
      console.error('❌ Native günlük bildirim planlanamadı:', error);
      throw error;
    }
  }

  // Local notification gönder
  async sendLocalNotification({ title, body, data = {} }) {
    try {
      // Expo Notifications ile local notification gönder
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: null, // Hemen gönder
      });
    } catch (error) {
      console.error('❌ FCM local notification gönderilemedi:', error);
    }
  }

  // Test bildirimi gönder (Local)
  async sendTestNotification() {
    try {
      await this.sendLocalNotification({
        title: '🧪 FCM Local Test',
        body: 'Local notification çalışıyor!',
        data: { type: 'test' },
      });
    } catch (error) {
      console.error('❌ FCM local test bildirimi gönderilemedi:', error);
    }
  }


  // FCM token'ı al
  async getToken() {
    return this.fcmToken || await this.getFCMToken();
  }

  // Topic'e subscribe ol (günlük bildirimler için)
  async subscribeToDailyReminders() {
    try {
      const topic = 'daily_reminders';
      await messaging().subscribeToTopic(topic);
      return true;
    } catch (error) {
      console.error('❌ Topic subscription hatası:', error);
      return false;
    }
  }

  // Topic'ten unsubscribe ol
  async unsubscribeFromDailyReminders() {
    try {
      const topic = 'daily_reminders';
      await messaging().unsubscribeFromTopic(topic);
      return true;
    } catch (error) {
      console.error('❌ Topic unsubscription hatası:', error);
      return false;
    }
  }

  // Tüm bildirimleri iptal et
  async cancelAllNotifications() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.DAILY_REMINDER_TIME);
    } catch (error) {
      console.error('❌ FCM bildirimleri iptal edilemedi:', error);
    }
  }
}

// Global singleton export (persists across fast refresh)
if (!globalThis.__fcmServiceInstance) {
  globalThis.__fcmServiceInstance = new FCMService();
}
export default globalThis.__fcmServiceInstance;


