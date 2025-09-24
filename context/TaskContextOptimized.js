// context/TaskContextOptimized.js
import React, { createContext, useCallback, useMemo } from "react";
import { assignUniqueColor } from "../utils/milestoneColors";
import { useAsyncStorage } from "../hooks/useAsyncStorage";
import { useErrorHandler } from "../hooks/useErrorHandler";
import { useContextPerformanceMonitor } from "../hooks/usePerformanceMonitor";
import { STORAGE_KEYS } from "../constants";

// Context'i bölerek re-render optimizasyonu
export const TaskContext = createContext();
export const TaskActionsContext = createContext();

export const TaskProvider = ({ children }) => {
  // Use custom AsyncStorage hook for better error handling and performance
  const { 
    data: tasks, 
    loading: isLoading, 
    error: storageError, 
    saveData: saveTasksToStorage,
    clearData: clearStorageData 
  } = useAsyncStorage(STORAGE_KEYS.TASKS, []);
  
  // Error handling
  const { handleAsyncStorageError } = useErrorHandler();
  
  // Performance monitoring (sadece development'ta)
  useContextPerformanceMonitor('TaskContext');

  // -------- TASK CRUD --------
  const addTask = useCallback((newTask) => {
    const task = {
      ...newTask,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      milestones: [],
    };
    
    const updatedTasks = [...tasks, task];
    saveTasksToStorage(updatedTasks);
    return task;
  }, [tasks, saveTasksToStorage]);

  const deleteTask = useCallback((taskId) => {
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    saveTasksToStorage(updatedTasks);
  }, [tasks, saveTasksToStorage]);

  const completeTask = useCallback((taskId) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, done: !task.done } : task
    );
    saveTasksToStorage(updatedTasks);
  }, [tasks, saveTasksToStorage]);

  const updateTask = useCallback((taskId, updates) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, ...updates } : task
    );
    saveTasksToStorage(updatedTasks);
  }, [tasks, saveTasksToStorage]);

  // -------- MILESTONE CRUD --------
  const addMilestone = useCallback((taskId, milestone) => {
    const newMilestone = {
      ...milestone,
      id: Date.now(),
      completed: false,
      color: assignUniqueColor(),
    };

    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? { ...task, milestones: [...(task.milestones || []), newMilestone] }
        : task
    );
    
    saveTasksToStorage(updatedTasks);
    return newMilestone;
  }, [tasks, saveTasksToStorage]);

  const updateMilestone = useCallback((taskId, milestoneId, updates) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? {
            ...task,
            milestones: task.milestones.map(ms =>
              ms.id === milestoneId ? { ...ms, ...updates } : ms
            ),
          }
        : task
    );
    saveTasksToStorage(updatedTasks);
  }, [tasks, saveTasksToStorage]);

  const deleteMilestone = useCallback((taskId, milestoneId) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? {
            ...task,
            milestones: task.milestones.filter(ms => ms.id !== milestoneId),
          }
        : task
    );
    saveTasksToStorage(updatedTasks);
  }, [tasks, saveTasksToStorage]);

  const completeMilestone = useCallback((taskId, milestoneId) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? {
            ...task,
            milestones: task.milestones.map(ms =>
              ms.id === milestoneId ? { ...ms, completed: !ms.completed } : ms
            ),
          }
        : task
    );
    saveTasksToStorage(updatedTasks);
  }, [tasks, saveTasksToStorage]);

  const setActiveMilestone = useCallback((taskId, milestoneId) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? {
            ...task,
            milestones: task.milestones.map(ms =>
              ms.id === milestoneId ? { ...ms, completed: false } : ms
            ),
          }
        : task
    );
    saveTasksToStorage(updatedTasks);
  }, [tasks, saveTasksToStorage]);

  const reorderMilestones = useCallback((taskId, fromIndex, toIndex) => {
    const updatedTasks = tasks.map(task => {
      if (task.id === taskId) {
        const milestones = [...(task.milestones || [])];
        const [movedMilestone] = milestones.splice(fromIndex, 1);
        milestones.splice(toIndex, 0, movedMilestone);
        return { ...task, milestones };
      }
      return task;
    });
    saveTasksToStorage(updatedTasks);
  }, [tasks, saveTasksToStorage]);

  // -------- JOURNAL CRUD --------
  const addJournalEntry = useCallback((taskId, milestoneId, entry) => {
    const newEntry = {
      ...entry,
      id: Date.now(),
      createdAt: new Date().toISOString(),
    };

    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? {
            ...task,
            milestones: task.milestones.map(ms =>
              ms.id === milestoneId
                ? {
                    ...ms,
                    journalEntries: [...(ms.journalEntries || []), newEntry],
                  }
                : ms
            ),
          }
        : task
    );
    saveTasksToStorage(updatedTasks);
    return newEntry;
  }, [tasks, saveTasksToStorage]);

  const updateJournalEntry = useCallback((taskId, milestoneId, entryId, updates) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? {
            ...task,
            milestones: task.milestones.map(ms =>
              ms.id === milestoneId
                ? {
                    ...ms,
                    journalEntries: ms.journalEntries.map(entry =>
                      entry.id === entryId ? { ...entry, ...updates } : entry
                    ),
                  }
                : ms
            ),
          }
        : task
    );
    saveTasksToStorage(updatedTasks);
  }, [tasks, saveTasksToStorage]);

  const deleteJournalEntry = useCallback((taskId, milestoneId, entryId) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? {
            ...task,
            milestones: task.milestones.map(ms =>
              ms.id === milestoneId
                ? {
                    ...ms,
                    journalEntries: ms.journalEntries.filter(
                      entry => entry.id !== entryId
                    ),
                  }
                : ms
            ),
          }
        : task
    );
    saveTasksToStorage(updatedTasks);
  }, [tasks, saveTasksToStorage]);

  // -------- MEDIA & LOCATION --------
  const addMedia = useCallback((taskId, milestoneId, entryId, media) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? {
            ...task,
            milestones: task.milestones.map(ms =>
              ms.id === milestoneId
                ? {
                    ...ms,
                    journalEntries: ms.journalEntries.map(entry =>
                      entry.id === entryId
                        ? { ...entry, media: [...(entry.media || []), media] }
                        : entry
                    ),
                  }
                : ms
            ),
          }
        : task
    );
    saveTasksToStorage(updatedTasks);
  }, [tasks, saveTasksToStorage]);

  const updateLocation = useCallback((taskId, milestoneId, entryId, location) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? {
            ...task,
            milestones: task.milestones.map(ms =>
              ms.id === milestoneId
                ? {
                    ...ms,
                    journalEntries: ms.journalEntries.map(entry =>
                      entry.id === entryId ? { ...entry, location } : entry
                    ),
                  }
                : ms
            ),
          }
        : task
    );
    saveTasksToStorage(updatedTasks);
  }, [tasks, saveTasksToStorage]);

  // -------- UTILITY FUNCTIONS --------
  const setMilestoneWasEdited = useCallback((taskId, milestoneId) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? {
            ...task,
            milestones: task.milestones.map(ms =>
              ms.id === milestoneId ? { ...ms, wasEdited: true } : ms
            ),
          }
        : task
    );
    saveTasksToStorage(updatedTasks);
  }, [tasks, saveTasksToStorage]);

  const clearMilestoneWasEdited = useCallback((taskId, milestoneId) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? {
            ...task,
            milestones: task.milestones.map(ms =>
              ms.id === milestoneId ? { ...ms, wasEdited: false } : ms
            ),
          }
        : task
    );
    saveTasksToStorage(updatedTasks);
  }, [tasks, saveTasksToStorage]);

  // Clear storage function for debugging
  const clearStorage = useCallback(async () => {
    try {
      await clearStorageData();
    } catch (error) {
      handleAsyncStorageError(error, "clear");
    }
  }, [clearStorageData, handleAsyncStorageError]);

  // ---------- MEMOIZED CONTEXTS ----------
  // State context - sadece state değiştiğinde re-render
  const stateContextValue = useMemo(() => ({
    tasks,
    isLoading,
  }), [tasks, isLoading]);

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
    clearStorage,
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
