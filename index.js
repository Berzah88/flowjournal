import { registerRootComponent } from 'expo';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import App from './App';

// 🔥 CRITICAL: Background message handler - App component dışında tanımlanmalı!
// Uygulama kapalı/arka plandayken gelen FCM mesajlarını işler
const messagingInstance = getMessaging();
setBackgroundMessageHandler(messagingInstance, async remoteMessage => {
  console.log('📱 [Background] FCM mesajı alındı:', remoteMessage);
  
  // Eğer notification payload varsa, Android otomatik gösterir
  // Ama biz de local notification gösterelim (garanti için)
  // If the remote message contains a `notification` payload, the OS
  // (Android/iOS) will normally display it automatically. Scheduling
  // another local notification here causes duplicates (server push +
  // local). Only schedule a local notification when the message is
  // data-only (no `notification` payload) or when the payload explicitly
  // requests a local display via a flag.
  if (remoteMessage.notification) {
    console.log('ℹ️ [Background] Remote message contains notification payload — skipping local scheduling to avoid duplicate');
  } else {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: remoteMessage?.data?.title || 'Flow Journal',
          body: remoteMessage?.data?.body || 'Yeni bildirim',
          data: remoteMessage?.data || {},
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Hemen göster
      });
      console.log('✅ [Background] Local notification gösterildi (data-only message)');
    } catch (error) {
      console.error('❌ [Background] Local notification hatası:', error);
    }
  }
  
  return Promise.resolve();
});

console.log('🔥 Background message handler registered in index.js');

registerRootComponent(App);
