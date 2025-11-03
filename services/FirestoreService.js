// services/FirestoreService.js
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  serverTimestamp,
  Timestamp
} from '@react-native-firebase/firestore';
import { getMessaging, getToken } from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

class FirestoreService {
  constructor() {
    // Firestore AKTİF - Expo SDK 54+ ile çalışıyor!
    this.isEnabled = true;
    this.currentUserId = null;
    this.fcmToken = null;
    this.db = getFirestore();
    
    console.log('✅ Firestore: Aktif edildi (Expo SDK 54+)');
    // Track the last profile write to avoid duplicate writes from multiple services
    this._lastProfileWrite = { dataStr: null, ts: 0 };

    // initializeService may read token and write profile on startup.
    // Keep it, but duplicate-write guards below will prevent repeated writes
    this.initializeService();
  }

  // Servisi başlat
  async initializeService() {
    try {
      // FCM token'ı al - modular API
      const messagingInstance = getMessaging();
      const token = await getToken(messagingInstance);
      if (token) {
        this.fcmToken = token;
        console.log('✅ Firestore: FCM token alındı');
        
        // Unique user ID oluştur veya al
        // Authentication sistemi yoksa, cihaz bazlı ID kullan
        let userId = await AsyncStorage.getItem('unique_user_id');
        
        if (!userId) {
          // İlk kez çalışıyor - FCM token'ın ilk 20 karakterini kullan (unique)
          userId = `user_${token.substring(0, 20)}`;
          await AsyncStorage.setItem('unique_user_id', userId);
          console.log('✅ Firestore: Yeni kullanıcı ID oluşturuldu');
        }
        
        await this.setCurrentUserId(userId);
        console.log(`💡 Firestore: Kullanıcı ID: ${userId.substring(0, 25)}...`);
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
    // If token didn't change, skip expensive Firestore write
    if (this.currentUserId && token) {
      if (this.fcmToken === token && this._lastProfileWrite && this._lastProfileWrite.dataStr && this._lastProfileWrite.dataStr.includes(token)) {
        console.log('ℹ️ Firestore: FCM token unchanged, profile update skipped');
        return;
      }

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

      // Avoid repeated identical writes in short time windows (debounce)
      const dataStr = JSON.stringify(data || {});
      const now = Date.now();
      const recent = this._lastProfileWrite || { dataStr: null, ts: 0 };
      // If same payload was written recently (within 10s), skip
      if (recent.dataStr === dataStr && (now - recent.ts) < 10000) {
        console.log('ℹ️ Firestore: Aynı profil verisi kısa süre içinde yazıldı, atlanıyor');
        return;
      }

      const userDocRef = doc(this.db, 'users', this.currentUserId);
      // Log what we are going to write for easier debugging
      console.log('ℹ️ Firestore: Kullanıcı profili güncelleniyor. userId=', this.currentUserId, 'data=', data);
      await setDoc(userDocRef, {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // remember last write
      this._lastProfileWrite = { dataStr, ts: now };

      console.log('✅ Firestore: Kullanıcı profili güncellendi');
    } catch (error) {
      console.error('❌ Firestore: Profil güncelleme hatası:', error);
      // If write is rejected due to security rules, provide hint
      if (error && error.code) {
        console.error('Firestore error code:', error.code);
      }
    }
  }

  // Projeyi Firestore'a kaydet
  async saveProject(project) {
    try {
      if (!this.currentUserId) {
        console.warn('⚠️ Firestore: Kullanıcı ID yok');
        return;
      }

      // Undefined değerleri temizle
      const cleanProject = this.removeUndefinedFields(project);

      const projectData = {
        id: cleanProject.id,
        title: cleanProject.title,
        startDate: Timestamp.fromDate(new Date(cleanProject.startDate)),
        endDate: Timestamp.fromDate(new Date(cleanProject.endDate)),
        status: cleanProject.done ? 'completed' : 'active',
        milestones: cleanProject.milestones || [],
        journalEntries: cleanProject.journalEntries || [],
        color: cleanProject.color || '#4CAF50',
        icon: cleanProject.icon || '📋',
        done: cleanProject.done || false,
        notificationsSent: {
          projectDeadlines: true,
          milestoneReminders: true
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const projectDocRef = doc(this.db, 'users', this.currentUserId, 'projects', cleanProject.id.toString());
      await setDoc(projectDocRef, projectData);

      console.log('✅ Firestore: Proje kaydedildi:', cleanProject.title);
    } catch (error) {
      console.error('❌ Firestore: Proje kaydetme hatası:', error);
      console.error('❌ Hata detayı:', error.message);
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

      const projectDocRef = doc(this.db, 'users', this.currentUserId, 'projects', projectId.toString());
      await deleteDoc(projectDocRef);

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

      // Undefined değerleri temizle (Firestore undefined kabul etmez)
      const cleanUpdates = this.removeUndefinedFields(updates);

      const updateData = {
        ...cleanUpdates,
        updatedAt: serverTimestamp()
      };

      // Tarih alanlarını Timestamp'e çevir
      if (cleanUpdates.startDate) {
        updateData.startDate = Timestamp.fromDate(new Date(cleanUpdates.startDate));
      }
      if (cleanUpdates.endDate) {
        updateData.endDate = Timestamp.fromDate(new Date(cleanUpdates.endDate));
      }
      if (cleanUpdates.completedAt) {
        updateData.completedAt = Timestamp.fromDate(new Date(cleanUpdates.completedAt));
      }

      // set() with merge kullan - document yoksa oluşturur, varsa günceller
      const projectDocRef = doc(this.db, 'users', this.currentUserId, 'projects', projectId.toString());
      await setDoc(projectDocRef, updateData, { merge: true });

      console.log('✅ Firestore: Proje güncellendi');
    } catch (error) {
      console.error('❌ Firestore: Proje güncelleme hatası:', error);
      console.error('❌ Hata detayı:', error.message);
      // Hata olsa bile devam et - AsyncStorage'da zaten güncellendi
      console.warn('⚠️ Firestore sync başarısız ama AsyncStorage güncel');
    }
  }

  // Helper: Undefined alanları recursive olarak temizle
  removeUndefinedFields(obj) {
    if (obj === null || obj === undefined) {
      return null;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefinedFields(item)).filter(item => item !== null && item !== undefined);
    }

    if (typeof obj === 'object') {
      const cleaned = {};
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (value !== undefined) {
          const cleanedValue = this.removeUndefinedFields(value);
          if (cleanedValue !== null && cleanedValue !== undefined) {
            cleaned[key] = cleanedValue;
          }
        }
      });
      return cleaned;
    }

    return obj;
  }

  // Tüm projeleri Firestore'dan al
  async getAllProjects() {
    try {
      if (!this.currentUserId) {
        console.warn('⚠️ Firestore: Kullanıcı ID yok');
        return [];
      }

      const projectsCollectionRef = collection(this.db, 'users', this.currentUserId, 'projects');
      const snapshot = await getDocs(projectsCollectionRef);

      const projects = snapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          ...data,
          startDate: data.startDate?.toDate?.()?.toISOString() || data.startDate,
          endDate: data.endDate?.toDate?.()?.toISOString() || data.endDate,
        };
      });

      // SADECE AKTİF PROJELERİ DÖNDÜR
      // Basit ve net filtreleme mantığı:
      // - status: 'completed' olanları hariç tut
      // - completed: true olanları hariç tut
      // - Diğer tüm projeleri aktif kabul et
      const activeProjects = projects.filter(p => {
        // status alanı varsa completed mı kontrol et
        if (p.status === 'completed') return false;

        // status alanı yoksa completed field'ına bak
        if (p.completed === true) return false;

        // Diğer tüm projeleri aktif kabul et
        return true;
      });

      console.log('✅ Firestore: Aktif projeler alındı:', activeProjects.length, '(Toplam:', projects.length, ')');

      // Cache problemi kontrolü için timestamp bilgisi
      console.log('🕒 Veri yükleme zamanı:', new Date().toISOString());

      // Detaylı debug bilgisi
      console.log('📋 Tüm proje detayları:');
      projects.forEach((p, index) => {
        console.log(`  ${index + 1}. ${p.title} - status: ${p.status}, completed: ${p.completed}`);
      });

      console.log('📋 Aktif proje başlıkları:', activeProjects.map(p => `${p.title}(${p.status || 'no-status'}, ${p.completed})`).join(', '));

      // Cache temizleme önerisi
      if (activeProjects.length !== 2) {
        console.warn('⚠️ Cache problemi olabilir! Firestore hala eski veriyi döndürüyor.');
        console.log('💡 Çözüm: Uygulamayı yeniden başlatın veya birkaç dakika bekleyin.');
      }
       // Return the active projects for callers
       return activeProjects;
    } catch (error) {
      console.error('❌ Firestore: Projeler alma hatası:', error);
      return [];
    }
  }

