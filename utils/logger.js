// utils/logger.js
// Lightweight logger with production-safe behaviour and simple redaction
const shouldDebug = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

const REDACT_KEYS = ["private_key", "apiKey", "client_email", "Authorization", "auth_token"];

function redact(value) {
  try {
    if (value == null) return value;
    // If it's a string, redact obvious secrets
    if (typeof value === 'string') {
      let s = value;
      REDACT_KEYS.forEach(k => {
        // redact occurrences like key... or key:value patterns (best effort)
        const re = new RegExp(k + '[^"]*', 'gi');
        s = s.replace(re, '[REDACTED]');
        // also redact JSON-ish "key": "..." patterns (escape backslashes)
        const jsonRe = new RegExp('"' + k + '"\\s*:\\s*"[^"]*"', 'gi');
        s = s.replace(jsonRe, '"' + k + '": "[REDACTED]"');
      });
      return s;
    }

    // If it's an object, shallow copy and redact known keys
    if (typeof value === 'object') {
      const copy = Array.isArray(value) ? [] : {};
      Object.keys(value).forEach(k => {
        try {
          if (REDACT_KEYS.includes(k)) {
            copy[k] = '[REDACTED]';
          } else {
            copy[k] = value[k];
          }
        } catch (e) {
          copy[k] = '[UNSERIALIZABLE]';
        }
      });
      return copy;
    }

    return value;
  } catch (e) {
    return '[REDACTION_ERROR]';
  }
}

function formatArgs(args) {
  return args.map(a => redact(a));
}

const logger = {
  debug: (...args) => {
    if (!shouldDebug) return;
    // Use console.debug if available
    if (console.debug) console.debug(...formatArgs(args));
    else console.log(...formatArgs(args));
  },
  info: (...args) => {
    if (console.info) console.info(...formatArgs(args));
    else console.log(...formatArgs(args));
  },
  warn: (...args) => {
    if (console.warn) console.warn(...formatArgs(args));
    else console.log(...formatArgs(args));
  },
  error: (...args) => {
    if (console.error) console.error(...formatArgs(args));
    else console.log(...formatArgs(args));
  },
  // Safe report: redact and optionally send to remote (integration point)
  report: (payload) => {
    const safe = redact(payload);
    if (shouldDebug) console.log('REPORT:', safe);
    // In production, this is the hook to integrate crash reporting (Sentry/Crashlytics)
    return safe;
  }
};

export default logger;
