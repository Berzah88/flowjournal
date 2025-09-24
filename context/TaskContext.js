// context/TaskContext.js
import React, { createContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { assignUniqueColor } from "../utils/milestoneColors";

export const TaskContext = createContext();

// Module-level flag to avoid double init within the same JS runtime
let HAS_INITIALIZED = false;

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef(null);
  const isMountedRef = useRef(true); // to avoid setState on unmounted component
  const justLoadedRef = useRef(false); // skip first save immediately after load

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
        const storedTasks = await AsyncStorage.getItem("tasks");

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
        console.error("TaskProvider: Failed to load tasks:", error);
        if (isMountedRef.current) setTasks([]);
        try {
          await AsyncStorage.removeItem("tasks");
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

  // ---------- SAVE TASKS (debounced) ----------
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

    // Slightly longer debounce to reduce frequent saves on quick successive updates
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        if (!isMountedRef.current) return;
        if (Array.isArray(tasks)) {
          await AsyncStorage.setItem("tasks", JSON.stringify(tasks));
        } else {
        }
      } catch (error) {
        console.error("TaskProvider: Save failed:", error);
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [tasks, isLoading]);

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

  // -------- MILESTONE CRUD --------
  const addMilestone = useCallback((taskId, milestone) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        
        const newMilestone = {
          ...milestone,
          id: Date.now(),
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

  // Helper function to check if project end date should be updated
  const shouldUpdateProjectEndDate = (milestones, currentEndDate) => {
    if (!milestones || milestones.length === 0) return null;
    
    const latestMilestoneDate = milestones.reduce((latest, ms) => {
      const msEndDate = new Date(ms.endDate);
      return msEndDate > latest ? msEndDate : latest;
    }, new Date(0));
    
    const projectEndDate = new Date(currentEndDate);
    return latestMilestoneDate > projectEndDate ? latestMilestoneDate.toISOString() : null;
  };

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
                      journalEntries: [
                        ...(ms.journalEntries || []),
                        {
                          id: Date.now(),
                          ...entry,
                          createdAt: new Date().toISOString(),
                        },
                      ],
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
                      journalEntries: (ms.journalEntries || []).map((entry) =>
                        entry.id === entryId
                          ? { ...entry, ...updates, updatedAt: new Date().toISOString() }
                          : entry
                      ),
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

  // Clear storage function for debugging
  const clearStorage = useCallback(async () => {
    try {
      await AsyncStorage.removeItem("tasks");
      if (isMountedRef.current) setTasks([]);
    } catch (error) {
      console.error("Failed to clear storage:", error);
    }
  }, []);

  // ---------- MEMOIZED CONTEXT ----------
  const contextValue = useMemo(() => {
    return {
      tasks,
      isLoading,
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
    };
  }, [
    tasks,
    isLoading,
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

  // Final render
  return <TaskContext.Provider value={contextValue}>{children}</TaskContext.Provider>;
};
