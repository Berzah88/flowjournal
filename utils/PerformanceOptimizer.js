// utils/PerformanceOptimizer.js
import React from 'react';
import logger from './logger';
import { InteractionManager, Platform } from 'react-native';

class PerformanceOptimizer {
  constructor() {
    this.isLowEndDevice = this.detectLowEndDevice();
    this.optimizationLevel = this.isLowEndDevice ? 'aggressive' : 'moderate';
  }

  detectLowEndDevice() {
    // Basit düşük performanslı cihaz tespiti
    if (Platform.OS === 'android') {
      // Android için RAM ve CPU core sayısına göre
      return false; // Şimdilik false, gerçek implementasyon için react-native-device-info kullanılabilir
    }
    return false;
  }

  // FlatList optimizasyonları
  getFlatListProps = (itemHeight = null) => {
    const baseProps = {
      removeClippedSubviews: true,
      maxToRenderPerBatch: this.optimizationLevel === 'aggressive' ? 5 : 10,
      windowSize: this.optimizationLevel === 'aggressive' ? 5 : 10,
      initialNumToRender: this.optimizationLevel === 'aggressive' ? 5 : 10,
      updateCellsBatchingPeriod: 50,
      disableIntervalMomentum: true,
      disableScrollViewPanResponder: true,
    };

    if (itemHeight) {
      baseProps.getItemLayout = (data, index) => ({
        length: itemHeight,
        offset: itemHeight * index,
        index,
      });
    }

    return baseProps;
  };

  // Image optimizasyonları
  getImageProps = () => ({
    resizeMode: 'cover',
    fadeDuration: this.optimizationLevel === 'aggressive' ? 0 : 200,
    progressiveRenderingEnabled: true,
    cache: 'force-cache',
  });

  // Animation optimizasyonları
  getAnimationConfig = () => ({
    useNativeDriver: true,
    duration: this.optimizationLevel === 'aggressive' ? 200 : 300,
  });

  // Heavy operations için InteractionManager kullanımı
  runAfterInteractions = (callback) => {
    InteractionManager.runAfterInteractions(() => {
      // Kısa bir delay ekle
      setTimeout(callback, this.optimizationLevel === 'aggressive' ? 100 : 50);
    });
  };

  // Memory management
  optimizeMemory = () => {
    if (Platform.OS === 'android') {
      // Android için memory optimization
      global.gc && global.gc();
    }
  };

  // Component render optimizasyonu
  shouldComponentUpdate = (prevProps, nextProps, keysToCompare = []) => {
    if (keysToCompare.length === 0) {
      return prevProps !== nextProps;
    }

    return keysToCompare.some(key => {
      const prevValue = prevProps[key];
      const nextValue = nextProps[key];
      
      if (typeof prevValue === 'object' && typeof nextValue === 'object') {
        return JSON.stringify(prevValue) !== JSON.stringify(nextValue);
      }
      
      return prevValue !== nextValue;
    });
  };

  // Batch state updates
  batchStateUpdates = (updates) => {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        updates.forEach(update => {
          if (typeof update === 'function') {
            update();
          }
        });
        resolve();
      });
    });
  };

  // Lazy loading için intersection observer benzeri
  createLazyLoader = (threshold = 0.1) => {
    const observers = new Map();
    
    return {
      observe: (element, callback) => {
        const id = Math.random().toString(36);
        observers.set(id, { element, callback, visible: false });
        return id;
      },
      
      unobserve: (id) => {
        observers.delete(id);
      },
      
      checkVisibility: () => {
        observers.forEach(({ element, callback, visible }) => {
          // Basit visibility check (gerçek implementasyon için react-native-intersection-observer kullanılabilir)
          if (element && !visible) {
            callback();
            observers.set(id, { ...observers.get(id), visible: true });
          }
        });
      }
    };
  };

  // Performance monitoring
  measureRenderTime = (componentName, renderFunction) => {
    const startTime = performance.now();
    const result = renderFunction();
    const endTime = performance.now();
    const renderTime = endTime - startTime;

    if (__DEV__ && renderTime > 16) { // 16ms = 60fps threshold
      logger.warn(`⚠️ Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }

    return result;
  };

  // Network request optimization
  optimizeNetworkRequests = () => ({
    timeout: 10000,
    retryAttempts: 2,
    retryDelay: 1000,
    batchRequests: true,
  });

  // Storage optimization
  optimizeStorage = () => ({
    batchSize: 50,
    compressionEnabled: true,
    cacheSize: this.optimizationLevel === 'aggressive' ? 10 : 50,
  });
}

// Global instance
export const performanceOptimizer = new PerformanceOptimizer();

// React hooks for performance optimization
export const usePerformanceOptimization = () => {
  return {
    flatListProps: performanceOptimizer.getFlatListProps(),
    imageProps: performanceOptimizer.getImageProps(),
    animationConfig: performanceOptimizer.getAnimationConfig(),
    runAfterInteractions: performanceOptimizer.runAfterInteractions,
    batchStateUpdates: performanceOptimizer.batchStateUpdates,
    measureRenderTime: performanceOptimizer.measureRenderTime,
  };
};

// HOC for performance optimization
export const withPerformanceOptimization = (WrappedComponent, options = {}) => {
  return React.memo(WrappedComponent, (prevProps, nextProps) => {
    const keysToCompare = options.keysToCompare || [];
    return !performanceOptimizer.shouldComponentUpdate(prevProps, nextProps, keysToCompare);
  });
};

export default PerformanceOptimizer;
