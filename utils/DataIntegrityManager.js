// utils/DataIntegrityManager.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';
import logger from './logger';

class DataIntegrityManager {
  static async createSecureBackup(data) {
    try {
      const timestamp = Date.now();
      const backupKey = `${STORAGE_KEYS.TASKS}_backup_${timestamp}`;
      // Store as plain JSON (btoa may not exist in all RN runtimes)
      const serialized = JSON.stringify(data);
      await AsyncStorage.setItem(backupKey, serialized);
      // Also write a compatibility backup without timestamp which TaskContext expects
      await AsyncStorage.setItem(`${STORAGE_KEYS.TASKS}_backup`, serialized);
      
      // Eski backup'ları temizle (son 5 backup'ı sakla)
      await this.cleanOldBackups();
      
      return { success: true, backupKey };
    } catch (error) {
  logger.error('Backup creation failed:', error);
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
  logger.error('Backup cleanup failed:', error);
    }
  }

  static async validateDataIntegrity() {
    try {
      const mainData = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
      // Try compatibility backup first, then look for latest timestamped backup
      let backupData = await AsyncStorage.getItem(`${STORAGE_KEYS.TASKS}_backup`);
      if (!backupData) {
        const keys = await AsyncStorage.getAllKeys();
        const backupKeys = keys.filter(k => k.startsWith(`${STORAGE_KEYS.TASKS}_backup_`));
        if (backupKeys.length > 0) {
          const latest = backupKeys.sort().reverse()[0];
          backupData = await AsyncStorage.getItem(latest);
        }
      }
      
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
        logger.warn('Main data corrupted');
      }
      
        try {
          if (backupData) JSON.parse(backupData);
          backupValid = true;
        } catch (e) {
        // Maybe backup was created with old base64 encoding (btoa). Try to detect and decode.
          try {
            if (backupData) {
              // atob may not exist in RN, provide fallback
              const atob = (str) => Buffer.from(str, 'base64').toString('utf8');
              const decoded = atob(backupData);
              JSON.parse(decoded);
              backupValid = true;
            }
          } catch (e2) {
          logger.warn('Backup data corrupted or unknown encoding');
        }
      }
      
      return {
        isValid: mainValid || backupValid,
        mainValid,
        backupValid,
        hasData: !!(mainData || backupData)
      };
    } catch (error) {
  logger.error('Data validation failed:', error);
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
      // Try compatibility backup first, then the latest timestamped backup
      let backupData = await AsyncStorage.getItem(`${STORAGE_KEYS.TASKS}_backup`);
      if (!backupData) {
        const keys = await AsyncStorage.getAllKeys();
        const backupKeys = keys.filter(k => k.startsWith(`${STORAGE_KEYS.TASKS}_backup_`));
        if (backupKeys.length > 0) {
          const latest = backupKeys.sort().reverse()[0];
          backupData = await AsyncStorage.getItem(latest);
        }
      }
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
          logger.error('Backup recovery failed:', e);
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
  logger.error('Data recovery failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default DataIntegrityManager;



