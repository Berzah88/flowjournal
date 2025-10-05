// utils/DataIntegrityManager.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';

class DataIntegrityManager {
  static async createSecureBackup(data) {
    try {
      const timestamp = Date.now();
      const backupKey = `${STORAGE_KEYS.TASKS}_backup_${timestamp}`;
      
      // Veriyi şifrele (basit base64 encoding)
      const encryptedData = btoa(JSON.stringify(data));
      
      // Backup oluştur
      await AsyncStorage.setItem(backupKey, encryptedData);
      
      // Eski backup'ları temizle (son 5 backup'ı sakla)
      await this.cleanOldBackups();
      
      return { success: true, backupKey };
    } catch (error) {
      console.error('Backup creation failed:', error);
      return { success: false, error: error.message };
    }
  }

  static async cleanOldBackups() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const backupKeys = keys.filter(key => key.startsWith(`${STORAGE_KEYS.TASKS}_backup_`));
      
      if (backupKeys.length > 5) {
        // En eski backup'ları sil
        const sortedKeys = backupKeys.sort();
        const keysToDelete = sortedKeys.slice(0, backupKeys.length - 5);
        
        await AsyncStorage.multiRemove(keysToDelete);
      }
    } catch (error) {
      console.error('Backup cleanup failed:', error);
    }
  }

  static async validateDataIntegrity() {
    try {
      const mainData = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
      const backupData = await AsyncStorage.getItem(`${STORAGE_KEYS.TASKS}_backup`);
      
      if (!mainData && !backupData) {
        return { isValid: true, hasData: false };
      }
      
      // JSON parse test
      let mainValid = false;
      let backupValid = false;
      
      try {
        if (mainData) JSON.parse(mainData);
        mainValid = true;
      } catch (e) {
        console.warn('Main data corrupted');
      }
      
      try {
        if (backupData) JSON.parse(backupData);
        backupValid = true;
      } catch (e) {
        console.warn('Backup data corrupted');
      }
      
      return {
        isValid: mainValid || backupValid,
        mainValid,
        backupValid,
        hasData: !!(mainData || backupData)
      };
    } catch (error) {
      console.error('Data validation failed:', error);
      return { isValid: false, error: error.message };
    }
  }

  static async recoverFromCorruption() {
    try {
      const integrityCheck = await this.validateDataIntegrity();
      
      if (integrityCheck.isValid) {
        return { success: true, message: 'Data is valid, no recovery needed' };
      }
      
      // Try to recover from backup
      const backupData = await AsyncStorage.getItem(`${STORAGE_KEYS.TASKS}_backup`);
      if (backupData) {
        try {
          const parsedBackup = JSON.parse(backupData);
          await AsyncStorage.setItem(STORAGE_KEYS.TASKS, backupData);
          return { 
            success: true, 
            message: 'Data recovered from backup',
            recoveredData: parsedBackup
          };
        } catch (e) {
          console.error('Backup recovery failed:', e);
        }
      }
      
      // If all else fails, clear corrupted data
      await AsyncStorage.removeItem(STORAGE_KEYS.TASKS);
      await AsyncStorage.removeItem(`${STORAGE_KEYS.TASKS}_backup`);
      
      return { 
        success: true, 
        message: 'Corrupted data cleared, starting fresh',
        recoveredData: []
      };
    } catch (error) {
      console.error('Data recovery failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default DataIntegrityManager;



