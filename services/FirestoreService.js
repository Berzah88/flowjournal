// services/FirestoreService.js
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

class FirestoreService {
  constructor() {
    // Firestore AKTİF - Expo SDK 54+ ile çalışıyor!
    this.isEnabled = true;
    this.currentUserId = null;
    this.fcmToken = null;
    this.db = firestore();
    
    console.log('✅ Firestore: Aktif edildi (Expo SDK 54+)');
    this.initializeService();
  }

  // Servisi başlat
  async initializeService() {
    try {
      // FCM token'ı al
      const token = await messaging().getToken();
      if (token) {
        this.fcmToken = token;
        console.log('✅ Firestore: FCM token alındı');
        
        // Sabit user ID kullan (auth gelene kadar)
        // Test için 'test-user', production'da AsyncStorage'dan device ID al
        await this.setCurrentUserId('test-user');
        console.log('💡 Firestore: Test user ID kullanılıyor (test-user)');
      }
      
    } catch (error) {
      console.error('❌ Firestore: Başlatma hatası:', error);
    }
  }

  // Kullanıcı ID'sini ayarla
  async setCurrentUserId(userId) {
    this.currentUserId = userId;
    console.log('✅ Firestore: Kullanıcı ID ayarlandı:', userId);
    
    // FCM token'ı varsa Firestore'a kaydet
    if (this.fcmToken) {
      await this.updateUserProfile({
        fcmToken: this.fcmToken,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul',
        language: 'tr'
      });
    }
  }

  // FCM token'ı ayarla
  async setFCMToken(token) {
    this.fcmToken = token;
    console.log('✅ Firestore: FCM token ayarlandı');
    
    // Token'ı Firestore'a kaydet
    if (this.currentUserId && token) {
      await this.updateUserProfile({
        fcmToken: token
      });
    }
  }

  // Kullanıcı profilini güncelle
  async updateUserProfile(data) {
    try {
      if (!this.currentUserId) {
        console.warn('⚠️ Firestore: Kullanıcı ID yok');
        return;
      }

      await this.db.collection('users').doc(this.currentUserId).set({
        ...data,
        updatedAt: firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      console.log('✅ Firestore: Kullanıcı profili güncellendi');
    } catch (error) {
      console.error('❌ Firestore: Profil güncelleme hatası:', error);
    }
  }

  // Projeyi Firestore'a kaydet
  async saveProject(project) {
    try {
      if (!this.currentUserId) {
        console.warn('⚠️ Firestore: Kullanıcı ID yok');
        return;
      }

      const projectData = {
        id: project.id,
        title: project.title,
        startDate: firestore.Timestamp.fromDate(new Date(project.startDate)),
        endDate: firestore.Timestamp.fromDate(new Date(project.endDate)),
        status: project.done ? 'completed' : 'active',
        milestones: project.milestones || [],
        journals: project.journals || [],
        color: project.color || '#4CAF50',
        icon: project.icon || '📋',
        notificationsSent: {
          projectDeadlines: true,
          milestoneReminders: true
        },
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp()
      };

      await this.db
        .collection('users')
        .doc(this.currentUserId)
        .collection('projects')
        .doc(project.id.toString())
        .set(projectData);

      console.log('✅ Firestore: Proje kaydedildi:', project.title);
    } catch (error) {
      console.error('❌ Firestore: Proje kaydetme hatası:', error);
      throw error;
    }
  }

  // Projeyi Firestore'dan sil
  async deleteProject(projectId) {
    try {
      if (!this.currentUserId) {
        console.warn('⚠️ Firestore: Kullanıcı ID yok');
        return;
      }

      await this.db
        .collection('users')
        .doc(this.currentUserId)
        .collection('projects')
        .doc(projectId.toString())
        .delete();

      console.log('✅ Firestore: Proje silindi');
    } catch (error) {
      console.error('❌ Firestore: Proje silme hatası:', error);
      throw error;
    }
  }

  // Projeyi güncelle
  async updateProject(projectId, updates) {
    try {
      if (!this.currentUserId) {
        console.warn('⚠️ Firestore: Kullanıcı ID yok');
        return;
      }

      const updateData = {
        ...updates,
        updatedAt: firestore.FieldValue.serverTimestamp()
      };

      // Tarih alanlarını Timestamp'e çevir
      if (updates.startDate) {
        updateData.startDate = firestore.Timestamp.fromDate(new Date(updates.startDate));
      }
      if (updates.endDate) {
        updateData.endDate = firestore.Timestamp.fromDate(new Date(updates.endDate));
      }

      // set() with merge kullan - document yoksa oluşturur, varsa günceller
      await this.db
        .collection('users')
        .doc(this.currentUserId)
        .collection('projects')
        .doc(projectId.toString())
        .set(updateData, { merge: true });

      console.log('✅ Firestore: Proje güncellendi');
    } catch (error) {
      console.error('❌ Firestore: Proje güncelleme hatası:', error);
      // Hata olsa bile devam et - AsyncStorage'da zaten güncellendi
      console.warn('⚠️ Firestore sync başarısız ama AsyncStorage güncel');
    }
  }

  // Tüm projeleri Firestore'dan al
  async getAllProjects() {
    try {
      if (!this.currentUserId) {
        console.warn('⚠️ Firestore: Kullanıcı ID yok');
        return [];
      }

      const snapshot = await this.db
        .collection('users')
        .doc(this.currentUserId)
        .collection('projects')
        .get();

      const projects = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          startDate: data.startDate?.toDate?.()?.toISOString() || data.startDate,
          endDate: data.endDate?.toDate?.()?.toISOString() || data.endDate,
        };
      });

      console.log('✅ Firestore: Projeler alındı:', projects.length);
      return projects;
    } catch (error) {
      console.error('❌ Firestore: Projeler alma hatası:', error);
      return [];
    }
  }

  // Kullanıcı bilgilerini al
  async getUserInfo() {
    try {
      if (!this.currentUserId) {
        console.warn('⚠️ Firestore: Kullanıcı ID yok');
        return null;
      }

      const doc = await this.db
        .collection('users')
        .doc(this.currentUserId)
        .get();

      if (doc.exists) {
        console.log('✅ Firestore: Kullanıcı bilgileri alındı');
        return doc.data();
      }

      console.log('⚠️ Firestore: Kullanıcı bulunamadı');
      return null;
    } catch (error) {
      console.error('❌ Firestore: Kullanıcı bilgileri alma hatası:', error);
      return null;
    }
  }
}

// Singleton instance
const firestoreService = new FirestoreService();
export default firestoreService;
