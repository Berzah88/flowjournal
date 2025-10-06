// services/FCMService.js
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  FCM_TOKEN: 'fcmToken',
  DAILY_REMINDER_TIME: 'dailyReminderTime',
};

class FCMService {
  constructor() {
    this.fcmToken = null;
    this.onNotificationReceived = null;
    this.onNotificationResponse = null;
  }

  // FCM servisini başlat
  async init({ onNotificationReceived, onNotificationResponse } = {}) {
    try {
      this.onNotificationReceived = onNotificationReceived;
      this.onNotificationResponse = onNotificationResponse;

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
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      // Background'da bildirim göster
      if (remoteMessage.notification) {
        // Background bildirim işlendi
      }
    });
  }

  // Foreground message handler
  setupForegroundMessageHandler() {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      if (typeof this.onNotificationReceived === 'function') {
        try {
          this.onNotificationReceived(remoteMessage);
        } catch (e) {
          console.warn('Foreground message handler hatası:', e);
        }
      }
    });

    return unsubscribe;
  }

  // Notification response handler
  setupNotificationResponseHandler() {
    const unsubscribe = messaging().onNotificationOpenedApp(remoteMessage => {
      if (typeof this.onNotificationResponse === 'function') {
        try {
          this.onNotificationResponse(remoteMessage);
        } catch (e) {
          console.warn('Notification response handler hatası:', e);
        }
      }
    });

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

const fcmService = new FCMService();
export default fcmService;


