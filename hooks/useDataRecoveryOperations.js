// hooks/useDataRecoveryOperations.js
import { useCallback } from 'react';
import { useTaskActions } from './useTaskContext';

// Data recovery operations için custom hook
export const useDataRecoveryOperations = () => {
  const { restoreFromBackupManually, createBackup, checkDataStatus } = useTaskActions();

  // Veri kurtarma işlemi
  const handleDataRecovery = useCallback(async () => {
    try {
      // Önce veri durumunu kontrol et
      const dataStatus = await checkDataStatus();
      
      if (!dataStatus.backupExists) {
        return {
          success: false,
          message: "❌ Backup verisi bulunamadı!\n\nVeri kurtarma için önce backup oluşturmanız gerekiyor."
        };
      }
      
      if (dataStatus.backupTaskCount === 0) {
        return {
          success: false,
          message: "❌ Backup verisi boş!\n\nKurtarılacak veri yok."
        };
      }
      
      // Geri yükleme işlemini başlat
      const result = await restoreFromBackupManually();
      
      if (result.success) {
        return {
          success: true,
          message: `✅ Veriler başarıyla geri yüklendi!\n\n${result.message}`,
          taskCount: result.taskCount
        };
      } else {
        return {
          success: false,
          message: `❌ Veri geri yüklenemedi!\n\nHata: ${result.message}`
        };
      }
    } catch (error) {
      console.error('Data recovery error:', error);
      return {
        success: false,
        message: `❌ Veri kurtarma hatası!\n\nHata: ${error.message}`
      };
    }
  }, [checkDataStatus, restoreFromBackupManually]);

  // Manuel backup oluşturma
  const handleCreateBackup = useCallback(async () => {
    try {
      const result = await createBackup();
      
      if (result.success) {
        return {
          success: true,
          message: "✅ Manuel backup oluşturuldu!\n\nVerileriniz güvende."
        };
      } else {
        return {
          success: false,
          message: `❌ Backup oluşturulamadı!\n\nHata: ${result.message}`
        };
      }
    } catch (error) {
      console.error('Create backup error:', error);
      return {
        success: false,
        message: `❌ Backup oluşturma hatası!\n\nHata: ${error.message}`
      };
    }
  }, [createBackup]);

  // Veri durumu kontrolü
  const handleCheckDataStatus = useCallback(async () => {
    try {
      const status = await checkDataStatus();
      
      let message = "📊 Veri Durumu:\n\n";
      message += `Ana Veri: ${status.mainExists ? `${status.mainTaskCount} task` : 'Yok'}\n`;
      message += `Backup: ${status.backupExists ? `${status.backupTaskCount} task` : 'Yok'}\n\n`;
      
      if (status.backupExists && status.backupTaskCount > 0) {
        message += "✅ Veri kurtarma mümkün";
      } else {
        message += "❌ Veri kurtarma mümkün değil";
      }
      
      return {
        success: true,
        message,
        status
      };
    } catch (error) {
      console.error('Check data status error:', error);
      return {
        success: false,
        message: `❌ Veri durumu kontrol hatası!\n\nHata: ${error.message}`
      };
    }
  }, [checkDataStatus]);

  return {
    handleDataRecovery,
    handleCreateBackup,
    handleCheckDataStatus
  };
};
