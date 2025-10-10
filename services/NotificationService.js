// services/NotificationService.js
// Sadece FCM debug amaçlı - scheduled local notifications KALDIRILDI
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMessaging, getToken } from '@react-native-firebase/messaging';

class NotificationService {
  constructor() {
    this.receivedListener = null;
    this.responseListener = null;
  }

  // FCM token al (debug amaçlı)
  async getFCMToken() {
    try {
      const messagingInstance = getMessaging();
      const token = await getToken(messagingInstance);
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

  // Scheduled notifications listele (debug)
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

  // Tüm scheduled notifications iptal et
  async cancelAllScheduled() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🗑️ Tüm planlı bildirimler iptal edildi');
    } catch (e) {
      console.error('Planlı bildirimler iptal edilemedi:', e);
    }
  }
}

const notificationService = new NotificationService();
export default notificationService;
