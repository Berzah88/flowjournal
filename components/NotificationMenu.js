// components/NotificationMenu.js
import React, { useCallback, useEffect, useState, useRef } from "react";
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
  withSequence,
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

  // Keep component mounted during close animation so closing animation runs
  const [shouldRender, setShouldRender] = useState(visible);
  const hideTimeout = useRef(null);
  const CLOSE_DELAY = 300; // include backdrop fade time and longer settle

  useEffect(() => {
    if (visible) {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
        hideTimeout.current = null;
      }
      setShouldRender(true);
    }

    if (visible) {
      scale.value = withSequence(
        withTiming(1.08, { duration: 180 }),
        withSpring(1, { damping: 10, stiffness: 120, mass: 0.9 })
      );
      opacity.value = withTiming(1, { duration: 220 });
      translateY.value = withSequence(
        withTiming(-12, { duration: 160 }),
        withSpring(0, { damping: 10, stiffness: 120 })
      );
    } else {
      scale.value = withSequence(
        withTiming(0.96, { duration: 160 }),
        withTiming(0, { duration: 180 })
      );
      opacity.value = withTiming(0, { duration: 170 });
      translateY.value = withTiming(-24, { duration: 170 });

      hideTimeout.current = setTimeout(() => {
        setShouldRender(false);
        hideTimeout.current = null;
      }, CLOSE_DELAY);
    }

    return () => {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
        hideTimeout.current = null;
      }
    };
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
            '✅ ' + t('subscriptionSuccess'),
            t('subscribedToDailyReminders'),
            [{ text: t('ok') }]
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
      Alert.alert('❌ ' + t('error'), error.message);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Menu açıldığında abonelik durumunu kontrol et
  useEffect(() => {
    if (visible) {
      checkSubscriptionStatus();
    }
  }, [visible, checkSubscriptionStatus]);


  if (!shouldRender) return null;

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
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('notificationSettings')}</Text>
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
                <Text style={[styles.menuItemTitle, { color: theme.colors.text }]}>{t('dailyReminder')}</Text>
                <Text style={[styles.menuItemSubtitle, { color: theme.colors.textSecondary }]}>
                  {t('dailyJournalingReminders')}
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
});
