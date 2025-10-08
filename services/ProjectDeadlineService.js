// services/ProjectDeadlineService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { STORAGE_KEYS } from '../constants';

class ProjectDeadlineService {
  constructor() {
    this.subscriptionTopic = 'Last_day';
  }

  // Proje son günü aboneliğini kontrol et ve güncelle
  async checkAndUpdateDeadlineSubscription() {
    try {
      console.log('📋 AsyncStorage\'dan projeler alınıyor...');
      
      // AsyncStorage'dan projeleri al
      const tasks = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
      if (!tasks) {
        console.log('⚠️ AsyncStorage\'da hiç proje yok');
        await this.unsubscribeFromDeadlineNotifications();
        return;
      }

      const projects = JSON.parse(tasks);
      console.log(`📊 Toplam proje sayısı: ${projects.length}`);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      console.log(`📅 Bugünün tarihi: ${today.toISOString().split('T')[0]}`);

      // Son günü olan proje var mı kontrol et
      let deadlineProjects = [];
      const hasDeadlineToday = projects.some(project => {
        if (project.done) {
          console.log(`⏭️ Proje atlandı (tamamlanmış): ${project.title}`);
          return false;
        }
        
        const endDate = new Date(project.endDate);
        endDate.setHours(0, 0, 0, 0);
        
        console.log(`🔍 Proje: "${project.title}" - Bitiş: ${endDate.toISOString().split('T')[0]}`);
        
        const isDeadlineToday = endDate.getTime() === today.getTime();
        if (isDeadlineToday) {
          deadlineProjects.push(project.title);
          console.log(`🎯 SON GÜN PROJESİ BULUNDU: ${project.title}`);
        }
        
        return isDeadlineToday;
      });

      // Son günü olan proje varsa abonelik aç
      if (hasDeadlineToday) {
        console.log(`✅ ${deadlineProjects.length} adet son gün projesi bulundu: ${deadlineProjects.join(', ')}`);
        await this.subscribeToDeadlineNotifications();
        console.log('✅ Last_day topic\'ine abone olundu!');
      } else {
        console.log('⚠️ Bugün son günü olan proje yok');
        await this.unsubscribeFromDeadlineNotifications();
        console.log('📴 Last_day topic aboneliği iptal edildi');
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
