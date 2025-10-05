// hooks/usePerformanceMonitor.js
import { useEffect, useRef, useState } from 'react';

// Enhanced performance monitoring hook
export const usePerformanceMonitor = (componentName, options = {}) => {
  const {
    trackFPS = true,
    trackMemory = false,
    warnThreshold = 100, // ms
    criticalThreshold = 200 // ms
  } = options;

  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const renderTimes = useRef([]);
  const [fpsData] = useState({ fps: 60, isStable: true });

  useEffect(() => {
    const startTime = performance.now();
    
    renderCount.current += 1;
    const currentTime = Date.now();
    const timeSinceLastRender = currentTime - lastRenderTime.current;
    
    // Render time tracking
    const renderTime = performance.now() - startTime;
    renderTimes.current.push(renderTime);
    
    // Keep only last 10 render times
    if (renderTimes.current.length > 10) {
      renderTimes.current.shift();
    }
    
    if (__DEV__) {
      const avgRenderTime = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length;
      
      console.log(`🔄 ${componentName} rendered ${renderCount.current} times. Time since last render: ${timeSinceLastRender}ms | Render time: ${renderTime.toFixed(2)}ms | Avg: ${avgRenderTime.toFixed(2)}ms`);
      
      // Performance warnings
      if (timeSinceLastRender < warnThreshold && renderCount.current > 1) {
        console.warn(`⚠️ ${componentName} is rendering too frequently! Consider optimizing.`);
      }
      
      if (renderTime > criticalThreshold) {
        console.error(`🚨 ${componentName} has critical render time: ${renderTime.toFixed(2)}ms`);
      }
    }
    
    lastRenderTime.current = currentTime;
  });

  // FPS tracking - disabled
  useEffect(() => {
    if (!trackFPS) return;
    // FPS tracking disabled - FPSTracker removed
  }, [componentName, trackFPS]);

  return {
    renderCount: renderCount.current,
    timeSinceLastRender: Date.now() - lastRenderTime.current,
    avgRenderTime: renderTimes.current.length > 0 
      ? renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length 
      : 0,
    fpsData,
    isPerformanceGood: fpsData.isStable && renderTimes.current.length > 0 
      ? renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length < 16
      : true
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
