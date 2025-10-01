import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Bildirim davranışını yapılandır
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.expoPushToken = null;
  }

  // Servisi başlat
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Bildirim izni iste
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Bildirim izni verilmedi');
        return false;
      }

      // Push token al (gerçek cihaz için)
      if (Device.isDevice) {
        this.expoPushToken = await Notifications.getExpoPushTokenAsync({
          projectId: '8cb30275-61a8-4b87-a711-ed6c7a0b69c2', // app.json'dan
        });
        console.log('Expo Push Token:', this.expoPushToken.data);
      } else {
        console.log('Simülatörde push token alınamaz');
      }

      // Android için notification channel oluştur
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#8E7DBE',
        });

        await Notifications.setNotificationChannelAsync('journal-reminders', {
          name: 'Journal Reminders',
          description: 'Günlük yazma hatırlatıcıları',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#8E7DBE',
        });

        await Notifications.setNotificationChannelAsync('deadline-warnings', {
          name: 'Deadline Warnings',
          description: 'Proje ve milestone deadline uyarıları',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#FF4444',
        });
      }

      this.isInitialized = true;
      console.log('NotificationService başlatıldı');
      return true;
    } catch (error) {
      console.error('NotificationService başlatma hatası:', error);
      return false;
    }
  }

  // Tüm bildirimleri temizle
  async clearAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Tüm bildirimler temizlendi');
    } catch (error) {
      console.error('Bildirimleri temizleme hatası:', error);
    }
  }

  // Belirli bir bildirimi iptal et
  async cancelNotification(notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log(`Bildirim iptal edildi: ${notificationId}`);
    } catch (error) {
      console.error('Bildirim iptal etme hatası:', error);
    }
  }

  // Bildirim ID'sini kaydet
  async saveNotificationId(type, id, data = {}) {
    try {
      const key = `notification_${type}_${id}`;
      await AsyncStorage.setItem(key, JSON.stringify({
        notificationId: id,
        data,
        createdAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Bildirim ID kaydetme hatası:', error);
    }
  }

  // Bildirim ID'sini sil
  async removeNotificationId(type, id) {
    try {
      const key = `notification_${type}_${id}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Bildirim ID silme hatası:', error);
    }
  }

  // ==================== JOURNAL REMINDERS ====================

  // Günlük yazma hatırlatıcısı planla
  async scheduleJournalReminder(time = '20:00') {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      
      // Mevcut journal reminder'ı iptal et
      await this.cancelJournalReminder();

      const trigger = {
        hour: hours,
        minute: minutes,
        repeats: true,
      };

      // Motivasyonel mesajlar
      const motivationalMessages = [
        'How about recording your experiences and emotions today?',
        'How was your day? Share your thoughts!',
        'What made you happy today?',
        'Time for journaling! Record your story.',
        'Did you learn anything new today?',
        'Perfect time to record your feelings and thoughts!',
        'Summarize your day and save it for future you.',
        'What moments made you smile today?'
      ];

      const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Journal Time!',
          body: randomMessage,
          data: { 
            type: 'journal_reminder',
            action: 'open_journal',
            category: 'journal'
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
          lightColor: '#8E7DBE',
          sticky: false,
          autoDismiss: true,
          // Custom color for journal notifications
          ...(Platform.OS === 'android' && { 
            color: '#8E7DBE'
          }),
        },
        trigger,
      });

      await this.saveNotificationId('journal_reminder', notificationId, { time });
      console.log(`Journal reminder planlandı: ${time} (ID: ${notificationId})`);
      return notificationId;
    } catch (error) {
      console.error('Journal reminder planlama hatası:', error);
      return null;
    }
  }

  // Journal reminder'ı iptal et
  async cancelJournalReminder() {
    try {
      const key = 'notification_journal_reminder_*';
      const keys = await AsyncStorage.getAllKeys();
      const journalKeys = keys.filter(k => k.startsWith('notification_journal_reminder_'));
      
      for (const key of journalKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const { notificationId } = JSON.parse(data);
          await this.cancelNotification(notificationId);
          await AsyncStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Journal reminder iptal etme hatası:', error);
    }
  }

  // ==================== DEADLINE WARNINGS ====================

  // Proje deadline uyarısı planla
  async scheduleProjectDeadlineWarning(projectId, projectTitle, deadlineDate, daysBefore = 3) {
    try {
      const deadline = new Date(deadlineDate);
      const warningDate = new Date(deadline);
      warningDate.setDate(deadline.getDate() - daysBefore);

      const now = new Date();
      console.log('Notification Debug:', {
        projectTitle,
        deadline: deadline.toISOString(),
        warningDate: warningDate.toISOString(),
        now: now.toISOString(),
        daysBefore,
        isWarningDateInPast: warningDate <= now
      });

      // Geçmiş tarihse planlama
      if (warningDate <= now) {
        console.log('Deadline uyarısı geçmiş tarih için planlanamaz');
        return null;
      }

      const trigger = {
        date: warningDate,
      };

      // Deadline mesajları
      let title, body;
      if (daysBefore === 3) {
        title = 'Project Deadline Approaching!';
        body = `"${projectTitle}" project ends in 3 days. You still have time!`;
      } else if (daysBefore === 1) {
        title = 'Last Day!';
        body = `"${projectTitle}" project ends tomorrow! Time for final touches.`;
      } else {
        title = 'Deadline Warning';
        body = `"${projectTitle}" project ends in ${daysBefore} days!`;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { 
            type: 'project_deadline_warning',
            projectId,
            projectTitle,
            deadlineDate,
            daysBefore,
            action: 'open_project',
            category: 'deadline'
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 500, 250, 500],
          lightColor: '#FF4444',
          sticky: false,
          autoDismiss: true,
          // Custom color for deadline notifications
          ...(Platform.OS === 'android' && { 
            color: '#FF4444'
          }),
        },
        trigger,
      });

      await this.saveNotificationId('project_deadline', notificationId, {
        projectId,
        projectTitle,
        deadlineDate,
        daysBefore
      });

      console.log(`Proje deadline uyarısı planlandı: ${projectTitle} (${daysBefore} gün önce)`);
      return notificationId;
    } catch (error) {
      console.error('Proje deadline uyarısı planlama hatası:', error);
      return null;
    }
  }

  // Proje deadline uyarısını iptal et
  async cancelProjectDeadlineWarning(projectId) {
    try {
      const key = `notification_project_deadline_${projectId}`;
      const data = await AsyncStorage.getItem(key);
      
      if (data) {
        const { notificationId } = JSON.parse(data);
        await this.cancelNotification(notificationId);
        await AsyncStorage.removeItem(key);
        console.log(`Proje deadline uyarısı iptal edildi: ${projectId}`);
      }
    } catch (error) {
      console.error('Proje deadline uyarısı iptal etme hatası:', error);
    }
  }

  // ==================== MILESTONE REMINDERS ====================

  // Milestone deadline hatırlatıcısı planla
  async scheduleMilestoneReminder(milestoneId, milestoneTitle, projectTitle, deadlineDate, daysBefore = 1) {
    try {
      // Check if notification already exists for this milestone
      const existingKey = `notification_milestone_reminder_${milestoneId}`;
      const existingData = await AsyncStorage.getItem(existingKey);
      
      if (existingData) {
        console.log('🔔 DEBUG: Notification already exists for milestone', milestoneId);
        return null; // Don't schedule duplicate notification
      }

      const deadline = new Date(deadlineDate);
      const reminderDate = new Date(deadline);
      reminderDate.setDate(deadline.getDate() - daysBefore);

      console.log('🔔 DEBUG: scheduleMilestoneReminder called', {
        milestoneId,
        milestoneTitle,
        projectTitle,
        deadlineDate,
        deadline: deadline.toISOString(),
        reminderDate: reminderDate.toISOString(),
        daysBefore,
        now: new Date().toISOString(),
        isReminderInPast: reminderDate <= new Date()
      });

      // Geçmiş tarihse planlama
      if (reminderDate <= new Date()) {
        console.log('❌ Milestone hatırlatıcısı geçmiş tarih için planlanamaz');
        return null;
      }

      const trigger = {
        date: reminderDate,
      };

      // Milestone mesajları - sadece son gün için
      const milestoneMessages = [
        `"${milestoneTitle}" milestone ends tomorrow!`,
        `Last day for "${milestoneTitle}" milestone.`,
        `"${milestoneTitle}" deadline is tomorrow!`,
        `Final day for "${milestoneTitle}" milestone!`,
        `"${milestoneTitle}" milestone deadline tomorrow!`
      ];

      const randomMessage = milestoneMessages[Math.floor(Math.random() * milestoneMessages.length)];

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Milestone Reminder`,
          body: randomMessage,
          data: { 
            type: 'milestone_reminder',
            milestoneId,
            milestoneTitle,
            projectTitle,
            deadlineDate,
            daysBefore,
            action: 'open_milestone',
            category: 'milestone'
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 300, 200, 300],
          lightColor: '#4A90E2',
          sticky: false,
          autoDismiss: true,
          // Custom color for milestone notifications
          ...(Platform.OS === 'android' && { 
            color: '#4A90E2'
          }),
        },
        trigger,
      });

      await this.saveNotificationId('milestone_reminder', notificationId, {
        milestoneId,
        milestoneTitle,
        projectTitle,
        deadlineDate,
        daysBefore
      });

      console.log(`Milestone hatırlatıcısı planlandı: ${milestoneTitle} (${daysBefore} gün önce)`);
      return notificationId;
    } catch (error) {
      console.error('Milestone hatırlatıcısı planlama hatası:', error);
      return null;
    }
  }

  // Milestone hatırlatıcısını iptal et
  async cancelMilestoneReminder(milestoneId) {
    try {
      const key = `notification_milestone_reminder_${milestoneId}`;
      const data = await AsyncStorage.getItem(key);
      
      if (data) {
        const { notificationId } = JSON.parse(data);
        await this.cancelNotification(notificationId);
        await AsyncStorage.removeItem(key);
        console.log(`Milestone hatırlatıcısı iptal edildi: ${milestoneId}`);
      }
    } catch (error) {
      console.error('Milestone hatırlatıcısı iptal etme hatası:', error);
    }
  }

  // ==================== BULK OPERATIONS ====================

  // Tüm projeler için deadline uyarıları planla
  async scheduleAllProjectDeadlines(projects) {
    try {
      for (const project of projects) {
        if (!project.done && project.endDate) {
          // 3 gün önce uyarı
          await this.scheduleProjectDeadlineWarning(
            project.id,
            project.title,
            project.endDate,
            3
          );
          
          // 1 gün önce uyarı
          await this.scheduleProjectDeadlineWarning(
            project.id,
            project.title,
            project.endDate,
            1
          );
        }
      }
    } catch (error) {
      console.error('Tüm proje deadline uyarıları planlama hatası:', error);
    }
  }

  // Tüm milestone'lar için hatırlatıcılar planla
  async scheduleAllMilestoneReminders(projects) {
    try {
      for (const project of projects) {
        if (!project.done && project.milestones) {
          for (const milestone of project.milestones) {
            if (!milestone.completed && milestone.endDate) {
              await this.scheduleMilestoneReminder(
                milestone.id,
                milestone.title,
                project.title,
                milestone.endDate,
                1
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('Tüm milestone hatırlatıcıları planlama hatası:', error);
    }
  }

  // ==================== SPECIAL NOTIFICATIONS ====================

  // Başarı kutlaması bildirimi
  async scheduleSuccessCelebration(type, title, message) {
    try {
      const celebrationMessages = {
        project_completed: [
          'Awesome! You successfully completed your project!',
          'Congratulations! Another project completed!',
          'Amazing! You finished your project!',
          'Bravo! You completed it successfully!'
        ],
        milestone_completed: [
          'Milestone completed! Keep going!',
          'Great! Another milestone done!',
          'Super! You completed your milestone!',
          'Strong! Keep it up!'
        ],
        journal_streak: [
          'Your journaling streak continues!',
          'Great! Your consistency is amazing!',
          'Your journaling habit is super!',
          'You are really determined!'
        ]
      };

      const messages = celebrationMessages[type] || ['Congratulations!'];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: randomMessage,
          body: message,
          data: { 
            type: 'success_celebration',
            celebrationType: type,
            action: 'view_achievement',
            category: 'celebration'
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 200, 100, 200, 100, 200],
          lightColor: '#4CAF50',
          sticky: false,
          autoDismiss: true,
          // Custom color for success celebration notifications
          ...(Platform.OS === 'android' && { 
            color: '#4CAF50'
          }),
        },
        trigger: null, // Anında gönder
      });

      console.log(`Başarı kutlaması gönderildi: ${type}`);
      return notificationId;
    } catch (error) {
      console.error('Başarı kutlaması gönderme hatası:', error);
      return null;
    }
  }

  // ==================== PROGRESS FEEDBACK NOTIFICATIONS ====================

  // Proje ilerlemesi geri bildirim bildirimi
  async scheduleProgressFeedbackNotification(projectId, projectTitle, currentMilestone, progressPercentage) {
    try {
      const feedbackMessages = [
        {
          title: 'How is Your Project Progress?',
          body: `You've made ${progressPercentage}% progress on "${projectTitle}". How is it going?`
        },
        {
          title: 'Feedback Time!',
          body: `You're at "${currentMilestone}" stage in "${projectTitle}". How do you feel?`
        },
        {
          title: 'Project Status Check',
          body: `How is "${projectTitle}" going? Are you facing any challenges?`
        },
        {
          title: 'Progress Evaluation',
          body: `Great progress on "${projectTitle}"! How is it going?`
        },
        {
          title: 'Project Update',
          body: `You're at "${currentMilestone}" stage in "${projectTitle}". Would you like to give feedback?`
        }
      ];

      const randomMessage = feedbackMessages[Math.floor(Math.random() * feedbackMessages.length)];

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: randomMessage.title,
          body: randomMessage.body,
          data: { 
            type: 'progress_feedback',
            projectId,
            projectTitle,
            currentMilestone,
            progressPercentage,
            action: 'open_project_feedback',
            category: 'feedback'
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
          vibrate: [0, 200, 100, 200],
          lightColor: '#8E7DBE',
          sticky: false,
          autoDismiss: true,
          // Custom color for progress feedback notifications
          ...(Platform.OS === 'android' && { 
            color: '#8E7DBE'
          }),
        },
        trigger: null, // Anında gönder
      });

      console.log(`Progress feedback bildirimi gönderildi: ${projectTitle}`);
      return notificationId;
    } catch (error) {
      console.error('Progress feedback bildirimi gönderme hatası:', error);
      return null;
    }
  }

  // Tüm aktif projeler için progress feedback planla
  async scheduleAllProgressFeedbacks(tasks) {
    try {
      const settings = await this.loadNotificationSettings();
      if (!settings.progressFeedbackEnabled) return;

      const activeProjects = tasks.filter(task => !task.done && task.milestones && task.milestones.length > 0);
      
      for (const project of activeProjects) {
        const completedMilestones = project.milestones.filter(ms => ms.completed).length;
        const totalMilestones = project.milestones.length;
        const progressPercentage = Math.round((completedMilestones / totalMilestones) * 100);
        
        // Sadece %10'dan fazla ilerleme varsa bildirim gönder
        if (progressPercentage >= 10) {
          const currentMilestone = project.milestones.find(ms => !ms.completed)?.title || 'Son aşama';
          
          // Random zamanlama (1-7 gün arası)
          const randomDays = Math.floor(Math.random() * 7) + 1;
          const randomHours = Math.floor(Math.random() * 12) + 9; // 9-21 arası
          const randomMinutes = Math.floor(Math.random() * 60);
          
          const triggerDate = new Date();
          triggerDate.setDate(triggerDate.getDate() + randomDays);
          triggerDate.setHours(randomHours, randomMinutes, 0, 0);

          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'How is Your Project Progress?',
              body: `You've made ${progressPercentage}% progress on "${project.title}". How is it going?`,
              data: { 
                type: 'progress_feedback',
                projectId: project.id,
                projectTitle: project.title,
                currentMilestone,
                progressPercentage,
                action: 'open_project_feedback',
                category: 'feedback'
              },
              sound: true,
              priority: Notifications.AndroidNotificationPriority.DEFAULT,
              vibrate: [0, 200, 100, 200],
              lightColor: '#8E7DBE',
              sticky: false,
              autoDismiss: true,
              // Custom color for progress feedback notifications
              ...(Platform.OS === 'android' && { 
                color: '#8E7DBE'
              }),
            },
            trigger: { date: triggerDate },
          });

          await this.saveNotificationId('progress_feedback', notificationId, {
            projectId: project.id,
            projectTitle: project.title,
            progressPercentage,
            scheduledDate: triggerDate.toISOString()
          });

          console.log(`Progress feedback planlandı: ${project.title} (${randomDays} gün sonra)`);
        }
      }
    } catch (error) {
      console.error('Progress feedback planlama hatası:', error);
    }
  }

  // Progress feedback bildirimini iptal et
  async cancelProgressFeedbackNotification(projectId) {
    const existingNotifications = this.notificationIds['progress_feedback'] || {};
    for (const id in existingNotifications) {
      if (existingNotifications[id].projectId === projectId) {
        await this.cancelNotification('progress_feedback', id);
      }
    }
  }

  // Motivasyon mesajı
  async scheduleMotivationalMessage() {
    try {
      const motivationalMessages = [
        {
          title: 'Motivation Time!',
          body: 'You can achieve great things today too!'
        },
        {
          title: 'You are Amazing!',
          body: 'You are getting better every day!'
        },
        {
          title: 'Focus on Your Goals!',
          body: 'Keep working for your big dreams!'
        },
        {
          title: 'You are Making Progress!',
          body: 'Every step brings you closer to your goal!'
        },
        {
          title: 'You are on the Path to Success!',
          body: 'Your consistency will lead you to success!'
        }
      ];

      const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: randomMessage.title,
          body: randomMessage.body,
          data: { 
            type: 'motivational_message',
            action: 'open_app',
            category: 'motivation'
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
          vibrate: [0, 150, 100, 150],
          lightColor: '#8E7DBE',
          sticky: false,
          autoDismiss: true,
          // Custom color for motivational notifications
          ...(Platform.OS === 'android' && { 
            color: '#8E7DBE'
          }),
        },
        trigger: null, // Anında gönder
      });

      console.log('Motivasyon mesajı gönderildi');
      return notificationId;
    } catch (error) {
      console.error('Motivasyon mesajı gönderme hatası:', error);
      return null;
    }
  }

  // ==================== SETTINGS ====================

  // Bildirim ayarlarını kaydet
  async saveNotificationSettings(settings) {
    try {
      await AsyncStorage.setItem('notification_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Bildirim ayarları kaydetme hatası:', error);
    }
  }

  // Bildirim ayarlarını yükle
  async loadNotificationSettings() {
    try {
      const settings = await AsyncStorage.getItem('notification_settings');
      return settings ? JSON.parse(settings) : {
        journalReminderEnabled: false, // Günlük hatırlatıcıyı kapat
        journalReminderTime: '20:00',
        deadlineWarningsEnabled: false, // Proje deadline uyarılarını kapat
        milestoneRemindersEnabled: true, // Sadece milestone hatırlatıcıları açık
      };
    } catch (error) {
      console.error('Bildirim ayarları yükleme hatası:', error);
      return {
        journalReminderEnabled: false, // Günlük hatırlatıcıyı kapat
        journalReminderTime: '20:00',
        deadlineWarningsEnabled: false, // Proje deadline uyarılarını kapat
        milestoneRemindersEnabled: true, // Sadece milestone hatırlatıcıları açık
        progressFeedbackEnabled: false, // Progress feedback'i kapat
        progressFeedbackFrequency: 'weekly', // daily, weekly, biweekly
      };
    }
  }
}

// Singleton instance
const notificationService = new NotificationService();
export default notificationService;
