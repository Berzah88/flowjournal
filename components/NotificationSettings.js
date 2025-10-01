import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, TouchableWithoutFeedback, ScrollView, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import notificationService from '../services/NotificationService';
import { FONTS, SPACING, BORDER_RADIUS } from '../constants';

const { width, height } = Dimensions.get('window');

export default function NotificationSettings({ visible, onClose }) {
  const { theme } = useTheme();
  const [settings, setSettings] = useState({
    journalReminderEnabled: true,
    journalReminderTime: '20:00',
    deadlineWarningsEnabled: true,
    milestoneRemindersEnabled: true,
    progressFeedbackEnabled: true,
    progressFeedbackFrequency: 'weekly',
  });

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Ayarları yükle
  useEffect(() => {
    loadSettings();
  }, []);

  // Animation effects
  useEffect(() => {
    if (visible) {
      // Open animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Close animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const loadSettings = async () => {
    try {
      const savedSettings = await notificationService.loadNotificationSettings();
      setSettings(savedSettings);
    } catch (error) {
      console.error('Bildirim ayarları yükleme hatası:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await notificationService.saveNotificationSettings(newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('Bildirim ayarları kaydetme hatası:', error);
    }
  };

  const handleJournalReminderToggle = async (enabled) => {
    const newSettings = { ...settings, journalReminderEnabled: enabled };
    await saveSettings(newSettings);
    
    if (enabled) {
      await notificationService.scheduleJournalReminder(settings.journalReminderTime);
    } else {
      await notificationService.cancelJournalReminder();
    }
  };

  const handleJournalTimeChange = async () => {
    Alert.prompt(
      'Günlük Hatırlatıcı Saati',
      'Hatırlatıcının gönderileceği saati girin (HH:MM formatında):',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaydet',
          onPress: async (time) => {
            if (time && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
              const newSettings = { ...settings, journalReminderTime: time };
              await saveSettings(newSettings);
              
              if (settings.journalReminderEnabled) {
                await notificationService.cancelJournalReminder();
                await notificationService.scheduleJournalReminder(time);
              }
            } else {
              Alert.alert('Hata', 'Geçerli bir saat formatı girin (HH:MM)');
            }
          }
        }
      ],
      'plain-text',
      settings.journalReminderTime
    );
  };

  const handleDeadlineWarningsToggle = async (enabled) => {
    const newSettings = { ...settings, deadlineWarningsEnabled: enabled };
    await saveSettings(newSettings);
    
    if (!enabled) {
      // Tüm deadline uyarılarını iptal et
      await notificationService.clearAllNotifications();
    }
  };

  const handleMilestoneRemindersToggle = async (enabled) => {
    const newSettings = { ...settings, milestoneRemindersEnabled: enabled };
    await saveSettings(newSettings);
    
    if (!enabled) {
      // Tüm milestone hatırlatıcılarını iptal et
      await notificationService.clearAllNotifications();
    }
  };

  const handleProgressFeedbackToggle = async (enabled) => {
    const newSettings = { ...settings, progressFeedbackEnabled: enabled };
    await saveSettings(newSettings);
    
    if (!enabled) {
      // Tüm progress feedback bildirimlerini iptal et
      await notificationService.cancelAllNotificationsByType('progress_feedback');
    }
  };


  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.modalOverlay,
        {
          opacity: fadeAnim,
        }
      ]}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>
      
      <Animated.View
        style={[
          styles.modalContent,
          {
            backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF',
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ],
            shadowColor: theme.name === 'dark' ? '#000000' : '#000',
            shadowOpacity: theme.name === 'dark' ? 0.3 : 0.15,
            shadowRadius: theme.name === 'dark' ? 20 : 16,
            elevation: theme.name === 'dark' ? 12 : 8,
          }
        ]}
      >
            <View style={[
              styles.modalHeader,
              {
                borderBottomColor: theme.name === 'dark' ? '#636366' : 'rgba(0, 0, 0, 0.05)',
              }
            ]}>
              <View style={styles.headerLeft}>
                <View style={[
                  styles.headerIcon,
                  {
                    backgroundColor: theme.name === 'dark' ? 'rgba(255, 107, 107, 0.2)' : 'rgba(142, 125, 190, 0.1)',
                  }
                ]}>
                  <Ionicons 
                    name="notifications-outline" 
                    size={20} 
                    color={theme.name === 'dark' ? '#FF6B6B' : '#8E7DBE'} 
                  />
                </View>
                <Text style={[
                  styles.modalTitle,
                  { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
                ]}>
                  Notification Settings
                </Text>
              </View>
              <TouchableOpacity 
                onPress={onClose} 
                style={[
                  styles.closeButton,
                  {
                    backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                  }
                ]}
              >
                <Ionicons 
                  name="close" 
                  size={20} 
                  color={theme.name === 'dark' ? '#8E8E93' : '#666666'} 
                />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.settingsContainer}
            >
              {/* Journal Reminder */}
              <View style={[
                styles.settingItem,
                {
                  backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  borderColor: theme.name === 'dark' ? '#2C2C2E' : 'rgba(0, 0, 0, 0.05)',
                }
              ]}>
                <View style={styles.settingLeft}>
                  <View style={[
                    styles.settingIcon,
                    { 
                      backgroundColor: theme.name === 'dark' ? 'rgba(255, 107, 107, 0.2)' : 'rgba(142, 125, 190, 0.15)',
                    }
                  ]}>
                    <Ionicons 
                      name="book-outline" 
                      size={18} 
                      color={theme.name === 'dark' ? '#FF6B6B' : '#8E7DBE'} 
                    />
                  </View>
                  <View style={styles.settingText}>
                    <Text style={[
                      styles.settingTitle,
                      { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
                    ]}>
                      Journal Reminder
                    </Text>
                    <Text style={[
                      styles.settingDescription,
                      { color: theme.name === 'dark' ? '#8E8E93' : '#666666' }
                    ]}>
                      Daily journal writing reminder
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.journalReminderEnabled}
                  onValueChange={handleJournalReminderToggle}
                  trackColor={{
                    false: theme.name === 'dark' ? '#3A3A3C' : '#E5E5E7',
                    true: theme.name === 'dark' ? '#FF6B6B' : '#8E7DBE'
                  }}
                  thumbColor={theme.name === 'dark' ? '#FFFFFF' : '#FFFFFF'}
                  ios_backgroundColor={theme.name === 'dark' ? '#3A3A3C' : '#E5E5E7'}
                />
              </View>

              {/* Journal Time */}
              {settings.journalReminderEnabled && (
                <TouchableOpacity 
                  style={[
                    styles.timeSetting,
                    {
                      backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.01)',
                      borderColor: theme.name === 'dark' ? '#3A3A3C' : 'rgba(0, 0, 0, 0.08)',
                    }
                  ]}
                  onPress={handleJournalTimeChange}
                >
                  <View style={styles.settingLeft}>
                    <View style={[
                      styles.settingIcon,
                      { 
                        backgroundColor: theme.name === 'dark' ? 'rgba(52, 199, 89, 0.2)' : 'rgba(52, 199, 89, 0.15)',
                      }
                    ]}>
                      <Ionicons 
                        name="time-outline" 
                        size={18} 
                        color={theme.name === 'dark' ? '#34C759' : '#34C759'} 
                      />
                    </View>
                    <View style={styles.settingText}>
                      <Text style={[
                        styles.settingTitle,
                        { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
                      ]}>
                        Reminder Time
                      </Text>
                      <Text style={[
                        styles.settingDescription,
                        { color: theme.name === 'dark' ? '#8E8E93' : '#666666' }
                      ]}>
                        {settings.journalReminderTime}
                      </Text>
                    </View>
                  </View>
                  <Ionicons 
                    name="chevron-forward" 
                    size={18} 
                    color={theme.name === 'dark' ? '#8E8E93' : '#666666'} 
                  />
                </TouchableOpacity>
              )}

              {/* Deadline Warnings */}
              <View style={[
                styles.settingItem,
                {
                  backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  borderColor: theme.name === 'dark' ? '#2C2C2E' : 'rgba(0, 0, 0, 0.05)',
                }
              ]}>
                <View style={styles.settingLeft}>
                  <View style={[
                    styles.settingIcon,
                    { 
                      backgroundColor: theme.name === 'dark' ? 'rgba(255, 149, 0, 0.2)' : 'rgba(255, 149, 0, 0.15)',
                    }
                  ]}>
                    <Ionicons 
                      name="alert-circle-outline" 
                      size={18} 
                      color={theme.name === 'dark' ? '#FF9500' : '#FF9500'} 
                    />
                  </View>
                  <View style={styles.settingText}>
                    <Text style={[
                      styles.settingTitle,
                      { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
                    ]}>
                      Deadline Warnings
                    </Text>
                    <Text style={[
                      styles.settingDescription,
                      { color: theme.name === 'dark' ? '#8E8E93' : '#666666' }
                    ]}>
                      Warning when project deadline approaches
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.deadlineWarningsEnabled}
                  onValueChange={handleDeadlineWarningsToggle}
                  trackColor={{
                    false: theme.name === 'dark' ? '#3A3A3C' : '#E5E5E7',
                    true: theme.name === 'dark' ? '#FF9500' : '#FF9500'
                  }}
                  thumbColor={theme.name === 'dark' ? '#FFFFFF' : '#FFFFFF'}
                  ios_backgroundColor={theme.name === 'dark' ? '#3A3A3C' : '#E5E5E7'}
                />
              </View>

              {/* Milestone Reminders */}
              <View style={[
                styles.settingItem,
                {
                  backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  borderColor: theme.name === 'dark' ? '#2C2C2E' : 'rgba(0, 0, 0, 0.05)',
                }
              ]}>
                <View style={styles.settingLeft}>
                  <View style={[
                    styles.settingIcon,
                    { 
                      backgroundColor: theme.name === 'dark' ? 'rgba(0, 122, 255, 0.2)' : 'rgba(0, 122, 255, 0.15)',
                    }
                  ]}>
                    <Ionicons 
                      name="flag-outline" 
                      size={18} 
                      color={theme.name === 'dark' ? '#007AFF' : '#007AFF'} 
                    />
                  </View>
                  <View style={styles.settingText}>
                    <Text style={[
                      styles.settingTitle,
                      { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
                    ]}>
                      Milestone Reminders
                    </Text>
                    <Text style={[
                      styles.settingDescription,
                      { color: theme.name === 'dark' ? '#8E8E93' : '#666666' }
                    ]}>
                      Reminders for milestone deadlines
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.milestoneRemindersEnabled}
                  onValueChange={handleMilestoneRemindersToggle}
                  trackColor={{
                    false: theme.name === 'dark' ? '#3A3A3C' : '#E5E5E7',
                    true: theme.name === 'dark' ? '#007AFF' : '#007AFF'
                  }}
                  thumbColor={theme.name === 'dark' ? '#FFFFFF' : '#FFFFFF'}
                  ios_backgroundColor={theme.name === 'dark' ? '#3A3A3C' : '#E5E5E7'}
                />
              </View>

              {/* Progress Feedback */}
              <View style={[
                styles.settingItem,
                {
                  backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  borderColor: theme.name === 'dark' ? '#2C2C2E' : 'rgba(0, 0, 0, 0.05)',
                }
              ]}>
                <View style={styles.settingLeft}>
                  <View style={[
                    styles.settingIcon,
                    { 
                      backgroundColor: theme.name === 'dark' ? 'rgba(142, 125, 190, 0.2)' : 'rgba(142, 125, 190, 0.15)',
                    }
                  ]}>
                    <Ionicons 
                      name="chatbubble-outline" 
                      size={18} 
                      color={theme.name === 'dark' ? '#8E7DBE' : '#8E7DBE'} 
                    />
                  </View>
                  <View style={styles.settingText}>
                    <Text style={[
                      styles.settingTitle,
                      { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
                    ]}>
                      Progress Feedback
                    </Text>
                    <Text style={[
                      styles.settingDescription,
                      { color: theme.name === 'dark' ? '#8E8E93' : '#666666' }
                    ]}>
                      Request feedback on project progress
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.progressFeedbackEnabled}
                  onValueChange={handleProgressFeedbackToggle}
                  trackColor={{
                    false: theme.name === 'dark' ? '#3A3A3C' : '#E5E5E7',
                    true: theme.name === 'dark' ? '#8E7DBE' : '#8E7DBE'
                  }}
                  thumbColor={theme.name === 'dark' ? '#FFFFFF' : '#FFFFFF'}
                  ios_backgroundColor={theme.name === 'dark' ? '#3A3A3C' : '#E5E5E7'}
                />
              </View>

            </ScrollView>
          </Animated.View>
        </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modalContent: {
    width: '90%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 0,
    maxHeight: '80%',
    minHeight: 400,
    marginHorizontal: SPACING.SM,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.LG,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.MD,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: SPACING.LG,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FONTS.SEMI_BOLD,
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsContainer: {
    paddingVertical: SPACING.LG,
    gap: SPACING.MD,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    borderRadius: 12,
    borderWidth: 1,
  },
  timeSetting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    marginVertical: SPACING.XS,
    borderWidth: 1,
    borderRadius: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.MD,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: FONTS.MEDIUM,
    marginBottom: 4,
    letterSpacing: -0.1,
  },
  settingDescription: {
    fontSize: 13,
    fontFamily: FONTS.REGULAR,
    lineHeight: 18,
  },
});
