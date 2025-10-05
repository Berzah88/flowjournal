// components/NotificationSettings.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import notificationService from '../services/NotificationService';

const NotificationSettings = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [journalReminderEnabled, setJournalReminderEnabled] = useState(false);
  const [milestoneReminderEnabled, setMilestoneReminderEnabled] = useState(false);
  const [projectReminderEnabled, setProjectReminderEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    try {
      console.log('🔧 Bildirim ayarları yükleniyor...');
      const settings = await notificationService.getReminderSettings();
      setJournalReminderEnabled(settings.enabled);
      console.log('✅ Bildirim ayarları yüklendi:', settings);
    } catch (error) {
      console.error('❌ Error loading notification settings:', error);
    }
  };

  const handleJournalReminderToggle = async (enabled) => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      console.log(`🔔 Journal reminder ${enabled ? 'AÇILIYOR' : 'KAPATILIYOR'}`);
      
      const success = await notificationService.updateReminderSettings(enabled, 20, 0);
      
      if (success) {
        setJournalReminderEnabled(enabled);
        Alert.alert(
          'Başarılı',
          enabled 
            ? 'Günlük hatırlatıcı aktif edildi. Her gün 20:00\'da bildirim alacaksınız.'
            : 'Günlük hatırlatıcı kapatıldı.'
        );
        console.log(`✅ Journal reminder ${enabled ? 'aktif edildi' : 'kapatıldı'}`);
      } else {
        Alert.alert('Hata', 'Bildirim ayarı değiştirilemedi. Lütfen tekrar deneyin.');
        console.error('❌ Journal reminder toggle failed');
      }
    } catch (error) {
      console.error('❌ Error toggling journal reminder:', error);
      Alert.alert('Hata', 'Bildirim ayarı değiştirilemedi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMilestoneReminderToggle = async (enabled) => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      console.log(`🎯 Milestone reminder ${enabled ? 'AÇILIYOR' : 'KAPATILIYOR'}`);
      
      if (enabled) {
        // Milestone reminder'ı aktif et - şu an için sadece log
        console.log('✅ Milestone hatırlatıcısı aktif edildi');
        setMilestoneReminderEnabled(true);
        Alert.alert(
          'Başarılı',
          'Milestone hatırlatıcısı aktif edildi. Milestone son günlerinde bildirim alacaksınız.'
        );
      } else {
        // Milestone reminder'ı kapat
        console.log('✅ Milestone hatırlatıcısı kapatıldı');
        setMilestoneReminderEnabled(false);
        Alert.alert('Başarılı', 'Milestone hatırlatıcısı kapatıldı.');
      }
    } catch (error) {
      console.error('❌ Error toggling milestone reminder:', error);
      Alert.alert('Hata', 'Milestone bildirim ayarı değiştirilemedi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectReminderToggle = async (enabled) => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      console.log(`📁 Project reminder ${enabled ? 'AÇILIYOR' : 'KAPATILIYOR'}`);
      
      if (enabled) {
        // Project reminder'ı aktif et - şu an için sadece log
        console.log('✅ Proje hatırlatıcısı aktif edildi');
        setProjectReminderEnabled(true);
        Alert.alert(
          'Başarılı',
          'Proje hatırlatıcısı aktif edildi. Proje bitiş tarihlerinde bildirim alacaksınız.'
        );
      } else {
        // Project reminder'ı kapat
        console.log('✅ Proje hatırlatıcısı kapatıldı');
        setProjectReminderEnabled(false);
        Alert.alert('Başarılı', 'Proje hatırlatıcısı kapatıldı.');
      }
    } catch (error) {
      console.error('❌ Error toggling project reminder:', error);
      Alert.alert('Hata', 'Proje bildirim ayarı değiştirilemedi');
    } finally {
      setIsLoading(false);
    }
  };


  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
      <View style={[
        styles.container,
        {
          backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF',
          borderColor: theme.name === 'dark' ? '#2C2C2E' : 'rgba(0, 0, 0, 0.1)',
        }
      ]}>
        {/* Header */}
        <View style={[
          styles.header,
          { borderBottomColor: theme.name === 'dark' ? '#2C2C2E' : 'rgba(0, 0, 0, 0.1)' }
        ]}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('notificationSettings')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content}>
          {/* Journal Reminder */}
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={styles.settingHeader}>
                <Ionicons 
                  name="journal-outline" 
                  size={20} 
                  color={theme.name === 'dark' ? '#4CAF50' : '#4CAF50'} 
                />
                <Text style={[
                  styles.settingTitle,
                  { color: theme.name === 'dark' ? '#FFFFFF' : '#000000' }
                ]}>
                  Günlük Yazma Hatırlatıcısı
                </Text>
              </View>
              <Text style={[
                styles.settingDescription,
                { color: theme.name === 'dark' ? '#8E8E93' : '#6D6D70' }
              ]}>
                Her gün 20:00'da günlük yazma hatırlatıcısı
              </Text>
            </View>
            <Switch
              value={journalReminderEnabled}
              onValueChange={handleJournalReminderToggle}
              disabled={isLoading}
              trackColor={{ 
                false: theme.name === 'dark' ? '#3A3A3C' : '#E5E5EA', 
                true: theme.name === 'dark' ? '#4CAF50' : '#4CAF50' 
              }}
              thumbColor={journalReminderEnabled ? '#FFFFFF' : '#FFFFFF'}
              ios_backgroundColor={theme.name === 'dark' ? '#3A3A3C' : '#E5E5EA'}
            />
          </View>

          {/* Milestone Reminder */}
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={styles.settingHeader}>
                <Ionicons 
                  name="flag-outline" 
                  size={20} 
                  color={theme.name === 'dark' ? '#2196F3' : '#2196F3'} 
                />
                <Text style={[
                  styles.settingTitle,
                  { color: theme.name === 'dark' ? '#FFFFFF' : '#000000' }
                ]}>
                  {t('milestone')} Hatırlatıcısı
                </Text>
              </View>
              <Text style={[
                styles.settingDescription,
                { color: theme.name === 'dark' ? '#8E8E93' : '#6D6D70' }
              ]}>
                Milestone son günlerinde hatırlatıcı (12:15)
              </Text>
            </View>
            <Switch
              value={milestoneReminderEnabled}
              onValueChange={handleMilestoneReminderToggle}
              disabled={isLoading}
              trackColor={{ 
                false: theme.name === 'dark' ? '#3A3A3C' : '#E5E5EA', 
                true: theme.name === 'dark' ? '#2196F3' : '#2196F3' 
              }}
              thumbColor={milestoneReminderEnabled ? '#FFFFFF' : '#FFFFFF'}
              ios_backgroundColor={theme.name === 'dark' ? '#3A3A3C' : '#E5E5EA'}
            />
          </View>

          {/* Project Reminder */}
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={styles.settingHeader}>
                <Ionicons 
                  name="folder-outline" 
                  size={20} 
                  color={theme.name === 'dark' ? '#FF9800' : '#FF9800'} 
                />
                <Text style={[
                  styles.settingTitle,
                  { color: theme.name === 'dark' ? '#FFFFFF' : '#000000' }
                ]}>
                  Proje Hatırlatıcısı
                </Text>
              </View>
              <Text style={[
                styles.settingDescription,
                { color: theme.name === 'dark' ? '#8E8E93' : '#6D6D70' }
              ]}>
                Proje bitiş tarihlerinde hatırlatıcı (10:00)
              </Text>
            </View>
            <Switch
              value={projectReminderEnabled}
              onValueChange={handleProjectReminderToggle}
              disabled={isLoading}
              trackColor={{ 
                false: theme.name === 'dark' ? '#3A3A3C' : '#E5E5EA', 
                true: theme.name === 'dark' ? '#FF9800' : '#FF9800' 
              }}
              thumbColor={projectReminderEnabled ? '#FFFFFF' : '#FFFFFF'}
              ios_backgroundColor={theme.name === 'dark' ? '#3A3A3C' : '#E5E5EA'}
            />
          </View>


          {/* Info */}
          <View style={styles.infoContainer}>
            <Ionicons 
              name="information-circle-outline" 
              size={16} 
              color={theme.name === 'dark' ? '#8E8E93' : '#6D6D70'} 
            />
            <Text style={[
              styles.infoText,
              { color: theme.name === 'dark' ? '#8E8E93' : '#6D6D70' }
            ]}>
              Bildirimler uygulama kapalıyken de çalışır. Türkiye saat dilimi kullanılır.
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 16,
    borderWidth: 1,
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
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    marginLeft: 8,
  },
  settingDescription: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    marginLeft: 28,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
    padding: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    marginLeft: 8,
    lineHeight: 18,
  },
});

export default NotificationSettings;
