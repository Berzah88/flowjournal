// context/TaskContext.js
import React, { createContext, useState, useEffect, useRef, useCallback, useMemo, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { assignUniqueColor } from "../utils/milestoneColors";
import { STORAGE_KEYS } from "../constants";
import { useErrorHandler } from "../hooks/useErrorHandler";
import { useContextPerformanceMonitor } from "../hooks/usePerformanceMonitor";
// Yeni bildirim servisi
import DataIntegrityManager from "../utils/DataIntegrityManager";

// Re-render optimization by splitting context
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
  const hasInitializedRef = useRef(false); // Component-level initialization flag
  
  // Error handling
  const { handleAsyncStorageError } = useErrorHandler();
  
  // Performance monitoring (sadece development'ta) - minimal
  if (__DEV__) {
    useContextPerformanceMonitor('TaskContext');
  }

  // Cleanup mount flag
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ---------- INITIAL LOAD (guarded by component-level flag) ----------
  useEffect(() => {
    if (hasInitializedRef.current) {
      // Ensure loading flag is false so UI can proceed
      if (isMountedRef.current) setIsLoading(false);
      return;
    }

    hasInitializedRef.current = true;

    const loadTasks = async () => {
      try {
        // First, validate data integrity
        const integrityCheck = await DataIntegrityManager.validateDataIntegrity();
        
        if (!integrityCheck.isValid) {
          console.warn('⚠️ Data integrity issue detected, attempting recovery...');
          const recoveryResult = await DataIntegrityManager.recoverFromCorruption();
          
          if (recoveryResult.success && recoveryResult.recoveredData) {
            if (isMountedRef.current) setTasks(recoveryResult.recoveredData);
          } else {
            if (isMountedRef.current) setTasks([]);
          }
        } else {
          // Normal data loading
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
        }
      } catch (error) {
        console.error('❌ Critical error during data loading:', error);
        handleAsyncStorageError(error, "load");
        
        // Attempt emergency recovery
        try {
          const recoveryResult = await DataIntegrityManager.recoverFromCorruption();
          if (recoveryResult.success && recoveryResult.recoveredData) {
            if (isMountedRef.current) setTasks(recoveryResult.recoveredData);
          } else {
            if (isMountedRef.current) setTasks([]);
          }
        } catch (recoveryError) {
          console.error('❌ Emergency recovery failed:', recoveryError);
          if (isMountedRef.current) setTasks([]);
        }
      } finally {
        // Mark that we just loaded so the next save effect can skip one save cycle
        justLoadedRef.current = true;
        if (isMountedRef.current) setIsLoading(false);
        
      }
    };

    loadTasks();
  }, []);

  // ---------- NOTIFICATION SYSTEM INITIALIZATION ----------
  useEffect(() => {
    const initializeNotifications = async () => {
      if (isLoading) return;
      
      try {
        console.log('🔔 Notification sistemi başlatılıyor...');
        
        // Bildirim sistemi kaldırıldı - sadece test butonu ile kullanılacak
        console.log('✅ Notification sistemi kaldırıldı');
      } catch (error) {
        console.error('❌ Notification sistemi başlatma hatası:', error);
      }
    };

    initializeNotifications();
  }, [isLoading]); // tasks dependency'sini kaldırdık

  // ---------- PROJECT NOTIFICATIONS SCHEDULING ----------
  // Basit bildirim sistemi - proje bildirimleri devre dışı
  useEffect(() => {
    console.log('📋 Proje bildirimleri devre dışı - basit sistem aktif');
  }, [isLoading, tasks]);

  // ---------- RACE CONDITION SAFE SAVE FUNCTION ----------
  const saveTasks = useCallback(async (tasksToSave, version) => {
    // Lock control - prevent concurrent saves
    if (saveLockRef.current) {
      return;
    }

    // Version control - prevent save with old data
    if (version <= lastSaveVersionRef.current) {
      return;
    }

    // Mount control
    if (!isMountedRef.current) {
      return;
    }

    // Array control
    if (!Array.isArray(tasksToSave)) {
      console.warn("⚠️ Invalid tasks data, skipping save operation");
      return;
    }

    // Automatically release lock with timeout
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
      // Create backup before save operation
      try {
        const currentTasks = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
        if (currentTasks) {
          await AsyncStorage.setItem(`${STORAGE_KEYS.TASKS}_backup`, currentTasks);
        }
      } catch (backupError) {
        console.warn("⚠️ Could not create backup:", backupError);
      }
      
      const serialized = JSON.stringify(tasksToSave);
      await AsyncStorage.setItem(STORAGE_KEYS.TASKS, serialized);
      lastSaveVersionRef.current = version;
    } catch (error) {
      console.error("❌ Save operation failed:", error);
      
      // If save fails, restore from backup
      try {
        const backupData = await AsyncStorage.getItem(`${STORAGE_KEYS.TASKS}_backup`);
        if (backupData) {
          await AsyncStorage.setItem(STORAGE_KEYS.TASKS, backupData);
          const parsedTasks = JSON.parse(backupData);
          if (isMountedRef.current) setTasks(parsedTasks);
          console.log("🔄 Restored from backup");
        }
      } catch (restoreError) {
        console.error("❌ Failed to restore from backup:", restoreError);
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
        // Save immediately when app goes to background
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
    const taskWithId = { ...newTask, id: Date.now(), done: false, milestones: [] };
    setTasks((prev) => [...prev, taskWithId]);
    
    // Bildirim planlama scheduleAllNotifications tarafından yapılacak
    // scheduleProjectNotifications(taskWithId); // Çifte bildirim sorunu - kaldırıldı
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
    
    // Proje silindiğinde bildirimleri iptal et
    cancelProjectNotifications(id);
  }, [cancelProjectNotifications]);

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
        
        // Milestone eklendiğinde bildirim planla
        scheduleMilestoneNotifications(newMilestone, task.title);
        
        return {
          ...task,
          milestones: updatedMilestones,
          ...(newEndDate && { endDate: newEndDate }),
        };
      })
    );
  }, [shouldUpdateProjectEndDate, scheduleMilestoneNotifications]);

  const updateMilestone = useCallback((taskId, msId, updates) => {
    console.log('TaskContext: updateMilestone called', { taskId, msId, updates });
    
    setTasks((prev) => {
      console.log('TaskContext: Current tasks before update', prev.length);
      
      const updatedTasks = prev.map((task) => {
        if (task.id !== taskId) return task;
        
        console.log('TaskContext: Found task to update', { taskId, milestonesCount: task.milestones?.length });
        
        // Find the milestone being updated to check if it's a child
        const milestoneBeingUpdated = task.milestones.find(ms => ms.id === msId);
        const parentId = milestoneBeingUpdated?.parentId;
        
        // Update the milestone
        const updatedMilestones = task.milestones.map((ms) => {
          if (ms.id === msId) {
            console.log('TaskContext: Updating milestone', { 
              oldMilestone: { id: ms.id, title: ms.title, startDate: ms.startDate, endDate: ms.endDate },
              newMilestone: { id: msId, title: updates.title, startDate: updates.startDate, endDate: updates.endDate }
            });
            return { ...ms, ...updates };
          }
          return ms;
        });
        
        // Auto-adjust parent's end date if this is a child and its date changed
        const extendedMilestones = updatedMilestones.map((ms) => {
          if (ms.id === parentId && parentId !== null) {
            // Find all ACTIVE children of this parent (exclude completed)
            const activeChildren = updatedMilestones.filter(
              m => m.parentId === ms.id && !m.completed
            );
            
            if (activeChildren.length > 0) {
              // Find the latest end date among ACTIVE children
              const latestChildEndDate = activeChildren.reduce((latest, child) => {
                const childEndDate = new Date(child.endDate);
                return childEndDate > latest ? childEndDate : latest;
              }, new Date(ms.endDate));
              
              const currentParentEndDate = new Date(ms.endDate);
              
              // Adjust parent's end date to match latest active child
              if (latestChildEndDate.getTime() !== currentParentEndDate.getTime()) {
                console.log(`📅 Auto-adjusting parent "${ms.title}" end date to ${latestChildEndDate.toISOString()}`);
                return { ...ms, endDate: latestChildEndDate.toISOString() };
              }
            }
          }
          return ms;
        });
        
        // Check if project end date should be updated
        const newEndDate = shouldUpdateProjectEndDate(extendedMilestones, task.endDate);
        
        const updatedTask = {
          ...task,
          milestones: extendedMilestones,
          ...(newEndDate && { endDate: newEndDate }),
        };
        
        console.log('TaskContext: Task updated', { 
          taskId, 
          milestonesCount: updatedTask.milestones.length,
          milestones: updatedTask.milestones.map(m => ({ id: m.id, title: m.title }))
        });
        
        return updatedTask;
      });
      
      console.log('TaskContext: All tasks updated', updatedTasks.length);
      return updatedTasks;
    });
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

    // Milestone silindiğinde bildirimleri iptal et
    cancelMilestoneNotifications(msId);

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
  }, [cancelMilestoneNotifications]);

  const completeMilestone = useCallback((taskId, msId) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        
        // Find the milestone being completed
        const milestoneBeingCompleted = task.milestones.find(ms => ms.id === msId);
        const parentId = milestoneBeingCompleted?.parentId;
        const isParent = task.milestones.some(m => m.parentId === msId);
        
        // If completing a parent, complete all its children too
        let updatedMilestones;
        if (isParent) {
          console.log(`✅ Completing parent "${milestoneBeingCompleted?.title}" and all its children`);
          updatedMilestones = task.milestones.map((ms) => {
            // Complete the parent
            if (ms.id === msId) return { ...ms, completed: true };
            // Complete all children of this parent
            if (ms.parentId === msId) return { ...ms, completed: true };
            return ms;
          });
        } else {
          // Normal completion (child or standalone)
          updatedMilestones = task.milestones.map((ms) =>
            ms.id === msId ? { ...ms, completed: true } : ms
          );
        }
        
        // If this was a child, adjust parent's end date based on remaining active children
        const milestonesAfterDateAdjustment = updatedMilestones.map((ms) => {
          if (ms.id === parentId && parentId !== null) {
            // Find remaining ACTIVE children of this parent (exclude completed)
            const activeChildren = updatedMilestones.filter(
              m => m.parentId === ms.id && !m.completed
            );
            
            if (activeChildren.length > 0) {
              // Find the latest end date among remaining ACTIVE children
              const latestChildEndDate = activeChildren.reduce((latest, child) => {
                const childEndDate = new Date(child.endDate);
                return childEndDate > latest ? childEndDate : latest;
              }, new Date(0));
              
              const currentParentEndDate = new Date(ms.endDate);
              
              // Adjust parent's end date to match latest active child
              if (latestChildEndDate.getTime() > 0 && latestChildEndDate.getTime() !== currentParentEndDate.getTime()) {
                console.log(`📅 Adjusting parent "${ms.title}" end date to ${latestChildEndDate.toISOString()} after child completion`);
                return { ...ms, endDate: latestChildEndDate.toISOString() };
              }
            }
          }
          return ms;
        });
        
        // NO auto-complete for parent - parent is independent from children
        // Children don't affect parent's completion status
        
        return {
          ...task,
          milestones: milestonesAfterDateAdjustment,
        };
      })
    );
  }, []);

  const setActiveMilestone = useCallback((taskId, msId) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        
        // Find the milestone being reopened to check if it's a child
        const milestoneBeingReopened = task.milestones.find(ms => ms.id === msId);
        const parentId = milestoneBeingReopened?.parentId;
        const isParent = task.milestones.some(m => m.parentId === msId);
        
        // SAFETY CHECK: If this is a child milestone, check if parent is completed
        if (parentId) {
          const parent = task.milestones.find(ms => ms.id === parentId);
          if (parent?.completed) {
            console.warn(`⚠️ Cannot reopen child "${milestoneBeingReopened?.title}" because parent "${parent.title}" is completed. Reopen parent first.`);
            return task; // Don't make any changes
          }
        }
        
        // If reopening a parent, reopen all its children too
        let updatedMilestones;
        if (isParent) {
          console.log(`🔄 Reopening parent "${milestoneBeingReopened?.title}" and all its children`);
          
          updatedMilestones = task.milestones.map((ms) => {
            // Reopen the parent
            if (ms.id === msId) return { ...ms, completed: false };
            // Reopen all children of this parent
            if (ms.parentId === msId) return { ...ms, completed: false };
            return ms;
          });
        } else {
          // Normal reopen (child or standalone)
          updatedMilestones = task.milestones.map((ms) =>
            ms.id === msId ? { ...ms, completed: false } : ms
          );
        }
        
        // If this was a child, adjust parent's end date based on active children
        const milestonesAfterDateAdjustment = updatedMilestones.map((ms) => {
          if (ms.id === parentId && parentId !== null) {
            // Find all ACTIVE children of this parent (exclude completed)
            const activeChildren = updatedMilestones.filter(
              m => m.parentId === ms.id && !m.completed
            );
            
            if (activeChildren.length > 0) {
              // Find the latest end date among ACTIVE children
              const latestChildEndDate = activeChildren.reduce((latest, child) => {
                const childEndDate = new Date(child.endDate);
                return childEndDate > latest ? childEndDate : latest;
              }, new Date(0));
              
              const currentParentEndDate = new Date(ms.endDate);
              
              // Adjust parent's end date to match latest active child
              if (latestChildEndDate.getTime() > 0 && latestChildEndDate.getTime() !== currentParentEndDate.getTime()) {
                console.log(`📅 Adjusting parent "${ms.title}" end date to ${latestChildEndDate.toISOString()} after child reopen`);
                return { ...ms, endDate: latestChildEndDate.toISOString() };
              }
            }
          }
          return ms;
        });
        
        return {
          ...task,
          milestones: milestonesAfterDateAdjustment,
        };
      })
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

  // -------- MILESTONE ATTACH/DETACH --------
  const attachMilestone = useCallback((taskId, milestoneId, parentMilestoneId) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        
        // Update child's parentId
        const updatedMilestones = task.milestones.map((ms) =>
          ms.id === milestoneId
            ? { ...ms, parentId: parentMilestoneId }
            : ms
        );
        
        // Auto-adjust parent's end date based on ACTIVE children only
        const extendedMilestones = updatedMilestones.map((ms) => {
          if (ms.id === parentMilestoneId && parentMilestoneId !== null) {
            // Find all ACTIVE children of this parent (exclude completed)
            const activeChildren = updatedMilestones.filter(
              m => m.parentId === ms.id && !m.completed
            );
            
            if (activeChildren.length > 0) {
              // Find the latest end date among ACTIVE children
              const latestChildEndDate = activeChildren.reduce((latest, child) => {
                const childEndDate = new Date(child.endDate);
                return childEndDate > latest ? childEndDate : latest;
              }, new Date(ms.endDate));
              
              const currentParentEndDate = new Date(ms.endDate);
              
              // Adjust parent's end date to match latest active child
              if (latestChildEndDate.getTime() !== currentParentEndDate.getTime()) {
                console.log(`📅 Adjusting parent "${ms.title}" end date from ${ms.endDate} to ${latestChildEndDate.toISOString()}`);
                return { ...ms, endDate: latestChildEndDate.toISOString() };
              }
            }
          }
          return ms;
        });
        
        return {
          ...task,
          milestones: extendedMilestones,
        };
      })
    );
  }, []);

  const detachMilestone = useCallback((taskId, milestoneId) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        
        // Find the parent before detaching
        const childMilestone = task.milestones.find(ms => ms.id === milestoneId);
        const oldParentId = childMilestone?.parentId;
        
        // Detach child
        const updatedMilestones = task.milestones.map((ms) =>
          ms.id === milestoneId
            ? { ...ms, parentId: null }
            : ms
        );
        
        // Recalculate parent's end date based on remaining ACTIVE children only
        const recalculatedMilestones = updatedMilestones.map((ms) => {
          if (ms.id === oldParentId && oldParentId !== null) {
            // Find remaining ACTIVE children of this parent (exclude completed)
            const remainingActiveChildren = updatedMilestones.filter(
              m => m.parentId === ms.id && !m.completed
            );
            
            if (remainingActiveChildren.length > 0) {
              // Find the latest end date among remaining ACTIVE children
              const latestChildEndDate = remainingActiveChildren.reduce((latest, child) => {
                const childEndDate = new Date(child.endDate);
                return childEndDate > latest ? childEndDate : latest;
              }, new Date(0));
              
              const currentParentEndDate = new Date(ms.endDate);
              
              // Update parent's end date to match latest active child
              if (latestChildEndDate.getTime() !== currentParentEndDate.getTime()) {
                console.log(`📅 Adjusting parent "${ms.title}" end date from ${ms.endDate} to ${latestChildEndDate.toISOString()}`);
                return { ...ms, endDate: latestChildEndDate.toISOString() };
              }
            } else {
              // No more active children - parent keeps its own date
              console.log(`📅 Parent "${ms.title}" has no more active children after detach`);
            }
          }
          return ms;
        });
        
        return {
          ...task,
          milestones: recalculatedMilestones,
        };
      })
    );
  }, []);

  // -------- JOURNAL ENTRIES --------
  
  // NEW: Project-based journal entries
  const addProjectJournalEntry = useCallback((taskId, entry) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              journalEntries: (() => {
                const currentEntries = task.journalEntries || [];
                const newEntry = {
                  id: Date.now(),
                  ...entry,
                  createdAt: new Date().toISOString(),
                  relatedMilestones: entry.relatedMilestones || [],
                  isGeneral: entry.isGeneral || false,
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
          : task
      )
    );
  }, []);

  const updateProjectJournalEntry = useCallback((taskId, entryId, updates) => {
    console.log('🔄 updateProjectJournalEntry called:', { taskId, entryId, updates });
    
    setTasks((prev) => {
      const updatedTasks = prev.map((task) => {
        if (task.id === taskId) {
          const updatedEntries = task.journalEntries?.map((entry) => {
            if (entry.id === entryId) {
              const updatedEntry = { ...entry, ...updates };
              console.log('✅ Journal entry updated:', { 
                oldEntry: entry, 
                newEntry: updatedEntry 
              });
              return updatedEntry;
            }
            return entry;
          }) || [];
          
          const updatedTask = {
            ...task,
            journalEntries: updatedEntries,
          };
          
          console.log('✅ Task updated with new journal entries:', {
            taskId: task.id,
            taskTitle: task.title,
            entriesCount: updatedEntries.length,
            updatedEntry: updatedEntries.find(e => e.id === entryId)
          });
          
          return updatedTask;
        }
        return task;
      });
      
      return updatedTasks;
    });
  }, []);

  const deleteProjectJournalEntry = useCallback((taskId, entryId) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              journalEntries: task.journalEntries?.filter((entry) => entry.id !== entryId) || [],
            }
          : task
      )
    );
  }, []);

  // LEGACY: Milestone-based journal entries (for backward compatibility)
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



  // ==================== NOTIFICATION FUNCTIONS ====================
  // Eski bildirim fonksiyonları kaldırıldı - yeni sistem kurulacak

  // Tüm bildirimleri planla
  const scheduleAllNotifications = useCallback(async () => {
    try {
      console.log('🔔 Bildirim sistemi yeniden kuruluyor...');
      
      // Notification servisini başlat (eğer başlatılmamışsa)
      // Notification service kaldırıldı
      console.log('✅ Notification service kaldırıldı');
      
      console.log('✅ Tüm bildirimler başarıyla planlandı');
    } catch (error) {
      console.error('❌ Bildirim planlama hatası:', error);
    }
  }, [tasks]);

  // Proje eklendiğinde bildirim planla
  const scheduleProjectNotifications = useCallback(async (project) => {
    try {
      console.log('🎯 Proje bildirimleri planlanıyor:', project.title);
      
      // Notification servisini başlat (eğer başlatılmamışsa)
      // Notification service kaldırıldı
      
      // Proje bitiş tarihi bildirimi planla
      if (project.endDate) {
        // Notification service kaldırıldı
      }
      
      console.log('✅ Proje bildirimleri planlandı:', project.title);
    } catch (error) {
      console.error('❌ Proje bildirim planlama hatası:', error);
    }
  }, []);

  // Milestone eklendiğinde bildirim planla
  const scheduleMilestoneNotifications = useCallback(async (milestone, projectTitle) => {
    try {
      console.log('🚀 Milestone bildirimleri planlanıyor:', milestone.title);
      
      // Notification servisini başlat (eğer başlatılmamışsa)
      // Notification service kaldırıldı
      
      // Milestone son günü bildirimi planla
      if (milestone.endDate) {
        // Notification service kaldırıldı
      }
      
      console.log('✅ Milestone bildirimleri planlandı:', milestone.title);
    } catch (error) {
      console.error('❌ Milestone bildirim planlama hatası:', error);
    }
  }, []);

  // Proje silindiğinde bildirimleri iptal et
  const cancelProjectNotifications = useCallback(async (projectId) => {
    try {
      console.log('🗑️ Proje bildirimleri iptal ediliyor:', projectId);
      // await notificationService.cancelProjectNotification(projectId);
      console.log('✅ Proje bildirimleri iptal edildi:', projectId);
    } catch (error) {
      console.error('❌ Proje bildirim iptal hatası:', error);
    }
  }, []);

  // Milestone silindiğinde bildirimleri iptal et
  const cancelMilestoneNotifications = useCallback(async (milestoneId) => {
    try {
      console.log('🗑️ Milestone bildirimleri iptal ediliyor:', milestoneId);
      // await notificationService.cancelMilestoneNotification(milestoneId);
      console.log('✅ Milestone bildirimleri iptal edildi:', milestoneId);
    } catch (error) {
      console.error('❌ Milestone bildirim iptal hatası:', error);
    }
  }, []);

  // Progress feedback bildirimlerini planla
  const scheduleProgressFeedbackNotifications = useCallback(async () => {
    try {
      console.log('Progress feedback - yeni sistem kurulacak');
      // Yeni sistem kurulacak
    } catch (error) {
      console.error('Progress feedback planlama hatası:', error);
    }
  }, [tasks]);

  // Progress feedback bildirimini iptal et
  const cancelProgressFeedbackNotifications = useCallback(async (projectId) => {
    try {
      console.log('Progress feedback iptal - yeni sistem kurulacak');
      // Yeni sistem kurulacak
    } catch (error) {
      console.error('Progress feedback iptal hatası:', error);
    }
  }, []);

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
    attachMilestone,
    detachMilestone,
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    addProjectJournalEntry,
    updateProjectJournalEntry,
    deleteProjectJournalEntry,
    addMedia,
    updateLocation,
    setMilestoneWasEdited,
    clearMilestoneWasEdited,
    createBackup,
    restoreFromBackup,
    restoreFromBackupManually,
    checkDataStatus,
    clearStorage,
    // Migration functions
    // Notification functions
    scheduleAllNotifications,
    scheduleProjectNotifications,
    scheduleMilestoneNotifications,
    cancelProjectNotifications,
    cancelMilestoneNotifications,
    scheduleProgressFeedbackNotifications,
    cancelProgressFeedbackNotifications,
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
    attachMilestone,
    detachMilestone,
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    addProjectJournalEntry,
    updateProjectJournalEntry,
    deleteProjectJournalEntry,
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
    // Migration dependencies
    // Notification dependencies
    scheduleAllNotifications,
    scheduleProjectNotifications,
    scheduleMilestoneNotifications,
    cancelProjectNotifications,
    cancelMilestoneNotifications,
    scheduleProgressFeedbackNotifications,
    cancelProgressFeedbackNotifications,
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
