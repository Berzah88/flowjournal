// services/NotificationService.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Bildirim davranışını yapılandır
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
    this.isInitialized = false;
    this.notificationListener = null;
    this.responseListener = null;
    this.scheduledNotifications = new Map(); // Zamanlanmış bildirimleri takip et
    
    // Bildirim türleri ve zamanları
    this.NOTIFICATION_TYPES = {
      DAILY_REMINDER: {
        id: 'daily-reminder',
        channelId: 'daily-reminder-channel',
        hour: 20,
        minute: 0,
        title: '📝 Günlük Yazma Zamanı!',
        body: 'Bugün nasıl geçti? Duygularını ve deneyimlerini kaydetmek için günlüğünü yaz.',
        color: '#4CAF50'
      },
      MILESTONE_END: {
        id: 'milestone-end',
        channelId: 'milestone-reminder-channel',
        hour: 12,
        minute: 15,
        title: '🚀 Milestone Son Günü!',
        body: 'Milestone son günü bildirimi',
        color: '#2196F3'
      },
      PROJECT_END: {
        id: 'project-end',
        channelId: 'project-reminder-channel',
        hour: 10,
        minute: 0,
        title: '🎯 Proje Bitiş Tarihi!',
        body: 'Proje bitiş tarihi bildirimi',
        color: '#FF9800'
      }
    };
  }

  // Servisi başlat
  async initialize() {
    if (this.isInitialized) {
      console.log('🔔 NotificationService zaten başlatılmış');
      return;
    }

    try {
      console.log('🔔 NotificationService başlatılıyor...');
      
      // Development build'de bildirimleri devre dışı bırak
      if (__DEV__) {
        console.log('⚠️ Development build - Bildirimler devre dışı bırakıldı');
        this.isInitialized = true;
        return true;
      }
      
      // Bildirim izinlerini kontrol et ve al
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('⚠️ Bildirim izni verilmedi');
        return false;
      }
      
      // Android notification channel oluştur
      await this.createNotificationChannels();
      
      // Bildirim dinleyicilerini kur
      this.setupNotificationListeners();
      
      this.isInitialized = true;
      console.log('✅ NotificationService başarıyla başlatıldı');
      return true;
    } catch (error) {
      console.error('❌ NotificationService başlatma hatası:', error);
      throw error;
    }
  }

  // Android notification channel oluştur
  async createNotificationChannels() {
    try {
      console.log('📱 Android notification channel\'ları oluşturuluyor...');
      
      // Günlük hatırlatıcı kanalı
      await Notifications.setNotificationChannelAsync('daily-reminder-channel', {
        name: 'Günlük Hatırlatıcı',
        description: 'Günlük yazma hatırlatıcıları',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4CAF50',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });

      // Milestone bildirim kanalı
      await Notifications.setNotificationChannelAsync('milestone-reminder-channel', {
        name: 'Milestone Hatırlatıcıları',
        description: 'Milestone son günü hatırlatıcıları',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2196F3',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });

      // Proje bildirim kanalı
      await Notifications.setNotificationChannelAsync('project-reminder-channel', {
        name: 'Proje Hatırlatıcıları',
        description: 'Proje bitiş tarihi ve milestone hatırlatıcıları',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF9800',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });

      console.log('✅ Notification channel\'ları oluşturuldu');
    } catch (error) {
      console.error('❌ Notification channel oluşturma hatası:', error);
    }
  }

  // Bildirim izinlerini iste
  async requestPermissions() {
    if (!Device.isDevice) {
      console.warn('⚠️ Bildirimler sadece fiziksel cihazlarda çalışır');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('⚠️ Bildirim izni verilmedi');
      return false;
    }

    console.log('✅ Bildirim izni verildi');
    return true;
  }

  // Bildirim dinleyicilerini kur
  setupNotificationListeners() {
    // Bildirim geldiğinde
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📨 Bildirim alındı:', notification);
    });

    // Bildirime tıklandığında
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Bildirime tıklandı:', response);
      // Burada günlük ekranına yönlendirme yapılabilir
    });
  }

  // Günlük bildirim zamanlaması (20:00)
  async scheduleDailyReminder() {
    try {
      console.log('📝 Günlük hatırlatıcı ayarlanıyor...');
      
      // Development build'de bildirimleri devre dışı bırak
      if (__DEV__) {
        console.log('⚠️ Development build - Günlük bildirim devre dışı');
        return true;
      }
      
      // Önceki günlük bildirimleri iptal et
      await this.cancelNotificationByType('daily-reminder');

      const notificationType = this.NOTIFICATION_TYPES.DAILY_REMINDER;
      
      // Basit ve güvenli tarih hesaplama
      const now = new Date();
      console.log(`🕐 Şu anki zaman: ${now.toISOString()}`);
      console.log(`⏰ Hedef saat: ${notificationType.hour}:${notificationType.minute.toString().padStart(2, '0')}`);
      
      // Şu anki saat ve dakikayı al
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const isTimePassed = currentHour > notificationType.hour || 
                          (currentHour === notificationType.hour && currentMinute >= notificationType.minute);
      
      console.log(`🔍 Zaman geçmiş mi? ${isTimePassed} (Şu an: ${currentHour}:${currentMinute.toString().padStart(2, '0')})`);
      
      // Hedef tarihi oluştur
      const targetDate = new Date(now);
      if (isTimePassed) {
        // Yarın için planla
        targetDate.setDate(targetDate.getDate() + 1);
        console.log(`📅 Yarın için planlanıyor`);
      } else {
        console.log(`📅 Bugün için planlanıyor`);
      }
      
      targetDate.setHours(notificationType.hour, notificationType.minute, 0, 0);
      console.log(`⏰ Hedef tarih: ${targetDate.toISOString()}`);

      // Development build'de repeats: true ile date trigger sorun yaratıyor
      // Bu yüzden hour/minute trigger kullanıyoruz
      const trigger = {
        hour: notificationType.hour,
        minute: notificationType.minute,
        repeats: true, // Her gün tekrarla
        channelId: notificationType.channelId,
      };
      
      console.log(`🔧 Trigger detayları:`, {
        hour: notificationType.hour,
        minute: notificationType.minute,
        repeats: true,
        channelId: notificationType.channelId,
        nextNotification: `Her gün ${notificationType.hour}:${notificationType.minute.toString().padStart(2, '0')}`
      });

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationType.title,
          body: notificationType.body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: 'daily-reminder',
          data: {
            type: 'daily-reminder',
            scheduledTime: `${notificationType.hour}:${notificationType.minute.toString().padStart(2, '0')}`
          }
        },
        trigger,
      });

      // Bildirim ID'sini kaydet
      this.scheduledNotifications.set('daily-reminder', notificationId);

      // Ayarları kaydet
      await AsyncStorage.setItem('dailyReminderSettings', JSON.stringify({
        enabled: true,
        hour: notificationType.hour,
        minute: notificationType.minute,
        scheduledAt: new Date().toISOString(),
        notificationId: notificationId
      }));

      console.log(`✅ Günlük bildirim ${notificationType.hour}:${notificationType.minute.toString().padStart(2, '0')} saatine ayarlandı (ID: ${notificationId})`);
      return true;
    } catch (error) {
      console.error('❌ Günlük bildirim zamanlama hatası:', error);
      return false;
    }
  }

  // Proje bitiş tarihi bildirimi (10:00)
  async scheduleProjectEndDateNotification(projectId, projectTitle, endDate) {
    try {
      console.log(`🎯 Proje bildirimi ayarlanıyor: "${projectTitle}"`);
      
      // Development build'de bildirimleri devre dışı bırak
      if (__DEV__) {
        console.log('⚠️ Development build - Proje bildirimi devre dışı');
        return true;
      }
      
      // End date'i güvenli şekilde parse et
      let endDateObj;
      try {
        endDateObj = new Date(endDate);
        if (isNaN(endDateObj.getTime())) {
          console.log(`❌ Geçersiz tarih formatı: ${endDate}`);
          return false;
        }
      } catch (error) {
        console.log(`❌ Tarih parse hatası: ${endDate}`, error);
        return false;
      }
      
      // Şu anki zamanı al
      const now = new Date();
      
      console.log(`📅 End Date: ${endDate} -> ${endDateObj.toISOString()}`);
      console.log(`🕐 Şu anki zaman: ${now.toISOString()}`);
      console.log(`⏰ End Date <= Now: ${endDateObj <= now}`);
      
      // Eğer bitiş tarihi geçmişse bildirim planlama
      if (endDateObj <= now) {
        console.log(`❌ Proje "${projectTitle}" bitiş tarihi geçmiş, bildirim planlanmıyor`);
        return false;
      }

      const notificationType = this.NOTIFICATION_TYPES.PROJECT_END;
      
      // Bildirim zamanını ayarla (bitiş tarihi günü saat 10:00)
      const notificationTime = new Date(endDateObj);
      notificationTime.setHours(notificationType.hour, notificationType.minute, 0, 0);
      
      console.log(`⏰ Bildirim zamanı: ${notificationTime.toISOString()}`);

      const trigger = {
        date: notificationTime,
        repeats: false, // Tek seferlik
        channelId: notificationType.channelId,
      };
      
      console.log(`🔧 Proje trigger detayları:`, {
        date: notificationTime.toISOString(),
        repeats: false,
        channelId: notificationType.channelId,
        timeUntilNotification: Math.round((notificationTime.getTime() - now.getTime()) / 1000 / 60 / 60 / 24) + ' gün'
      });

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationType.title,
          body: `"${projectTitle}" projesinin bitiş tarihi bugün! Son kontrolleri yapmayı unutma.`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: 'project-end-date',
          data: {
            type: 'project-end-date',
            projectId: projectId,
            projectTitle: projectTitle,
            endDate: endDate
          }
        },
        trigger,
      });

      // Bildirim ID'sini kaydet
      this.scheduledNotifications.set(`project-end-${projectId}`, notificationId);

      // Proje bildirim ayarlarını kaydet
      const projectNotifications = await this.getProjectNotifications();
      projectNotifications[projectId] = {
        type: 'project-end-date',
        notificationId: notificationId,
        scheduledAt: new Date().toISOString(),
        projectTitle: projectTitle,
        endDate: endDate
      };
      await AsyncStorage.setItem('projectNotifications', JSON.stringify(projectNotifications));

      console.log(`✅ Proje bitiş tarihi bildirimi planlandı: "${projectTitle}" - ${endDateObj.toDateString()} ${notificationType.hour}:${notificationType.minute.toString().padStart(2, '0')} (ID: ${notificationId})`);
      return true;
    } catch (error) {
      console.error('❌ Proje bitiş tarihi bildirim zamanlama hatası:', error);
      return false;
    }
  }

  // Milestone son günü bildirimi (12:15)
  async scheduleMilestoneEndDateNotification(milestoneId, milestoneTitle, projectTitle, endDate) {
    try {
      console.log(`🚀 Milestone bildirimi ayarlanıyor: "${milestoneTitle}"`);
      
      // Development build'de bildirimleri devre dışı bırak
      if (__DEV__) {
        console.log('⚠️ Development build - Milestone bildirimi devre dışı');
        return true;
      }
      
      // End date'i güvenli şekilde parse et
      let endDateObj;
      try {
        endDateObj = new Date(endDate);
        if (isNaN(endDateObj.getTime())) {
          console.log(`❌ Geçersiz tarih formatı: ${endDate}`);
          return false;
        }
      } catch (error) {
        console.log(`❌ Tarih parse hatası: ${endDate}`, error);
        return false;
      }
      
      // Şu anki zamanı al
      const now = new Date();
      
      console.log(`📅 End Date: ${endDate} -> ${endDateObj.toISOString()}`);
      console.log(`🕐 Şu anki zaman: ${now.toISOString()}`);
      console.log(`⏰ End Date <= Now: ${endDateObj <= now}`);
      
      // Eğer bitiş tarihi geçmişse bildirim planlama
      if (endDateObj <= now) {
        console.log(`❌ Milestone "${milestoneTitle}" bitiş tarihi geçmiş, bildirim planlanmıyor`);
        return false;
      }

      const notificationType = this.NOTIFICATION_TYPES.MILESTONE_END;
      
      // Bildirim zamanını ayarla (bitiş tarihi günü saat 12:15)
      const notificationTime = new Date(endDateObj);
      notificationTime.setHours(notificationType.hour, notificationType.minute, 0, 0);
      
      console.log(`⏰ Bildirim zamanı: ${notificationTime.toISOString()}`);

      const trigger = {
        date: notificationTime,
        repeats: false, // Tek seferlik
        channelId: notificationType.channelId,
      };
      
      console.log(`🔧 Milestone trigger detayları:`, {
        date: notificationTime.toISOString(),
        repeats: false,
        channelId: notificationType.channelId,
        timeUntilNotification: Math.round((notificationTime.getTime() - now.getTime()) / 1000 / 60 / 60 / 24) + ' gün'
      });

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationType.title,
          body: `"${milestoneTitle}" milestone'ının son günü bugün! "${projectTitle}" projesi için son hazırlıkları tamamla.`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: 'milestone-end-date',
          data: {
            type: 'milestone-end-date',
            milestoneId: milestoneId,
            milestoneTitle: milestoneTitle,
            projectTitle: projectTitle,
            endDate: endDate
          }
        },
        trigger,
      });

      // Bildirim ID'sini kaydet
      this.scheduledNotifications.set(`milestone-end-${milestoneId}`, notificationId);

      // Milestone bildirim ayarlarını kaydet
      const milestoneNotifications = await this.getMilestoneNotifications();
      milestoneNotifications[milestoneId] = {
        type: 'milestone-end-date',
        notificationId: notificationId,
        scheduledAt: new Date().toISOString(),
        milestoneTitle: milestoneTitle,
        projectTitle: projectTitle,
        endDate: endDate
      };
      await AsyncStorage.setItem('milestoneNotifications', JSON.stringify(milestoneNotifications));

      console.log(`✅ Milestone son günü bildirimi planlandı: "${milestoneTitle}" - ${endDateObj.toDateString()} ${notificationType.hour}:${notificationType.minute.toString().padStart(2, '0')} (ID: ${notificationId})`);
      return true;
    } catch (error) {
      console.error('❌ Milestone son günü bildirim zamanlama hatası:', error);
      return false;
    }
  }

  // Tüm bildirimleri iptal et
  async cancelAllNotifications() {
    try {
      console.log('🗑️ Tüm bildirimler iptal ediliyor...');
      await Notifications.cancelAllScheduledNotificationsAsync();
      this.scheduledNotifications.clear();
      
      // AsyncStorage'dan da temizle
      await AsyncStorage.removeItem('dailyReminderSettings');
      await AsyncStorage.removeItem('projectNotifications');
      await AsyncStorage.removeItem('milestoneNotifications');
      
      console.log('✅ Tüm zamanlanmış bildirimler iptal edildi');
    } catch (error) {
      console.error('❌ Bildirim iptal etme hatası:', error);
    }
  }

  // Belirli tipte bildirimleri iptal et
  async cancelNotificationByType(type) {
    try {
      const notificationId = this.scheduledNotifications.get(type);
      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        this.scheduledNotifications.delete(type);
        console.log(`✅ ${type} bildirimi iptal edildi (ID: ${notificationId})`);
      }
    } catch (error) {
      console.error(`❌ ${type} bildirim iptal etme hatası:`, error);
    }
  }

  // Proje bildirimini iptal et
  async cancelProjectNotification(projectId) {
    try {
      const notificationId = this.scheduledNotifications.get(`project-end-${projectId}`);
      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        this.scheduledNotifications.delete(`project-end-${projectId}`);
        
        // AsyncStorage'dan da kaldır
        const projectNotifications = await this.getProjectNotifications();
        delete projectNotifications[projectId];
        await AsyncStorage.setItem('projectNotifications', JSON.stringify(projectNotifications));
        
        console.log(`✅ Proje ${projectId} bildirimi iptal edildi (ID: ${notificationId})`);
      }
    } catch (error) {
      console.error(`❌ Proje ${projectId} bildirim iptal etme hatası:`, error);
    }
  }

  // Milestone bildirimini iptal et
  async cancelMilestoneNotification(milestoneId) {
    try {
      const notificationId = this.scheduledNotifications.get(`milestone-end-${milestoneId}`);
      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        this.scheduledNotifications.delete(`milestone-end-${milestoneId}`);
        
        // AsyncStorage'dan da kaldır
        const milestoneNotifications = await this.getMilestoneNotifications();
        delete milestoneNotifications[milestoneId];
        await AsyncStorage.setItem('milestoneNotifications', JSON.stringify(milestoneNotifications));
        
        console.log(`✅ Milestone ${milestoneId} bildirimi iptal edildi (ID: ${notificationId})`);
      }
    } catch (error) {
      console.error(`❌ Milestone ${milestoneId} bildirim iptal etme hatası:`, error);
    }
  }

  // Proje bildirimlerini al
  async getProjectNotifications() {
    try {
      const notifications = await AsyncStorage.getItem('projectNotifications');
      return notifications ? JSON.parse(notifications) : {};
    } catch (error) {
      console.error('❌ Proje bildirimleri alma hatası:', error);
      return {};
    }
  }

  // Milestone bildirimlerini al
  async getMilestoneNotifications() {
    try {
      const notifications = await AsyncStorage.getItem('milestoneNotifications');
      return notifications ? JSON.parse(notifications) : {};
    } catch (error) {
      console.error('❌ Milestone bildirimleri alma hatası:', error);
      return {};
    }
  }

  // Bildirim ayarlarını al
  async getReminderSettings() {
    try {
      const settings = await AsyncStorage.getItem('dailyReminderSettings');
      return settings ? JSON.parse(settings) : { enabled: false, hour: 20, minute: 0 };
    } catch (error) {
      console.error('❌ Bildirim ayarları alma hatası:', error);
      return { enabled: false, hour: 20, minute: 0 };
    }
  }

  // Bildirim ayarlarını güncelle
  async updateReminderSettings(enabled, hour = 20, minute = 0) {
    try {
      if (enabled) {
        await this.scheduleDailyReminder();
      } else {
        await this.cancelNotificationByType('daily-reminder');
        await AsyncStorage.setItem('dailyReminderSettings', JSON.stringify({
          enabled: false,
          hour: hour,
          minute: minute,
          disabledAt: new Date().toISOString()
        }));
      }
      return true;
    } catch (error) {
      console.error('❌ Bildirim ayarları güncelleme hatası:', error);
      return false;
    }
  }

  // Zamanlanmış bildirimleri kontrol et
  async getScheduledNotifications() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      return notifications;
    } catch (error) {
      console.error('❌ Zamanlanmış bildirimleri alma hatası:', error);
      return [];
    }
  }

  // Test bildirimi gönder
  async sendTestNotification() {
    try {
      console.log('🧪 Test bildirimi gönderiliyor...');
      
      // Development build'de test bildirimi devre dışı
      if (__DEV__) {
        console.log('⚠️ Development build - Test bildirimi devre dışı');
        return true;
      }
      
      // 5 saniye sonra test bildirimi gönder
      const testDate = new Date();
      testDate.setSeconds(testDate.getSeconds() + 5);
      
      console.log(`⏰ Test bildirimi zamanı: ${testDate.toISOString()}`);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🧪 Test Bildirimi",
          body: "Bildirim sistemi çalışıyor! 5 saniye sonra geldi.",
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: { date: testDate },
      });
      console.log('✅ Test bildirimi 5 saniye sonra gelecek');
      return true;
    } catch (error) {
      console.error('❌ Test bildirimi gönderme hatası:', error);
      return false;
    }
  }

  // Tüm projeler için bildirimleri planla
  async scheduleAllProjectNotifications(tasks) {
    try {
      console.log('📋 Tüm proje bildirimleri planlanıyor...');
      
      for (const task of tasks) {
        if (!task.done && task.endDate) {
          await this.scheduleProjectEndDateNotification(task.id, task.title, task.endDate);
        }
        
        // Milestone'lar için de bildirim planla
        if (task.milestones && task.milestones.length > 0) {
          for (const milestone of task.milestones) {
            if (!milestone.completed && milestone.endDate) {
              await this.scheduleMilestoneEndDateNotification(
                milestone.id, 
                milestone.title, 
                task.title, 
                milestone.endDate
              );
            }
          }
        }
      }
      
      console.log('✅ Tüm proje bildirimleri planlandı');
      return true;
    } catch (error) {
      console.error('❌ Tüm proje bildirimleri planlama hatası:', error);
      return false;
    }
  }

  // Bildirim durumunu kontrol et
  async getNotificationStatus() {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const dailySettings = await this.getReminderSettings();
      const projectNotifications = await this.getProjectNotifications();
      const milestoneNotifications = await this.getMilestoneNotifications();
      
      return {
        totalScheduled: scheduledNotifications.length,
        dailyReminder: {
          enabled: dailySettings.enabled,
          time: dailySettings.enabled ? `${dailySettings.hour}:${dailySettings.minute.toString().padStart(2, '0')}` : null
        },
        projectNotifications: Object.keys(projectNotifications).length,
        milestoneNotifications: Object.keys(milestoneNotifications).length,
        scheduledNotifications: scheduledNotifications.map(n => ({
          id: n.identifier,
          content: n.content,
          trigger: n.trigger
        }))
      };
    } catch (error) {
      console.error('❌ Bildirim durumu alma hatası:', error);
      return null;
    }
  }

  // Servisi temizle
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
    this.isInitialized = false;
  }
}

// Singleton instance
const notificationService = new NotificationService();
export default notificationService;