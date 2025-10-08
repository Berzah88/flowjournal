// services/ProjectDeadlineService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';

class ProjectDeadlineService {
  constructor() {
    this.subscriptionTopic = 'project_deadlines';
  }

  // Proje son günü aboneliğini kontrol et ve güncelle
  async checkAndUpdateDeadlineSubscription() {
    try {
      // AsyncStorage'dan projeleri al
      const tasks = await AsyncStorage.getItem('@tasks');
      if (!tasks) return;

      const projects = JSON.parse(tasks);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Son günü olan proje var mı kontrol et
      const hasDeadlineToday = projects.some(project => {
        if (project.done) return false; // Tamamlanan projeleri atla
        
        const endDate = new Date(project.endDate);
        endDate.setHours(0, 0, 0, 0);
        
        return endDate.getTime() === today.getTime();
      });

      // Son günü olan proje varsa abonelik aç
      if (hasDeadlineToday) {
        await this.subscribeToDeadlineNotifications();
        console.log('✅ Proje son günü aboneliği aktif edildi');
      } else {
        await this.unsubscribeFromDeadlineNotifications();
        console.log('⚠️ Proje son günü aboneliği kapatıldı');
      }

    } catch (error) {
      console.error('❌ Proje son günü abonelik kontrolü hatası:', error);
    }
  }

  // Proje son günü bildirimlerine abone ol
  async subscribeToDeadlineNotifications() {
    try {
      await messaging().subscribeToTopic(this.subscriptionTopic);
      console.log('📅 Proje son günü bildirimlerine abone olundu');
    } catch (error) {
      console.error('❌ Proje son günü abonelik hatası:', error);
    }
  }

  // Proje son günü bildirimlerinden abonelik iptal et
  async unsubscribeFromDeadlineNotifications() {
    try {
      await messaging().unsubscribeFromTopic(this.subscriptionTopic);
      console.log('📅 Proje son günü aboneliği iptal edildi');
    } catch (error) {
      console.error('❌ Proje son günü abonelik iptal hatası:', error);
    }
  }

  // Günlük kontrol (her gün çalışacak)
  async dailyDeadlineCheck() {
    console.log('🔍 Günlük proje son günü kontrolü başlıyor...');
    await this.checkAndUpdateDeadlineSubscription();
  }
}

// Singleton instance
const projectDeadlineService = new ProjectDeadlineService();
export default projectDeadlineService;
