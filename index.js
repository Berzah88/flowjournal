import { registerRootComponent } from 'expo';
import { getMessaging } from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import App from './App';

// 🔥 CRITICAL: Background message handler - App component dışında tanımlanmalı!
// Uygulama kapalı/arka plandayken gelen FCM mesajlarını işler
const messagingInstance = getMessaging();
messagingInstance.setBackgroundMessageHandler(async remoteMessage => {
  console.log('📱 [Background] FCM mesajı alındı:', remoteMessage);
  
  // Eğer notification payload varsa, Android otomatik gösterir
  // Ama biz de local notification gösterelim (garanti için)
  if (remoteMessage.notification) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: remoteMessage.notification.title || 'Flow Journal',
          body: remoteMessage.notification.body || 'Yeni bildirim',
          data: remoteMessage.data || {},
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Hemen göster
      });
      console.log('✅ [Background] Local notification gösterildi');
    } catch (error) {
      console.error('❌ [Background] Local notification hatası:', error);
    }
  }
  
  return Promise.resolve();
});

console.log('🔥 Background message handler registered in index.js');

registerRootComponent(App);
