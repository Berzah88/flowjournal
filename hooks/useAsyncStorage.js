// hooks/useAsyncStorage.js
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS, ERROR_MESSAGES } from "../constants";

// AsyncStorage operations için custom hook
export const useAsyncStorage = (key, defaultValue = null) => {
  const [data, setData] = useState(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Veri yükleme
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const storedData = await AsyncStorage.getItem(key);
      
      if (storedData !== null) {
        const parsedData = JSON.parse(storedData);
        setData(parsedData);
      } else {
        setData(defaultValue);
      }
    } catch (err) {
      console.error(`useAsyncStorage: Failed to load ${key}:`, err);
      setError(err);
      setData(defaultValue);
      
      // Corrupted data'yı temizle
      try {
        await AsyncStorage.removeItem(key);
      } catch (clearErr) {
        console.error(`useAsyncStorage: Failed to clear corrupted ${key}:`, clearErr);
      }
    } finally {
      setLoading(false);
    }
  }, [key, defaultValue]);

  // Veri kaydetme
  const saveData = useCallback(async (newData) => {
    try {
      setError(null);
      const jsonData = JSON.stringify(newData);
      await AsyncStorage.setItem(key, jsonData);
      setData(newData);
      return true;
    } catch (err) {
      console.error(`useAsyncStorage: Failed to save ${key}:`, err);
      setError(err);
      return false;
    }
  }, [key]);

  // Veri temizleme
  const clearData = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(key);
      setData(defaultValue);
      setError(null);
      return true;
    } catch (err) {
      console.error(`useAsyncStorage: Failed to clear ${key}:`, err);
      setError(err);
      return false;
    }
  }, [key, defaultValue]);

  // İlk yükleme
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    saveData,
    clearData,
    reload: loadData,
  };
};

// Debounced save hook
export const useDebouncedSave = (data, delay = 1000) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (data === null || data === undefined) return;

    const timeoutId = setTimeout(async () => {
      try {
        setIsSaving(true);
        setSaveError(null);
        await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(data));
      } catch (error) {
        console.error("Debounced save failed:", error);
        setSaveError(error);
      } finally {
        setIsSaving(false);
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [data, delay]);

  return { isSaving, saveError };
};

// Storage operations için utility hook
export const useStorageOperations = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const saveItem = useCallback(async (key, value) => {
    try {
      setIsLoading(true);
      setError(null);
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error(`Storage save error for ${key}:`, err);
      setError(err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getItem = useCallback(async (key) => {
    try {
      setIsLoading(true);
      setError(null);
      const item = await AsyncStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (err) {
      console.error(`Storage get error for ${key}:`, err);
      setError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeItem = useCallback(async (key) => {
    try {
      setIsLoading(true);
      setError(null);
      await AsyncStorage.removeItem(key);
      return true;
    } catch (err) {
      console.error(`Storage remove error for ${key}:`, err);
      setError(err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await AsyncStorage.clear();
      return true;
    } catch (err) {
      console.error("Storage clear error:", err);
      setError(err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    saveItem,
    getItem,
    removeItem,
    clearAll,
  };
};
