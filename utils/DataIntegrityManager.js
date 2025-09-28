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
      
      console.log(`📦 Secure backup created: ${backupKey}`);
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
        console.log(`🧹 Cleaned ${keysToDelete.length} old backups`);
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
      let mainTaskCount = 0;
      let backupTaskCount = 0;
      
      try {
        if (mainData) {
          const parsed = JSON.parse(mainData);
          if (Array.isArray(parsed)) {
            mainValid = true;
            mainTaskCount = parsed.length;
          }
        }
      } catch (e) {
        console.warn('Main data corrupted:', e.message);
      }
      
      try {
        if (backupData) {
          const parsed = JSON.parse(backupData);
          if (Array.isArray(parsed)) {
            backupValid = true;
            backupTaskCount = parsed.length;
          }
        }
      } catch (e) {
        console.warn('Backup data corrupted:', e.message);
      }
      
      return {
        isValid: mainValid || backupValid,
        mainValid,
        backupValid,
        hasData: !!(mainData || backupData),
        mainTaskCount,
        backupTaskCount,
        mainData: mainValid ? mainData : null,
        backupData: backupValid ? backupData : null
      };
    } catch (error) {
      console.error('Data validation failed:', error);
      return { isValid: false, error: error.message };
    }
  }

  static async recoverFromCorruption() {
    try {
      const integrityCheck = await this.validateDataIntegrity();
      
      if (integrityCheck.mainValid) {
        console.log('✅ Main data is valid, no recovery needed');
        return { success: true, message: 'Data is valid' };
      }
      
      if (integrityCheck.backupValid) {
        // Backup'tan geri yükle
        await AsyncStorage.setItem(STORAGE_KEYS.TASKS, integrityCheck.backupData);
        console.log('🔄 Recovered from backup');
        return { 
          success: true, 
          message: `Recovered ${integrityCheck.backupTaskCount} tasks from backup`,
          taskCount: integrityCheck.backupTaskCount
        };
      }
      
      // Hiçbir veri geçerli değil
      console.warn('⚠️ No valid data found');
      return { 
        success: false, 
        message: 'No valid data found for recovery' 
      };
    } catch (error) {
      console.error('Recovery failed:', error);
      return { success: false, error: error.message };
    }
  }

  static async getBackupList() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const backupKeys = keys.filter(key => key.startsWith(`${STORAGE_KEYS.TASKS}_backup_`));
      
      const backups = [];
      for (const key of backupKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
              const timestamp = key.split('_').pop();
              backups.push({
                key,
                timestamp: parseInt(timestamp),
                taskCount: parsed.length,
                date: new Date(parseInt(timestamp)).toLocaleString()
              });
            }
          }
        } catch (e) {
          console.warn(`Backup ${key} is corrupted:`, e.message);
        }
      }
      
      return backups.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Backup list failed:', error);
      return [];
    }
  }

  static async restoreFromSpecificBackup(backupKey) {
    try {
      const backupData = await AsyncStorage.getItem(backupKey);
      if (!backupData) {
        return { success: false, message: 'Backup not found' };
      }
      
      const parsed = JSON.parse(backupData);
      if (!Array.isArray(parsed)) {
        return { success: false, message: 'Invalid backup data' };
      }
      
      // Mevcut veriyi yedekle
      const currentData = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
      if (currentData) {
        await AsyncStorage.setItem(`${STORAGE_KEYS.TASKS}_pre_restore`, currentData);
      }
      
      // Backup'tan geri yükle
      await AsyncStorage.setItem(STORAGE_KEYS.TASKS, backupData);
      
      console.log(`🔄 Restored from backup: ${backupKey}`);
      return { 
        success: true, 
        message: `Restored ${parsed.length} tasks from backup`,
        taskCount: parsed.length
      };
    } catch (error) {
      console.error('Specific backup restore failed:', error);
      return { success: false, error: error.message };
    }
  }

  static async performDataMaintenance() {
    try {
      console.log('🔧 Starting data maintenance...');
      
      // 1. Veri bütünlüğünü kontrol et
      const integrityCheck = await this.validateDataIntegrity();
      console.log('📊 Data integrity check:', integrityCheck);
      
      // 2. Eski backup'ları temizle
      await this.cleanOldBackups();
      
      // 3. Geçerli veri varsa backup oluştur
      if (integrityCheck.mainValid && integrityCheck.mainData) {
        const backupResult = await this.createSecureBackup(JSON.parse(integrityCheck.mainData));
        console.log('📦 Maintenance backup:', backupResult);
      }
      
      // 4. Bozuk veri varsa kurtarmaya çalış
      if (!integrityCheck.mainValid && integrityCheck.backupValid) {
        const recoveryResult = await this.recoverFromCorruption();
        console.log('🔄 Recovery result:', recoveryResult);
      }
      
      console.log('✅ Data maintenance completed');
      return { success: true, integrityCheck };
    } catch (error) {
      console.error('Data maintenance failed:', error);
      return { success: false, error: error.message };
    }
  }

  static async getStorageStats() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const taskKeys = keys.filter(key => key.includes(STORAGE_KEYS.TASKS));
      
      let totalSize = 0;
      let validBackups = 0;
      let corruptedBackups = 0;
      
      for (const key of taskKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            totalSize += data.length;
            
            if (key.includes('backup')) {
              try {
                JSON.parse(data);
                validBackups++;
              } catch (e) {
                corruptedBackups++;
              }
            }
          }
        } catch (e) {
          console.warn(`Error reading ${key}:`, e.message);
        }
      }
      
      return {
        totalKeys: taskKeys.length,
        totalSize: totalSize,
        totalSizeKB: Math.round(totalSize / 1024 * 100) / 100,
        validBackups,
        corruptedBackups
      };
    } catch (error) {
      console.error('Storage stats failed:', error);
      return null;
    }
  }
}

export default DataIntegrityManager;

