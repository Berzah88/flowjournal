// Must be imported before other libraries that use native gesture handling
// See: https://docs.swmansion.com/react-native-gesture-handler/docs
import 'react-native-gesture-handler';

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
  // Sadece data-only mesajlar için ekstra local notification göster (garanti için)
  if (remoteMessage.notification) {
    console.log('ℹ️ [Background] Remote message contains notification payload — skipping local scheduling to avoid duplicate');
  } else if (remoteMessage.data) {
    try {
      // Sadece data-only mesajlar için local notification göster
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
      console.log('✅ [Background] Data-only mesaj için local notification gösterildi');
    } catch (error) {
      console.error('❌ [Background] Local notification hatası:', error);
    }
  } else {
    console.log('ℹ️ [Background] Mesaj notification veya data içermiyor - atlanıyor');
  }
  
  return Promise.resolve();
});

console.log('🔥 Background message handler registered in index.js');

registerRootComponent(App);
