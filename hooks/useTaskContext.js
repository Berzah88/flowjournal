// hooks/useTaskContext.js
import React, { useContext, useMemo, useCallback } from 'react';
import { TaskContext, TaskActionsContext } from '../context/TaskContext';

// State için custom hook - sadece state değişikliklerinde re-render
export const useTaskState = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskState must be used within a TaskProvider');
  }
  return context;
};

// Actions için custom hook - actions değişmediği sürece re-render yok
export const useTaskActions = () => {
  const context = useContext(TaskActionsContext);
  if (!context) {
    throw new Error('useTaskActions must be used within a TaskProvider');
  }
  return context;
};

// Sadece tasks için custom hook - isLoading değişikliklerinde re-render yok
export const useTasks = () => {
  const { tasks } = useTaskState();
  return useMemo(() => tasks, [tasks]);
};

// Sadece loading state için custom hook - tasks değişikliklerinde re-render yok
export const useTaskLoading = () => {
  const { isLoading } = useTaskState();
  return useMemo(() => isLoading, [isLoading]);
};

// Sadece saving state için custom hook - diğer state değişikliklerinde re-render yok
export const useTaskSaving = () => {
  const { isSaving } = useTaskState();
  return useMemo(() => isSaving, [isSaving]);
};

// Filtrelenmiş tasks için custom hook
export const useFilteredTasks = (filterFn) => {
  const tasks = useTasks();
  return useMemo(() => {
    if (!filterFn) return tasks;
    return tasks.filter(filterFn);
  }, [tasks, filterFn]);
};

// Active tasks için custom hook
export const useActiveTasks = () => {
  return useFilteredTasks(task => !task.done);
};

// Completed tasks için custom hook
export const useCompletedTasks = () => {
  return useFilteredTasks(task => task.done);
};

// Specific task için custom hook
export const useTask = (taskId) => {
  const tasks = useTasks();
  return useMemo(() => {
    return tasks.find(task => task.id === taskId);
  }, [tasks, taskId]);
};

// Task statistics için custom hook
export const useTaskStats = () => {
  const tasks = useTasks();
  return useMemo(() => {
    const activeTasks = tasks.filter(task => !task.done);
    const completedTasks = tasks.filter(task => task.done);
    
    const today = new Date();
    const activeDeadlines = activeTasks.map(task => {
      const diffTime = new Date(task.endDate) - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    });
    
    const daysLeft = activeDeadlines.length > 0 ? Math.max(...activeDeadlines) : 0;
    
    return {
      activeCount: activeTasks.length,
      completedCount: completedTasks.length,
      daysLeft,
      totalCount: tasks.length
    };
  }, [tasks]);
};

// Data recovery için custom hook
export const useDataRecovery = () => {
  const { restoreFromBackupManually, createBackup, checkDataStatus } = useTaskActions();
  
  const recoverData = useCallback(async () => {
    try {
      const result = await restoreFromBackupManually();
      if (result.success) {
        console.log("✅ Veri başarıyla geri yüklendi:", result.message);
        return { success: true, message: result.message, taskCount: result.taskCount };
      } else {
        console.log("❌ Veri geri yüklenemedi:", result.message);
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error("❌ Veri geri yükleme hatası:", error);
      return { success: false, message: "Geri yükleme hatası: " + error.message };
    }
  }, [restoreFromBackupManually]);
  
  const createManualBackup = useCallback(async () => {
    try {
      await createBackup();
      console.log("✅ Manuel backup oluşturuldu");
      return { success: true, message: "Manuel backup oluşturuldu" };
    } catch (error) {
      console.error("❌ Manuel backup oluşturma hatası:", error);
      return { success: false, message: "Backup oluşturma hatası: " + error.message };
    }
  }, [createBackup]);
  
  const getDataStatus = useCallback(async () => {
    try {
      const status = await checkDataStatus();
      console.log("📊 Veri durumu:", status);
      return status;
    } catch (error) {
      console.error("❌ Veri durumu kontrol hatası:", error);
      return {
        mainExists: false,
        backupExists: false,
        mainTaskCount: 0,
        backupTaskCount: 0
      };
    }
  }, [checkDataStatus]);
  
  return {
    recoverData,
    createManualBackup,
    getDataStatus
  };
};
