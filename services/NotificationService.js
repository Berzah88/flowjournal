// services/NotificationService.js
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firebase from '@react-native-firebase/app';
import messaging from '@react-native-firebase/messaging';

const STORAGE_KEYS = {
  DAILY_REMINDER_TIME: 'dailyReminderTime', // JSON: { hour: number, minute: number }
  TEST_NOTIFICATION_TIME: 'testNotificationTime', // ISO string
};

// Background task tanımla
const BACKGROUND_NOTIFICATION_TASK = 'background-notification-task';

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
  try {
    console.log('🔄 Background task çalışıyor...');
    
    // Test notification zamanını kontrol et
    const testTime = await AsyncStorage.getItem(STORAGE_KEYS.TEST_NOTIFICATION_TIME);
    
    if (testTime) {
      const target = new Date(testTime);
      const now = new Date();
      const timeDiff = target.getTime() - now.getTime();
      
      console.log('⏰ Hedef zaman:', target.toLocaleTimeString('tr-TR'));
      console.log('⏱️ Kalan süre:', Math.round(timeDiff / 1000), 'saniye');
      
      // Hedef zaman geldi mi kontrol et (5 saniye tolerans)
      if (timeDiff <= 5000 && timeDiff >= -5000) {
        console.log('⏰ Hedef zaman geldi! Background task ile bildirim gönderiliyor...');
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🧪 Test Bildirimi',
            body: 'Background task ile 2 dakika sonra bildirim geldi!',
            sound: true,
          },
          trigger: null, // Hemen gönder
        });
        
        // Hedef zamanı temizle
        await AsyncStorage.removeItem(STORAGE_KEYS.TEST_NOTIFICATION_TIME);
        console.log('✅ Background task bildirimi gönderildi!');
      }
    }
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('❌ Background task hatası:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  constructor() {
    this.receivedListener = null;
    this.responseListener = null;
    this.onNotificationReceived = null;
    this.onNotificationResponse = null;
  }

  // initialize: call once on app start
  async init({ onNotificationReceived, onNotificationResponse } = {}) {
    this.onNotificationReceived = onNotificationReceived;
    this.onNotificationResponse = onNotificationResponse;

    // register listeners
    this._registerListeners();

    // request permissions (non-blocking)
    try {
      await this.requestPermissions();
    } catch (e) {
      console.warn('Bildirim izinleri alınırken hata:', e);
    }

    // ensure notification channel for Android
    await this._createNotificationChannel();

    // Expo managed workflow'da Firebase FCM kullanılmıyor
    console.log('📱 Expo Notifications aktif - FCM token gerekmez');

    // If user has previously saved a daily time, ensure it's scheduled
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_REMINDER_TIME);
    if (saved) {
      try {
        const { hour, minute } = JSON.parse(saved);
        await this.scheduleDailyReminder(hour, minute, { persistStorage: false });
      } catch (e) {
        console.warn('Kayıtlı günlük hatırlatmayı alırken hata:', e);
      }
    }

    return true;
  }

  // permissions
  async requestPermissions() {
    if (!Device.isDevice) {
      console.log('❌ Bildirim için fiziksel cihaz gerekli');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('⚠️ Bildirim izni reddedildi');
      return false;
    }

    console.log('✅ Bildirim izni verildi');
    return true;
  }

  // Android channel
  async _createNotificationChannel() {
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('daily-journal-reminder', {
          name: 'Günlük Hatırlatma',
          description: 'Günlük yazma hatırlatmaları',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF8E7DBE',
        });
        console.log('✅ Android channel oluşturuldu');
      } catch (e) {
        console.warn('Kanal oluşturulurken hata:', e);
      }
    }
  }

  // register listeners
  _registerListeners() {
    if (this.receivedListener || this.responseListener) return;

    this.receivedListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Bildirim alındı:', notification.request.content);
      if (typeof this.onNotificationReceived === 'function') {
        try { this.onNotificationReceived(notification); } catch (e) { console.warn(e); }
      }
    });

    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📬 Bildirim cevabı:', response);
      if (typeof this.onNotificationResponse === 'function') {
        try { this.onNotificationResponse(response); } catch (e) { console.warn(e); }
      }
    });
  }

  // remove listeners - call on app unmount if needed
  removeListeners() {
    if (this.receivedListener) {
      Notifications.removeNotificationSubscription(this.receivedListener);
      this.receivedListener = null;
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
  }

  // schedule a daily reminder at specific hour/minute (24h) - PRODUCTION VERSION
  async scheduleDailyReminder(hour = 19, minute = 0, options = { persistStorage: true }) {
    try {
      console.log(`🚀 Günlük bildirim sistemi başlatılıyor: ${hour}:${minute}`);
      
      // cancel previous daily reminders
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🗑️ Önceki bildirimler iptal edildi');

      // Hedef zamanı hesapla
      const now = new Date();
      const targetTime = new Date();
      targetTime.setHours(hour, minute, 0, 0);
      
      // Eğer bugünün hedef saati geçmişse, yarın için planla
      if (targetTime <= now) {
        targetTime.setDate(targetTime.getDate() + 1);
      }
      
      console.log(`⏰ Hedef zaman: ${targetTime.toLocaleString('tr-TR')}`);
      console.log(`🕐 Şu anki zaman: ${now.toLocaleString('tr-TR')}`);
      
      const timeUntilTarget = targetTime.getTime() - now.getTime();
      console.log(`⏱️ Kalan süre: ${Math.round(timeUntilTarget / 1000 / 60)} dakika`);

      // Native scheduled notification kullan - uygulama arka plandayken de çalışır!
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

      console.log(`✅ Native scheduled notification planlandı: ${hour}:${minute}`);
      console.log(`🆔 Notification ID: ${notificationId}`);
      console.log('🔄 Uygulama arka plandayken de çalışır (native sistem)');
      
      // Scheduled notification'ları kontrol et
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`📋 Toplam scheduled notification sayısı: ${scheduled.length}`);
      
      // Eğer scheduled notification sayısı 0 ise, hemen tetiklenmiş demektir
      if (scheduled.length === 0) {
        console.log('⚠️ Scheduled notification hemen tetiklendi!');
      }

      if (options.persistStorage) {
        await AsyncStorage.setItem(STORAGE_KEYS.DAILY_REMINDER_TIME, JSON.stringify({ hour, minute }));
        console.log('💾 Zaman AsyncStorage\'a kaydedildi');
      }

      return notificationId;
    } catch (e) {
      console.error('❌ Günlük bildirim planlanamadı:', e);
      throw e;
    }
  }

  // schedule one-time notification in ms from now (helper for test) - HYBRID VERSION
  async scheduleOneTimeAfter(ms = 2 * 60 * 1000) {
    try {
      console.log('🚀 2 dakika bildirim sistemi başlatılıyor...');
      console.log('⏰ 2 dakika sonra bildirim planlanıyor...');
      
      // Hedef zamanı hesapla
      const now = new Date();
      const targetTime = new Date(now.getTime() + ms);
      
      console.log(`🕐 Şu anki zaman: ${now.toLocaleTimeString('tr-TR')}`);
      console.log(`⏰ Bildirim gelecek zaman: ${targetTime.toLocaleTimeString('tr-TR')}`);
      console.log(`⏱️ Kalan süre: ${Math.round(ms / 1000 / 60)} dakika`);
      
      // Hedef zamanı AsyncStorage'a kaydet (background task için)
      await AsyncStorage.setItem(STORAGE_KEYS.TEST_NOTIFICATION_TIME, targetTime.toISOString());
      console.log('💾 Test bildirim zamanı kaydedildi:', targetTime.toLocaleTimeString('tr-TR'));
      
      // Background task'ı başlat
      await this._setupBackgroundTask();
      
      // JavaScript timer ile bildirim (uygulama açıkken çalışır)
      const timerId = setTimeout(async () => {
        console.log('⏰ Zaman geldi! JavaScript timer ile bildirim gönderiliyor...');
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🧪 Test Bildirimi',
            body: 'JavaScript timer ile 2 dakika sonra bildirim geldi!',
            sound: true,
          },
          trigger: null, // Hemen gönder
        });
        
        // Hedef zamanı temizle
        await AsyncStorage.removeItem(STORAGE_KEYS.TEST_NOTIFICATION_TIME);
        console.log('✅ JavaScript timer bildirimi gönderildi!');
      }, ms);
      
      console.log('✅ JavaScript timer + Background task başlatıldı!');
      console.log('⏰ 2 dakika sonra bildirim gelecek');
      console.log('🔄 Background task: Uygulama arka plandayken de çalışır');
      console.log('⏰ JavaScript timer: Uygulama açıkken çalışır');
      console.log('🕐 Hedef zaman:', targetTime.toLocaleTimeString('tr-TR'));
      
      return timerId;
    } catch (e) {
      console.error('❌ 2 dakika bildirim hatası:', e);
      throw e;
    }
  }

  // Background task'ı kur
  async _setupBackgroundTask() {
    try {
      // Background fetch'i başlat
      const { status } = await BackgroundFetch.getStatusAsync();
      console.log('📊 Background fetch durumu:', status);
      
      if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
        await BackgroundFetch.registerTaskAsync({
          taskName: BACKGROUND_NOTIFICATION_TASK,
          minimumInterval: 15000, // 15 saniye
          stopOnTerminate: false,
          startOnBoot: true,
        });
        console.log('✅ Background fetch kaydedildi!');
      } else {
        console.log('⚠️ Background fetch mevcut değil');
      }
    } catch (error) {
      console.log('⚠️ Background fetch hatası:', error.message);
    }
  }

  // list scheduled notifications (debug)
  async listScheduledNotifications() {
    try {
      const list = await Notifications.getAllScheduledNotificationsAsync();
      console.log('📋 Planlı bildirimler:', list);
      return list;
    } catch (e) {
      console.error('Planlı bildirimler alınamadı:', e);
      return [];
    }
  }

  // cancel all scheduled notifications
  async cancelAllScheduled() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.removeItem(STORAGE_KEYS.DAILY_REMINDER_TIME);
      await AsyncStorage.removeItem(STORAGE_KEYS.TEST_NOTIFICATION_TIME);
      console.log('🗑️ Tüm planlı bildirimler iptal edildi ve zaman silindi');
    } catch (e) {
      console.error('Planlı bildirimler iptal edilemedi:', e);
    }
  }

  // FCM token al
  async getFCMToken() {
    try {
      const token = await messaging().getToken();
      console.log('🔥 FCM Token alındı:', token);
      return token;
    } catch (error) {
      console.error('❌ FCM token alınamadı:', error);
      return null;
    }
  }

  // FCM token'ı AsyncStorage'dan al
  async getStoredFCMToken() {
    try {
      const token = await AsyncStorage.getItem('fcm_token');
      return token;
    } catch (error) {
      console.error('❌ Stored FCM token alınamadı:', error);
      return null;
    }
  }
}

const notificationService = new NotificationService();
export default notificationService;