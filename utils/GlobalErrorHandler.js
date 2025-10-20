// utils/GlobalErrorHandler.js
import { Platform } from 'react-native';
import logger from './logger';

class GlobalErrorHandler {
  static init() {
    // React Native ErrorUtils kullan (eğer mevcutsa)
    if (typeof ErrorUtils !== 'undefined') {
      const originalGlobalHandler = ErrorUtils.getGlobalHandler();
      ErrorUtils.setGlobalHandler((error, isFatal) => {
        this.reportError(error, { type: 'global_error', isFatal });
        if (originalGlobalHandler) {
          originalGlobalHandler(error, isFatal);
        }
      });
    }
  }

  static reportError(error, context = {}) {
    const errorReport = {
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace',
      timestamp: new Date().toISOString(),
      context,
      deviceInfo: {
        platform: Platform.OS,
        version: Platform.Version,
      }
    };
    
    // Use logger to redact sensitive fields and honor log level
    logger.report(errorReport);
    
    // In production, send to crash reporting service (integration point)
    if (!__DEV__) {
      // TODO: Integrate with crash reporting service (Sentry / Crashlytics)
      // Example: sentry.captureException(error, { extra: errorReport })
    }
  }

  static reportPerformanceIssue(componentName, renderTime) {
    if (renderTime > 100) { // 100ms'den uzun render
      logger.warn(`⚠️ Performance issue in ${componentName}: ${renderTime}ms`);
      
      if (!__DEV__) {
        // TODO: Send to analytics
        // analytics().logEvent('performance_issue', {
        //   component: componentName,
        //   render_time: renderTime
        // });
      }
    }
  }
}

export default GlobalErrorHandler;
