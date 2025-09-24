// hooks/useErrorHandler.js
import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { ERROR_MESSAGES } from "../constants";

// Error handling için custom hook
export const useErrorHandler = () => {
  const [error, setError] = useState(null);
  const [isError, setIsError] = useState(false);

  const handleError = useCallback((error, context = "") => {
    console.error(`Error in ${context}:`, error);
    setError(error);
    setIsError(true);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setIsError(false);
  }, []);

  const showErrorAlert = useCallback((message, title = "Error") => {
    Alert.alert(
      title,
      message,
      [{ text: "OK", onPress: clearError }]
    );
  }, [clearError]);

  const handleAsyncStorageError = useCallback((error, operation) => {
    const message = ERROR_MESSAGES[`STORAGE_${operation.toUpperCase()}_FAILED`] || 
                   `Storage ${operation} failed`;
    handleError(error, `AsyncStorage.${operation}`);
    showErrorAlert(message, "Storage Error");
  }, [handleError, showErrorAlert]);

  const handleImagePickerError = useCallback((error) => {
    handleError(error, "ImagePicker");
    showErrorAlert(ERROR_MESSAGES.IMAGE_PICK_FAILED, "Image Error");
  }, [handleError, showErrorAlert]);

  const handleLocationError = useCallback((error) => {
    handleError(error, "Location");
    showErrorAlert(ERROR_MESSAGES.LOCATION_FAILED, "Location Error");
  }, [handleError, showErrorAlert]);

  const handleNetworkError = useCallback((error) => {
    handleError(error, "Network");
    showErrorAlert(ERROR_MESSAGES.NETWORK_ERROR, "Network Error");
  }, [handleError, showErrorAlert]);

  return {
    error,
    isError,
    handleError,
    clearError,
    showErrorAlert,
    handleAsyncStorageError,
    handleImagePickerError,
    handleLocationError,
    handleNetworkError,
  };
};

// Error boundary için hook
export const useErrorBoundary = () => {
  const [error, setError] = useState(null);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const captureError = useCallback((error, errorInfo) => {
    console.error("ErrorBoundary caught an error:", error);
    console.error("Error type:", error.name);
    console.error("Error stack:", error.stack);
    console.error("Component stack:", errorInfo?.componentStack);
    
    setError({
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
    });
  }, []);

  return {
    error,
    resetError,
    captureError,
    hasError: !!error,
  };
};

// Retry mechanism için hook
export const useRetry = (maxRetries = 3) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const canRetry = retryCount < maxRetries;

  const retry = useCallback(async (operation) => {
    if (!canRetry) {
      console.warn("Max retries reached");
      return false;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      const result = await operation();
      setRetryCount(0); // Reset on success
      return result;
    } catch (error) {
      console.error(`Retry ${retryCount + 1} failed:`, error);
      throw error;
    } finally {
      setIsRetrying(false);
    }
  }, [retryCount, canRetry]);

  const resetRetry = useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  return {
    retryCount,
    isRetrying,
    canRetry,
    retry,
    resetRetry,
  };
};
