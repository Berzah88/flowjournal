import { Platform } from 'react-native';

class CrashReporter {
  static reportError(error, context = {}) {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context,
      deviceInfo: {
        platform: Platform.OS,
        version: Platform.Version,
      }
    };
    
    console.error('🚨 CRASH REPORT:', errorReport);
    
    // Production'da crash reporting service'e gönder
    if (!__DEV__) {
      // crashlytics().recordError(error);
      // analytics().logEvent('app_crash', errorReport);
    }
    
    return errorReport;
  }
  
  static reportPerformanceIssue(componentName, renderTime) {
    if (renderTime > 100) { // 100ms'den uzun render
      console.warn(`⚠️ Performance issue in ${componentName}: ${renderTime}ms`);
      
      const performanceReport = {
        component: componentName,
        renderTime,
        timestamp: new Date().toISOString(),
        platform: Platform.OS
      };
      
      if (!__DEV__) {
        // analytics().logEvent('performance_issue', performanceReport);
      }
      
      return performanceReport;
    }
    return null;
  }
  
  static reportMemoryIssue(componentName, memoryUsage) {
    if (memoryUsage && memoryUsage.used > 100) { // 100MB'den fazla
      console.warn(`⚠️ Memory issue in ${componentName}: ${memoryUsage.used}MB`);
      
      const memoryReport = {
        component: componentName,
        memoryUsage,
        timestamp: new Date().toISOString(),
        platform: Platform.OS
      };
      
      if (!__DEV__) {
        // analytics().logEvent('memory_issue', memoryReport);
      }
      
      return memoryReport;
    }
    return null;
  }
  
  static reportDataLoss(context, details = {}) {
    const dataLossReport = {
      context,
      details,
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      severity: 'CRITICAL'
    };
    
    console.error('🚨 DATA LOSS REPORT:', dataLossReport);
    
    if (!__DEV__) {
      // analytics().logEvent('data_loss', dataLossReport);
    }
    
    return dataLossReport;
  }
  
  static reportAsyncOperationFailure(operation, error, context = {}) {
    const asyncFailureReport = {
      operation,
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      platform: Platform.OS
    };
    
    console.error('🚨 ASYNC OPERATION FAILURE:', asyncFailureReport);
    
    if (!__DEV__) {
      // analytics().logEvent('async_operation_failure', asyncFailureReport);
    }
    
    return asyncFailureReport;
  }
  
  static reportRaceCondition(operation, details = {}) {
    const raceConditionReport = {
      operation,
      details,
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      severity: 'HIGH'
    };
    
    console.warn('⚠️ RACE CONDITION DETECTED:', raceConditionReport);
    
    if (!__DEV__) {
      // analytics().logEvent('race_condition', raceConditionReport);
    }
    
    return raceConditionReport;
  }
  
  static reportMemoryLeak(componentName, details = {}) {
    const memoryLeakReport = {
      component: componentName,
      details,
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      severity: 'HIGH'
    };
    
    console.warn('⚠️ MEMORY LEAK DETECTED:', memoryLeakReport);
    
    if (!__DEV__) {
      // analytics().logEvent('memory_leak', memoryLeakReport);
    }
    
    return memoryLeakReport;
  }
  
  static getCrashStats() {
    // Bu fonksiyon crash istatistiklerini döndürür
    // Production'da analytics'ten alınabilir
    return {
      totalCrashes: 0,
      performanceIssues: 0,
      memoryIssues: 0,
      dataLossIncidents: 0,
      asyncFailures: 0,
      raceConditions: 0,
      memoryLeaks: 0
    };
  }
}

export default CrashReporter;

