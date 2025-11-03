// services/FCMService.js
import { 
  getMessaging, 
  getToken, 
  requestPermission,
  onMessage,
  setBackgroundMessageHandler,
  onNotificationOpenedApp,
  subscribeToTopic,
  unsubscribeFromTopic,
  AuthorizationStatus
} from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import firestoreService from './FirestoreService';

const STORAGE_KEYS = {
  FCM_TOKEN: 'fcmToken',
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

  // Decide whether a message is "critical" (heuristic)
  isCriticalNotification(remoteMessage) {
    try {
      // Treat project_deadline and manual critical types as critical
      const dataType = remoteMessage?.data?.type;
      if (!dataType && remoteMessage?.notification && remoteMessage?.from?.startsWith('/topics/')) {
        // Topic notifications from backend are considered important reminders
        return true;
      }
      if (dataType === 'project_deadline' || dataType === 'critical' || dataType === 'manual_test') {
        return true;
      }
      // Allow override via data.force_show = '1'
      if (remoteMessage?.data?.force_show === '1') return true;
      return false;
    } catch (e) {
      return false;
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
        const messagingInstance = getMessaging();
        const app = messagingInstance.app;
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

      const messagingInstance = getMessaging();

      // İzin iste - modular API
      const authStatus = await requestPermission(messagingInstance);
      const enabled = authStatus === AuthorizationStatus.AUTHORIZED ||
                     authStatus === AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('❌ FCM izni verilmemiş');
        return null;
      }

      console.log('✅ FCM izni verildi');

      // Token al - modular API
      const token = await getToken(messagingInstance);
      console.log('✅ FCM token başarıyla alındı:', token ? token.substring(0, 20) + '...' : 'null');
      
      // Token'ı kaydet
      if (token) {
        await AsyncStorage.setItem(STORAGE_KEYS.FCM_TOKEN, token);
        this.fcmToken = token;
        // Also ensure token is registered to Firestore immediately
        try {
          await firestoreService.setFCMToken(token);
          console.log('✅ FCM token Firestore\'a kaydedildi (FCMService)');
        } catch (e) {
          console.warn('⚠️ FCM token Firestore\'a kaydedilirken hata:', e);
        }
      }
      
      return token;
    } catch (error) {
      console.error('❌ FCM token alınamadı:', error);
      return null;
    }
  }

  // Force refresh token and register to Firestore (debug helper)
  async refreshTokenAndRegister() {
    try {
      console.log('🔄 FCM token yenileniyor (refresh)...');
      const messagingInstance = getMessaging();
      const token = await getToken(messagingInstance);
      if (token) {
        this.fcmToken = token;
        await AsyncStorage.setItem(STORAGE_KEYS.FCM_TOKEN, token);
        await firestoreService.setFCMToken(token);
        console.log('✅ refreshTokenAndRegister: token yenilendi ve Firestore\'a kaydedildi');
        return token;
      }
      console.warn('⚠️ refreshTokenAndRegister: token alınamadı');
      return null;
    } catch (error) {
      console.error('❌ refreshTokenAndRegister hatası:', error);
      return null;
    }
  }

  // Background message handler - MOVED TO index.js
  // Background handler must be registered OUTSIDE of App component (in index.js)
  setupBackgroundMessageHandler() {
    // Skip - background handler is now in index.js
    console.log('ℹ️ Background handler registered in index.js (not here)');
    return;
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
        // Boş veya geçersiz mesajları filtrele (sentTime==0 veya tamamen boş)
        if (!remoteMessage || remoteMessage.sentTime === 0) {
          console.log('⏭️ Geçersiz mesaj atlandı (boş veya sentTime=0)');
          return;
        }

        const hasNotification = !!remoteMessage.notification;
        const hasData = !!remoteMessage.data;

        // Eğer ne notification ne data yoksa atla
        if (!hasNotification && !hasData) {
          console.log('⏭️ Geçersiz mesaj atlandı (notification veya data yok)');
          return;
        }

        // Strong duplicate guard (before logging)
        if (!this.shouldProcessMessage(remoteMessage, 5000)) {
          console.log('⏭️ Duplicate mesaj atlandı');
          return;
        }

        console.log('📱 FCM foreground bildirim alındı:', remoteMessage);
        
        // ÖNEMLİ: Sadece uygulama GERÇEKTEN foreground'dayken VE kritik bildirimler için local notification göster
        const appState = AppState.currentState;
        console.log('📊 App durumu:', appState);

        // Debug için kritik bildirim kontrolü
        const isCritical = this.isCriticalNotification(remoteMessage);
        console.log('🔍 Kritik bildirim kontrolü:', {
          isCritical,
          dataType: remoteMessage.data?.type,
          hasNotification: !!remoteMessage.notification
        });

        // Decide whether to show a local notification while app is foreground.
        // For notification payloads the existing logic applies. For data-only messages
        // we allow showing a local notification when the message is critical or explicitly forced.
        let shouldShowLocal = false;
        if (hasNotification) {
          shouldShowLocal = isCritical || (remoteMessage.from || '').startsWith('/topics/') || remoteMessage.data?.force_show === '1';
        } else {
          // data-only: show if critical or forced
          shouldShowLocal = isCritical || remoteMessage.data?.force_show === '1';
        }

        if (appState === 'active' && shouldShowLocal) {
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: (remoteMessage.notification && remoteMessage.notification.title) || (remoteMessage.data && remoteMessage.data.title) || 'Bildirim',
                body: (remoteMessage.notification && remoteMessage.notification.body) || (remoteMessage.data && remoteMessage.data.body) || '',
                data: remoteMessage.data || {},
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
              },
              trigger: null,
            });

            console.log('✅ Kritik/local bildirim için local notification gösterildi');
          } catch (error) {
            console.error('❌ Local notification hatası:', error);
          }
        } else {
          if (appState !== 'active') {
            console.log('ℹ️ App arka planda - local notification gösterilmedi (sistem gösterecek)');
          } else if (!shouldShowLocal) {
            console.log('ℹ️ Foreground: local notification gösterilmeyecek. isCritical=', isCritical, 'from=', remoteMessage.from, 'force_show=', remoteMessage.data?.force_show);
          }
        }
        
        if (typeof this.onNotificationReceived === 'function') {
          try {
            this.onNotificationReceived(remoteMessage);
          } catch (e) {
            console.warn('Foreground message handler hatası:', e);
          }
        }
      };

      const messagingInstance = getMessaging();
      const unsubscribe = onMessage(messagingInstance, globalThis.__fcmForegroundHandler);
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

    const messagingInstance = getMessaging();
    const unsubscribe = onNotificationOpenedApp(messagingInstance, remoteMessage => {
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

  // FCM token'ı al
  async getToken() {
    return this.fcmToken || await this.getFCMToken();
  }

  // Topic'e subscribe ol (günlük bildirimler için)
  async subscribeToDailyReminders() {
    try {
      const messagingInstance = getMessaging();
      const topic = 'daily_reminders';
      await subscribeToTopic(messagingInstance, topic);
      return true;
    } catch (error) {
      console.error('❌ Topic subscription hatası:', error);
      return false;
    }
  }

  // Topic'ten unsubscribe ol
  async unsubscribeFromDailyReminders() {
    try {
      const messagingInstance = getMessaging();
      const topic = 'daily_reminders';
      await unsubscribeFromTopic(messagingInstance, topic);
      return true;
    } catch (error) {
      console.error('❌ Topic unsubscription hatası:', error);
      return false;
    }
  }

  // Tüm bildirimleri iptal et
  async cancelAllNotifications() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.FCM_TOKEN);
    } catch (error) {
      console.error('❌ FCM bildirimleri iptal edilemedi:', error);
    }
  }

  // Manuel test için kritik bildirim fonksiyonu
  async testCriticalNotification() {
    console.log('🧪 Manuel test başlatılıyor...');

    const testMessage = {
      notification: {
        title: '⏰ Test Deadline Bildirimi',
        body: 'Bu bir test kritik bildirimidir!'
      },
      data: {
        type: 'project_deadline',
        project_id: 'test-123'
      }
    };

    // Manuel olarak foreground handler logic'ini çalıştır
    if (globalThis.__fcmForegroundHandler) {
      await globalThis.__fcmForegroundHandler(testMessage);
    } else {
      console.error('❌ Foreground handler bulunamadı');
    }
  }
}

// Global singleton export (persists across fast refresh)
if (!globalThis.__fcmServiceInstance) {
  globalThis.__fcmServiceInstance = new FCMService();
}
export default globalThis.__fcmServiceInstance;