  // Tüm milestone'ları Firestore'dan al
  async getAllMilestones() {
    try {
      if (!this.currentUserId) {
        console.warn('⚠️ Firestore: Kullanıcı ID yok');
        return [];
      }

      const milestonesCollectionRef = collection(this.db, 'users', this.currentUserId, 'milestones');
      const snapshot = await getDocs(milestonesCollectionRef);

      const milestones = snapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          ...data,
          startDate: data.startDate?.toDate?.()?.toISOString() || data.startDate,
          endDate: data.endDate?.toDate?.()?.toISOString() || data.endDate,
          completedAt: data.completedAt?.toDate?.()?.toISOString() || data.completedAt,
        };
      });

      console.log('✅ Firestore: Milestone\'lar alındı:', milestones.length);
      return milestones;
    } catch (error) {
      console.error('❌ Firestore: Milestone\'lar alma hatası:', error);
      return [];
    }
  }

  // Milestone'ı Firestore'a kaydet
  async saveMilestone(milestone, taskId) {
    try {
      if (!this.currentUserId) {
        console.warn('⚠️ Firestore: Kullanıcı ID yok');
        return;
      }

      // Undefined değerleri temizle
      const cleanMilestone = this.removeUndefinedFields(milestone);

      const milestoneData = {
        id: cleanMilestone.id,
        title: cleanMilestone.title,
        description: cleanMilestone.description || '',
        startDate: cleanMilestone.startDate ? Timestamp.fromDate(new Date(cleanMilestone.startDate)) : null,
        endDate: cleanMilestone.endDate ? Timestamp.fromDate(new Date(cleanMilestone.endDate)) : null,
        completed: cleanMilestone.completed || false,
        completedAt: cleanMilestone.completedAt ? Timestamp.fromDate(new Date(cleanMilestone.completedAt)) : null,
        parentId: cleanMilestone.parentId || null,
        taskId: taskId || null,
        journalEntries: cleanMilestone.journalEntries || [],
        media: cleanMilestone.media || [],
        location: cleanMilestone.location || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const milestoneDocRef = doc(this.db, 'users', this.currentUserId, 'milestones', cleanMilestone.id.toString());
      await setDoc(milestoneDocRef, milestoneData);

      console.log('✅ Firestore: Milestone kaydedildi:', cleanMilestone.title);
    } catch (error) {
      console.error('❌ Firestore: Milestone kaydetme hatası:', error);
      console.error('❌ Hata detayı:', error.message);
      throw error;
    }
  }

  // Milestone'ı güncelle
  async updateMilestone(milestoneId, updates) {
    try {
      if (!this.currentUserId) {
        console.warn('⚠️ Firestore: Kullanıcı ID yok');
        return;
      }

      // Undefined değerleri temizle
      const cleanUpdates = this.removeUndefinedFields(updates);

      const updateData = {
        ...cleanUpdates,
        updatedAt: serverTimestamp()
      };

      // Tarih alanlarını Timestamp'e çevir
      if (cleanUpdates.startDate) {
        updateData.startDate = Timestamp.fromDate(new Date(cleanUpdates.startDate));
      }
      if (cleanUpdates.endDate) {
        updateData.endDate = Timestamp.fromDate(new Date(cleanUpdates.endDate));
      }
      if (cleanUpdates.completedAt) {
        updateData.completedAt = Timestamp.fromDate(new Date(cleanUpdates.completedAt));
      }

      const milestoneDocRef = doc(this.db, 'users', this.currentUserId, 'milestones', milestoneId.toString());
      await setDoc(milestoneDocRef, updateData, { merge: true });

      console.log('✅ Firestore: Milestone güncellendi');
    } catch (error) {
      console.error('❌ Firestore: Milestone güncelleme hatası:', error);
      console.error('❌ Hata detayı:', error.message);
    }
  }

  // Milestone'ı sil
  async deleteMilestone(milestoneId) {
    try {
      if (!this.currentUserId) {
        console.warn('⚠️ Firestore: Kullanıcı ID yok');
        return;
      }

      const milestoneDocRef = doc(this.db, 'users', this.currentUserId, 'milestones', milestoneId.toString());
      await deleteDoc(milestoneDocRef);

      console.log('✅ Firestore: Milestone silindi');
    } catch (error) {
      console.error('❌ Firestore: Milestone silme hatası:', error);
      throw error;
    }
  }
}

// Singleton instance
const firestoreService = new FirestoreService();
export default firestoreService;
