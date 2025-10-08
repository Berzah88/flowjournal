// services/FirestoreService.js
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc, updateDoc, getDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

class FirestoreService {
  constructor() {
    // Firestore devre dışı - Expo managed workflow uyumluluğu için
    this.isEnabled = false;
    this.currentUserId = null;
    this.fcmToken = null;
    
    console.log('⚠️ Firestore: Expo managed workflow için devre dışı bırakıldı');
  }

  // Kullanıcı ID'sini ayarla (test için 'test-user' kullanıyoruz)
  async setCurrentUserId(userId = 'test-user') {
    this.currentUserId = userId;
    console.log('⚠️ Firestore: Kullanıcı ID ayarlandı (devre dışı):', userId);
  }

  // FCM token'ı ayarla
  async setFCMToken(token) {
    this.fcmToken = token;
    console.log('⚠️ Firestore: FCM token ayarlandı (devre dışı)');
    
    // Token'ı Firestore'a kaydet - DEVRE DIŞI
    // if (this.currentUserId && token) {
    //   await this.updateUserFCMToken(token);
    // }
  }

  // Kullanıcının FCM token'ını güncelle
  async updateUserFCMToken(token) {
    try {
      if (!this.currentUserId) {
        console.warn('⚠️ Firestore: Kullanıcı ID yok');
        return;
      }

      await setDoc(doc(this.db, 'users', this.currentUserId), {
        fcmToken: token,
        lastUpdated: serverTimestamp()
      }, { merge: true });

      console.log('✅ Firestore: FCM token kaydedildi');
    } catch (error) {
      console.error('❌ Firestore: FCM token kaydetme hatası:', error);
    }
  }

  // Projeyi Firestore'a kaydet
  async saveProject(project) {
    console.log('⚠️ Firestore: Proje kaydetme devre dışı:', project.title);
    // Firestore devre dışı - Expo managed workflow uyumluluğu için
    return;
  }

  // Projeyi Firestore'dan sil
  async deleteProject(projectTitle) {
    console.log('⚠️ Firestore: Proje silme devre dışı:', projectTitle);
    return;
  }

  // Projeyi güncelle (tamamlandı/aktif durumu)
  async updateProject(projectTitle, updates) {
    console.log('⚠️ Firestore: Proje güncelleme devre dışı:', projectTitle);
    return;
  }

  // Tüm projeleri Firestore'dan al
  async getAllProjects() {
    console.log('⚠️ Firestore: Projeler alma devre dışı');
    return [];
  }

  // Kullanıcı bilgilerini al
  async getUserInfo() {
    console.log('⚠️ Firestore: Kullanıcı bilgileri alma devre dışı');
    return null;
  }
}

// Singleton instance
const firestoreService = new FirestoreService();
export default firestoreService;
