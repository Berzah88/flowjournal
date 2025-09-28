// context/TaskContext.js
import React, { createContext, useState, useEffect, useRef, useCallback, useMemo, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { assignUniqueColor } from "../utils/milestoneColors";
import { STORAGE_KEYS } from "../constants";
import { useErrorHandler } from "../hooks/useErrorHandler";
import { useContextPerformanceMonitor } from "../hooks/usePerformanceMonitor";

// Context'i bölerek re-render optimizasyonu
export const TaskContext = createContext();
export const TaskActionsContext = createContext();

// Hook to use task actions
export const useTaskActions = () => {
  const context = useContext(TaskActionsContext);
  if (!context) {
    throw new Error('useTaskActions must be used within a TaskProvider');
  }
  return context;
};

// Module-level flag to avoid double init within the same JS runtime
let HAS_INITIALIZED = false;

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef(null);
  const isMountedRef = useRef(true); // to avoid setState on unmounted component
  const justLoadedRef = useRef(false); // skip first save immediately after load
  const saveLockRef = useRef(false); // prevent concurrent saves
  const lastSaveVersionRef = useRef(0); // version control for race condition prevention
  
  // Error handling
  const { handleAsyncStorageError } = useErrorHandler();
  
  // Performance monitoring (sadece development'ta)
  useContextPerformanceMonitor('TaskContext');

  // Cleanup mount flag
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ---------- INITIAL LOAD (guarded by module-level flag) ----------
  useEffect(() => {
    if (HAS_INITIALIZED) {
      // Ensure loading flag is false so UI can proceed
      if (isMountedRef.current) setIsLoading(false);
      return;
    }

    HAS_INITIALIZED = true;

    const loadTasks = async () => {
      try {
        const storedTasks = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);

        if (storedTasks !== null && storedTasks !== '') {
          const parsedTasks = JSON.parse(storedTasks);

          if (Array.isArray(parsedTasks)) {
            if (isMountedRef.current) setTasks(parsedTasks);
          } else {
            if (isMountedRef.current) setTasks([]);
          }
        } else {
          if (isMountedRef.current) setTasks([]);
        }
      } catch (error) {
        handleAsyncStorageError(error, "load");
        if (isMountedRef.current) setTasks([]);
        try {
          await AsyncStorage.removeItem(STORAGE_KEYS.TASKS);
        } catch (clearError) {
          console.error("TaskProvider: Failed to clear corrupted data:", clearError);
        }
      } finally {
        // Mark that we just loaded so the next save effect can skip one save cycle
        justLoadedRef.current = true;
        if (isMountedRef.current) setIsLoading(false);
      }
    };

    loadTasks();
  }, []);

  // ---------- RACE CONDITION SAFE SAVE FUNCTION ----------
  const saveTasks = useCallback(async (tasksToSave, version) => {
    // Lock kontrolü - concurrent save'leri önle
    if (saveLockRef.current) {
      console.log("🔄 Save işlemi devam ediyor, atlanıyor...");
      return;
    }

    // Version kontrolü - eski veri ile save'i önle
    if (version <= lastSaveVersionRef.current) {
      console.log("⏰ Eski veri, save işlemi atlanıyor");
      return;
    }

    // Mount kontrolü
    if (!isMountedRef.current) {
      console.log("🚫 Component unmounted, save işlemi atlanıyor");
      return;
    }

    // Array kontrolü
    if (!Array.isArray(tasksToSave)) {
      console.warn("⚠️ Invalid tasks data, save işlemi atlanıyor");
      return;
    }

    // Timeout ile lock'u otomatik serbest bırak
    const lockTimeout = setTimeout(() => {
      if (saveLockRef.current) {
        console.warn("⚠️ Save lock timeout, force releasing...");
        saveLockRef.current = false;
        setIsSaving(false);
      }
    }, 10000); // 10 saniye timeout

    saveLockRef.current = true;
    setIsSaving(true);

    try {
      // Save işleminden önce backup oluştur
      try {
        const currentTasks = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
        if (currentTasks) {
          await AsyncStorage.setItem(`${STORAGE_KEYS.TASKS}_backup`, currentTasks);
          console.log("📦 Backup oluşturuldu");
        }
      } catch (backupError) {
        console.warn("⚠️ Backup oluşturulamadı:", backupError);
      }
      
      const serialized = JSON.stringify(tasksToSave);
      await AsyncStorage.setItem(STORAGE_KEYS.TASKS, serialized);
      lastSaveVersionRef.current = version;
      console.log("✅ Veri başarıyla kaydedildi, version:", version);
    } catch (error) {
      console.error("❌ Save işlemi başarısız:", error);
      
      // Save başarısız olursa backup'tan geri yükle
      try {
        const backupData = await AsyncStorage.getItem(`${STORAGE_KEYS.TASKS}_backup`);
        if (backupData) {
          await AsyncStorage.setItem(STORAGE_KEYS.TASKS, backupData);
          const parsedTasks = JSON.parse(backupData);
          if (isMountedRef.current) setTasks(parsedTasks);
          console.log("🔄 Backup'tan geri yüklendi");
        }
      } catch (restoreError) {
        console.error("❌ Backup'tan geri yükleme başarısız:", restoreError);
        handleAsyncStorageError(error, "save");
      }
    } finally {
      clearTimeout(lockTimeout);
      saveLockRef.current = false;
      setIsSaving(false);
    }
  }, [handleAsyncStorageError]);

  // ---------- SAVE TASKS (debounced with race condition prevention) ----------
  useEffect(() => {
    if (isLoading) {
      return;
    }

    // If we just loaded from storage, skip the first save triggered by setTasks from load
    if (justLoadedRef.current) {
      justLoadedRef.current = false;
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounced save with version control
    saveTimeoutRef.current = setTimeout(() => {
      const currentVersion = Date.now(); // Version olarak timestamp kullan
      saveTasks(tasks, currentVersion);
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [tasks, isLoading, saveTasks]);

  // ---------- EMERGENCY SAVE ON APP BACKGROUND/FOREGROUND ----------
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Uygulama arka plana geçerken hemen kaydet
        if (tasks.length > 0 && !isLoading) {
          console.log("🚨 Emergency save on app background");
          const currentVersion = Date.now();
          saveTasks(tasks, currentVersion);
        }
      }
    };

    // App state listener ekle
    const { AppState } = require('react-native');
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [tasks, isLoading, saveTasks]);

  // -------- TASK CRUD --------
  const addTask = useCallback((newTask) => {
    setTasks((prev) => [
      ...prev,
      { ...newTask, id: Date.now(), done: false, milestones: [] },
    ]);
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }, []);

  const completeTask = useCallback((id) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, done: true } : task))
    );
  }, []);

  const updateTask = useCallback((id, updates) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...updates } : task))
    );
  }, []);

  // Helper function to check if project end date should be updated
  const shouldUpdateProjectEndDate = useCallback((milestones, currentEndDate) => {
    if (!milestones || milestones.length === 0) return null;
    
    const latestMilestoneDate = milestones.reduce((latest, ms) => {
      const msEndDate = new Date(ms.endDate);
      return msEndDate > latest ? msEndDate : latest;
    }, new Date(0));
    
    const projectEndDate = new Date(currentEndDate);
    return latestMilestoneDate > projectEndDate ? latestMilestoneDate.toISOString() : null;
  }, []);

  // -------- MILESTONE CRUD --------
  const addMilestone = useCallback((taskId, milestone) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        
        const newMilestone = {
          ...milestone,
          id: `milestone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          completed: false,
          journalEntries: [],
          media: [],
          location: null,
        };
        
        // Milestone'a unique renk ata
        assignUniqueColor(newMilestone);
        
        const updatedMilestones = [...(task.milestones || []), newMilestone];
        
        // Check if project end date should be updated
        const newEndDate = shouldUpdateProjectEndDate(updatedMilestones, task.endDate);
        
        return {
          ...task,
          milestones: updatedMilestones,
          ...(newEndDate && { endDate: newEndDate }),
        };
      })
    );
  }, [shouldUpdateProjectEndDate]);

  const updateMilestone = useCallback((taskId, msId, updates) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        
        // Update the milestone
        const updatedMilestones = task.milestones.map((ms) =>
          ms.id === msId ? { ...ms, ...updates } : ms
        );
        
        // Check if project end date should be updated
        const newEndDate = shouldUpdateProjectEndDate(updatedMilestones, task.endDate);
        
        return {
          ...task,
          milestones: updatedMilestones,
          ...(newEndDate && { endDate: newEndDate }),
        };
      })
    );
  }, [shouldUpdateProjectEndDate]);

  const setMilestoneWasEdited = useCallback((taskId, msId) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              milestones: (() => {
                const milestones = task.milestones || [];
                const editedMilestone = milestones.find(ms => ms.id === msId);
                const otherMilestones = milestones.filter(ms => ms.id !== msId);
                
                // Edit edilen milestone'ı en üste taşı ve wasEdited flag'ini set et
                return [
                  { ...editedMilestone, wasEdited: true },
                  ...otherMilestones.map(ms => ({ ...ms, wasEdited: false }))
                ];
              })(),
            }
          : task
      )
    );
  }, []);

  const clearMilestoneWasEdited = useCallback((taskId) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              milestones: task.milestones.map((ms) => ({
                ...ms,
                wasEdited: false
              })),
            }
          : task
      )
    );
  }, []);

  const deleteMilestone = useCallback((taskId, msId) => {
    if (!taskId || !msId) {
      console.warn("DeleteMilestone: Missing taskId or msId");
      return;
    }

    setTasks((prev) => {
      try {
        return prev.map((task) => {
          if (task.id === taskId) {
            const filteredMilestones = task.milestones?.filter((ms) => ms.id !== msId) || [];
            return {
              ...task,
              milestones: filteredMilestones,
            };
          }
          return task;
        });
      } catch (error) {
        console.error("DeleteMilestone error:", error);
        return prev;
      }
    });
  }, []);

  const completeMilestone = useCallback((taskId, msId) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              milestones: task.milestones.map((ms) =>
                ms.id === msId ? { ...ms, completed: true } : ms
              ),
            }
          : task
      )
    );
  }, []);

  const setActiveMilestone = useCallback((taskId, msId) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              milestones: task.milestones.map((ms) =>
                ms.id === msId ? { ...ms, completed: false } : ms
              ),
            }
          : task
      )
    );
  }, []);

  const reorderMilestones = useCallback((taskId, fromIndex, toIndex) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              milestones: (() => {
                const milestones = [...(task.milestones || [])];
                const [movedMilestone] = milestones.splice(fromIndex, 1);
                milestones.splice(toIndex, 0, movedMilestone);
                return milestones;
              })(),
            }
          : task
      )
    );
  }, []);

  // -------- JOURNAL ENTRIES --------
  const addJournalEntry = useCallback((taskId, msId, entry) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              milestones: task.milestones.map((ms) =>
                ms.id === msId
                  ? {
                      ...ms,
                      journalEntries: (() => {
                        const currentEntries = ms.journalEntries || [];
                        const newEntry = {
                          id: Date.now(),
                          ...entry,
                          createdAt: new Date().toISOString(),
                        };

                        // Eğer yeni entry'de mood varsa, aynı günün diğer entry'lerindeki mood'ları temizle
                        if (entry.mood || entry.moodIcon || entry.moodColor) {
                          const today = new Date().toDateString();
                          const updatedEntries = currentEntries.map(existingEntry => {
                            const existingDate = new Date(existingEntry.createdAt).toDateString();
                            if (existingDate === today && (existingEntry.mood || existingEntry.moodIcon || existingEntry.moodColor)) {
                              // Aynı günün mood bilgilerini temizle
                              const { mood, moodIcon, moodColor, ...cleanedEntry } = existingEntry;
                              return cleanedEntry;
                            }
                            return existingEntry;
                          });
                          return [...updatedEntries, newEntry];
                        }

                        return [...currentEntries, newEntry];
                      })(),
                    }
                  : ms
              ),
            }
          : task
      )
    );
  }, []);

  const updateJournalEntry = useCallback((taskId, msId, entryId, updates) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              milestones: task.milestones.map((ms) =>
                ms.id === msId
                  ? {
                      ...ms,
                      journalEntries: (() => {
                        const currentEntries = ms.journalEntries || [];
                        
                        // Eğer güncellenen entry'de mood varsa, aynı günün diğer entry'lerindeki mood'ları temizle
                        if (updates.mood || updates.moodIcon || updates.moodColor) {
                          const updatedEntry = currentEntries.find(entry => entry.id === entryId);
                          if (updatedEntry) {
                            const entryDate = new Date(updatedEntry.createdAt).toDateString();
                            const updatedEntries = currentEntries.map(existingEntry => {
                              const existingDate = new Date(existingEntry.createdAt).toDateString();
                              if (existingDate === entryDate && existingEntry.id !== entryId && (existingEntry.mood || existingEntry.moodIcon || existingEntry.moodColor)) {
                                // Aynı günün diğer entry'lerindeki mood bilgilerini temizle
                                const { mood, moodIcon, moodColor, ...cleanedEntry } = existingEntry;
                                return cleanedEntry;
                              }
                              return existingEntry;
                            });
                            
                            // Güncellenen entry'yi de güncelle
                            return updatedEntries.map((entry) =>
                              entry.id === entryId
                                ? { ...entry, ...updates, updatedAt: new Date().toISOString() }
                                : entry
                            );
                          }
                        }

                        // Normal güncelleme
                        return currentEntries.map((entry) =>
                          entry.id === entryId
                            ? { ...entry, ...updates, updatedAt: new Date().toISOString() }
                            : entry
                        );
                      })(),
                    }
                  : ms
              ),
            }
          : task
      )
    );
  }, []);

  const deleteJournalEntry = useCallback((taskId, msId, entryId) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              milestones: task.milestones.map((ms) =>
                ms.id === msId
                  ? {
                      ...ms,
                      journalEntries: (ms.journalEntries || []).filter(
                        (e) => e.id !== entryId
                      ),
                    }
                  : ms
              ),
            }
          : task
      )
    );
  }, []);

  // -------- MEDIA ENTRIES --------
  const addMedia = useCallback((taskId, msId, mediaItem) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              milestones: task.milestones.map((ms) =>
                ms.id === msId
                  ? {
                      ...ms,
                      media: [...(ms.media || []), { id: Date.now(), ...mediaItem }],
                    }
                  : ms
              ),
            }
          : task
      )
    );
  }, []);

  const updateLocation = useCallback((taskId, msId, location) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              milestones: task.milestones.map((ms) =>
                ms.id === msId ? { ...ms, location } : ms
              ),
            }
          : task
      )
    );
  }, []);

  // Backup system for data safety
  const createBackup = useCallback(async () => {
    try {
      const currentTasks = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
      if (currentTasks) {
        await AsyncStorage.setItem(`${STORAGE_KEYS.TASKS}_backup`, currentTasks);
        console.log("📦 Backup oluşturuldu");
        return {
          success: true,
          message: "Backup başarıyla oluşturuldu"
        };
      } else {
        return {
          success: false,
          message: "Kaydedilecek veri bulunamadı"
        };
      }
    } catch (error) {
      console.warn("⚠️ Backup oluşturulamadı:", error);
      return {
        success: false,
        message: error.message || "Backup oluşturulamadı"
      };
    }
  }, []);

  // Restore from backup if main data is corrupted
  const restoreFromBackup = useCallback(async () => {
    try {
      const backupData = await AsyncStorage.getItem(`${STORAGE_KEYS.TASKS}_backup`);
      if (backupData) {
        await AsyncStorage.setItem(STORAGE_KEYS.TASKS, backupData);
        const parsedTasks = JSON.parse(backupData);
        if (isMountedRef.current) setTasks(parsedTasks);
        console.log("🔄 Backup'tan geri yüklendi");
        return true;
      }
    } catch (error) {
      console.error("❌ Backup'tan geri yükleme başarısız:", error);
    }
    return false;
  }, []);

  // Check data status function
  const checkDataStatus = useCallback(async () => {
    try {
      const mainData = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
      const backupData = await AsyncStorage.getItem(`${STORAGE_KEYS.TASKS}_backup`);
      
      const mainExists = mainData !== null && mainData !== '';
      const backupExists = backupData !== null && backupData !== '';
      
      let mainTaskCount = 0;
      let backupTaskCount = 0;
      
      if (mainExists) {
        try {
          const parsedMain = JSON.parse(mainData);
          mainTaskCount = Array.isArray(parsedMain) ? parsedMain.length : 0;
        } catch (e) {
          console.log("⚠️ Main data corrupted");
        }
      }
      
      if (backupExists) {
        try {
          const parsedBackup = JSON.parse(backupData);
          backupTaskCount = Array.isArray(parsedBackup) ? parsedBackup.length : 0;
        } catch (e) {
          console.log("⚠️ Backup data corrupted");
        }
      }
      
      return {
        mainExists,
        backupExists,
        mainTaskCount,
        backupTaskCount,
        mainData: mainExists ? mainData : null,
        backupData: backupExists ? backupData : null
      };
    } catch (error) {
      console.error("❌ Data status check failed:", error);
      return {
        mainExists: false,
        backupExists: false,
        mainTaskCount: 0,
        backupTaskCount: 0,
        mainData: null,
        backupData: null
      };
    }
  }, []);

  // Manual restore from backup function
  const restoreFromBackupManually = useCallback(async () => {
    try {
      const dataStatus = await checkDataStatus();
      
      if (!dataStatus.backupExists) {
        console.log("⚠️ Backup verisi bulunamadı");
        return { success: false, message: "Backup verisi bulunamadı" };
      }
      
      if (dataStatus.backupTaskCount === 0) {
        console.log("⚠️ Backup verisi boş");
        return { success: false, message: "Backup verisi boş" };
      }
      
      // Backup'tan geri yükle
      const parsedTasks = JSON.parse(dataStatus.backupData);
      if (isMountedRef.current) {
        setTasks(parsedTasks);
        console.log("🔄 Manuel backup'tan geri yüklendi:", parsedTasks.length, "task");
      }
      
      return { 
        success: true, 
        message: `${parsedTasks.length} task geri yüklendi`,
        taskCount: parsedTasks.length
      };
    } catch (error) {
      console.error("❌ Manuel backup'tan geri yükleme başarısız:", error);
      return { success: false, message: "Geri yükleme hatası: " + error.message };
    }
  }, [checkDataStatus]);

  // Clear storage function for debugging
  const clearStorage = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.TASKS);
      await AsyncStorage.removeItem(`${STORAGE_KEYS.TASKS}_backup`);
      if (isMountedRef.current) setTasks([]);
    } catch (error) {
      handleAsyncStorageError(error, "clear");
    }
  }, [handleAsyncStorageError]);

  // ---------- MEMOIZED CONTEXTS ----------
  // State context - sadece state değiştiğinde re-render
  const stateContextValue = useMemo(() => ({
    tasks,
    isLoading,
    isSaving,
  }), [tasks, isLoading, isSaving]);

  // Actions context - actions değişmediği sürece re-render yok
  const actionsContextValue = useMemo(() => ({
    addTask,
    deleteTask,
    completeTask,
    updateTask,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    completeMilestone,
    setActiveMilestone,
    reorderMilestones,
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    addMedia,
    updateLocation,
    setMilestoneWasEdited,
    clearMilestoneWasEdited,
    createBackup,
    restoreFromBackup,
    restoreFromBackupManually,
    checkDataStatus,
    clearStorage,
  }), [
    addTask,
    deleteTask,
    completeTask,
    updateTask,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    completeMilestone,
    setActiveMilestone,
    reorderMilestones,
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    addMedia,
    updateLocation,
    setMilestoneWasEdited,
    clearMilestoneWasEdited,
    createBackup,
    restoreFromBackup,
    restoreFromBackupManually,
    checkDataStatus,
    clearStorage,
    shouldUpdateProjectEndDate, // Dependency eklendi
  ]);

  // Final render with split contexts
  return (
    <TaskContext.Provider value={stateContextValue}>
      <TaskActionsContext.Provider value={actionsContextValue}>
        {children}
      </TaskActionsContext.Provider>
    </TaskContext.Provider>
  );
};
