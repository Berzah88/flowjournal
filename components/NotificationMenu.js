// components/NotificationMenu.js
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Switch, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import fcmService from "../services/FCMService";
import notificationService from "../services/NotificationService";

export default function NotificationMenu({ 
  visible, 
  onClose
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Smooth animasyon değerleri
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-20);

  // Menu açılma/kapanma animasyonu
  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, {
        damping: 25,
        stiffness: 300,
        mass: 0.5,
      });
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, {
        damping: 25,
        stiffness: 300,
      });
    } else {
      scale.value = withTiming(0, { duration: 150 });
      opacity.value = withTiming(0, { duration: 150 });
      translateY.value = withTiming(-20, { duration: 150 });
    }
  }, [visible]);

  // Animasyonlu style'lar
  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value }
    ],
    opacity: opacity.value,
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Topic abonelik durumunu kontrol et
  const checkSubscriptionStatus = useCallback(async () => {
    try {
      // Firebase'de topic subscription durumu kontrol edilemez
      // Bu yüzden AsyncStorage'dan durumu kontrol edelim
      const subscriptionStatus = await AsyncStorage.getItem('fcm_daily_reminders_subscribed');
      setIsSubscribed(subscriptionStatus === 'true');
    } catch (error) {
      console.error('❌ Abonelik durumu kontrol hatası:', error);
    }
  }, []);

  // Günlük bildirim toggle (sadece FCM topic subscription)
  const handleDailyReminderToggle = useCallback(async (value) => {
    try {
      setIsLoading(true);
      
      if (value) {
        // Subscribe to daily reminders (FCM topic)
        const success = await fcmService.subscribeToDailyReminders();
        if (success) {
          setIsSubscribed(true);
          await AsyncStorage.setItem('fcm_daily_reminders_subscribed', 'true');
          Alert.alert(
            '✅ Başarılı',
            'Günlük hatırlatmalara abone oldunuz!\n\nBildirimler PythonAnywhere + FCM ile gelecek.',
            [{ text: 'Tamam' }]
          );
        }
      } else {
        // Unsubscribe from daily reminders
        const success = await fcmService.unsubscribeFromDailyReminders();
        if (success) {
          setIsSubscribed(false);
          await AsyncStorage.setItem('fcm_daily_reminders_subscribed', 'false');
        }
      }
    } catch (error) {
      console.error('❌ Günlük bildirim toggle hatası:', error);
      Alert.alert('❌ Hata', error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Menu açıldığında abonelik durumunu kontrol et
  useEffect(() => {
    if (visible) {
      checkSubscriptionStatus();
    }
  }, [visible, checkSubscriptionStatus]);


  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* Menu Content */}
      <Animated.View style={[styles.menuContainer, { backgroundColor: theme.colors.surface }, animatedContainerStyle]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <View style={styles.headerContent}>
            <Ionicons name="notifications-outline" size={24} color={theme.colors.primary} />
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Bildirim Ayarları</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContent}>
          {/* Günlük Bildirimler */}
          <View style={styles.menuItem}>
            <View style={styles.menuItemContent}>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.secondary} />
              <View style={styles.menuItemTextContainer}>
                <Text style={[styles.menuItemTitle, { color: theme.colors.text }]}>Günlük Hatırlatma</Text>
                <Text style={[styles.menuItemSubtitle, { color: theme.colors.textSecondary }]}>
                  Günlük yazma hatırlatmaları
                </Text>
              </View>
            </View>
            <Switch
              value={isSubscribed}
              onValueChange={handleDailyReminderToggle}
              disabled={isLoading}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={isSubscribed ? '#ffffff' : theme.colors.textSecondary}
            />
          </View>

          {/* Debug/Test Actions */}
          <View style={styles.debugSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
              🔧 FCM Debug
            </Text>

            {/* Show FCM Token */}
            <TouchableOpacity 
              style={[styles.debugButton, { backgroundColor: theme.colors.secondary + '15' }]}
              onPress={async () => {
                try {
                  const token = await fcmService.getFCMToken();
                  const subscriptionStatus = await AsyncStorage.getItem('fcm_daily_reminders_subscribed');
                  
                  console.log('🔥 FCM Token:', token);
                  console.log('📖 Daily Reminders Subscription:', subscriptionStatus);
                  
                  Alert.alert(
                    '🔥 FCM Bilgileri',
                    `Token: ${token?.substring(0, 40)}...\n\nDaily Reminders Topic: ${subscriptionStatus === 'true' ? 'ABONE ✅' : 'ABONE DEĞİL ❌'}\n\nFull token konsol loglarına yazıldı.`,
                    [{ text: 'Tamam' }]
                  );
                } catch (error) {
                  console.error('❌ FCM token hatası:', error);
                  Alert.alert('❌ Hata', error.message);
                }
              }}
            >
              <Ionicons name="key-outline" size={18} color={theme.colors.secondary} />
              <Text style={[styles.debugButtonText, { color: theme.colors.secondary }]}>
                FCM Token & Topic Durumu
              </Text>
            </TouchableOpacity>

          </View>

        </View>


      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    position: 'absolute',
    top: '20%',
    left: '5%',
    right: '5%',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  menuContent: {
    padding: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  actionItem: {
    paddingVertical: 12,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  menuItemTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 13,
    opacity: 0.7,
  },
  debugSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    opacity: 0.7,
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  debugButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
