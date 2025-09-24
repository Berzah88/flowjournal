// hooks/usePerformanceMonitor.js
import { useEffect, useRef } from 'react';

// Performance monitoring hook - sadece development'ta kullan
export const usePerformanceMonitor = (componentName) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
    const currentTime = Date.now();
    const timeSinceLastRender = currentTime - lastRenderTime.current;
    
    if (__DEV__) {
      console.log(`🔄 ${componentName} rendered ${renderCount.current} times. Time since last render: ${timeSinceLastRender}ms`);
      
      // Eğer çok sık render oluyorsa uyar
      if (timeSinceLastRender < 100 && renderCount.current > 1) {
        console.warn(`⚠️ ${componentName} is rendering too frequently! Consider optimizing.`);
      }
    }
    
    lastRenderTime.current = currentTime;
  });

  return {
    renderCount: renderCount.current,
    timeSinceLastRender: Date.now() - lastRenderTime.current
  };
};

// Context performance monitoring hook
export const useContextPerformanceMonitor = (contextName) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
    const currentTime = Date.now();
    const timeSinceLastRender = currentTime - lastRenderTime.current;
    
    if (__DEV__) {
      console.log(`📊 ${contextName} context updated. Render count: ${renderCount.current}. Time since last update: ${timeSinceLastRender}ms`);
    }
    
    lastRenderTime.current = currentTime;
  });

  return {
    renderCount: renderCount.current,
    timeSinceLastRender: Date.now() - lastRenderTime.current
  };
};
