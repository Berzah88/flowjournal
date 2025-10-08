// services/FirestoreService.js
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

class FirestoreService {
  constructor() {
    this.db = firestore();
    this.currentUserId = null;
    this.fcmToken = null;
  }

  // Kullanıcı ID'sini ayarla (test için 'test-user' kullanıyoruz)
  async setCurrentUserId(userId = 'test-user') {
    this.currentUserId = userId;
    console.log('🔥 Firestore: Kullanıcı ID ayarlandı:', userId);
  }

  // FCM token'ı ayarla
  async setFCMToken(token) {
    this.fcmToken = token;
    console.log('🔥 Firestore: FCM token ayarlandı');
    
    // Token'ı Firestore'a kaydet
    if (this.currentUserId && token) {
      await this.updateUserFCMToken(token);
    }
  }

  // Kullanıcının FCM token'ını güncelle
  async updateUserFCMToken(token) {
    try {
      if (!this.currentUserId) {
        console.warn('⚠️ Firestore: Kullanıcı ID yok');
        return;
      }

      await this.db.collection('users').doc(this.currentUserId).set({
        fcmToken: token,
        lastUpdated: firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      console.log('✅ Firestore: FCM token kaydedildi');
    } catch (error) {
      console.error('❌ Firestore: FCM token kaydetme hatası:', error);
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
        name: project.title,
        deadline: new Date(project.endDate),
        notificationsEnabled: true,
        status: project.done ? 'completed' : 'active',
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp()
      };

      await this.db
        .collection('users')
        .doc(this.currentUserId)
        .collection('projects')
        .doc(project.title) // Proje adını document ID olarak kullan
        .set(projectData);

      console.log('✅ Firestore: Proje kaydedildi:', project.title);
    } catch (error) {
      console.error('❌ Firestore: Proje kaydetme hatası:', error);
    }
  }

  // Projeyi Firestore'dan sil
  async deleteProject(projectTitle) {
    try {
      if (!this.currentUserId) {
        console.warn('⚠️ Firestore: Kullanıcı ID yok');
        return;
      }

      await this.db
        .collection('users')
        .doc(this.currentUserId)
        .collection('projects')
        .doc(projectTitle)
        .delete();

      console.log('✅ Firestore: Proje silindi:', projectTitle);
    } catch (error) {
      console.error('❌ Firestore: Proje silme hatası:', error);
    }
  }

  // Projeyi güncelle (tamamlandı/aktif durumu)
  async updateProject(projectTitle, updates) {
    try {
      if (!this.currentUserId) {
        console.warn('⚠️ Firestore: Kullanıcı ID yok');
        return;
      }

      const updateData = {
        ...updates,
        updatedAt: firestore.FieldValue.serverTimestamp()
      };

      await this.db
        .collection('users')
        .doc(this.currentUserId)
        .collection('projects')
        .doc(projectTitle)
        .update(updateData);

      console.log('✅ Firestore: Proje güncellendi:', projectTitle);
    } catch (error) {
      console.error('❌ Firestore: Proje güncelleme hatası:', error);
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

      const projects = [];
      snapshot.forEach(doc => {
        projects.push({
          id: doc.id,
          ...doc.data()
        });
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
        return { id: doc.id, ...doc.data() };
      }
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
