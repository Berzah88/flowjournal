// utils/locationHelpers.js
import * as Location from 'expo-location';
import logger from './logger';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Try reverse geocoding with a small retry/backoff and return result or null.
 * This function intentionally swallows intermittent errors and logs them at debug level
 * so the UI can safely fallback to coordinates without spamming WARN logs.
 */
export async function reverseGeocodeSafe(coords, attempts = 2, delayMs = 300) {
  if (!coords || !coords.latitude || !coords.longitude) return null;
  // Ensure we have permission before calling reverseGeocodeAsync. If permission
  // is denied we avoid calling the native API which throws and instead return
  // null so callers can gracefully fallback to showing raw coordinates.
  try {
    const current = await Location.getForegroundPermissionsAsync();
    if (current && current.status !== 'granted') {
      // If we can ask again, prompt the user once. Otherwise bail out.
      if (current.canAskAgain) {
        const req = await Location.requestForegroundPermissionsAsync();
        if (!req || req.status !== 'granted') {
          try { logger.debug('reverseGeocodeSafe: permission not granted after request'); } catch (e) {}
          return null;
        }
      } else {
        try { logger.debug('reverseGeocodeSafe: permission previously denied (cannot ask again)'); } catch (e) {}
        return null;
      }
    }
  } catch (permErr) {
    // If permission checks throw for any reason, log debug and continue —
    // the subsequent reverseGeocodeAsync will likely fail and be handled below.
    try { logger.debug('reverseGeocodeSafe: permission check error', { error: permErr && (permErr.message || permErr.code) }); } catch (e) {}
  }
  // If device-level location services are disabled, avoid calling reverseGeocode
  try {
    if (Location.hasServicesEnabledAsync) {
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        try { logger.debug('reverseGeocodeSafe: device location services disabled'); } catch (e) {}
        return null;
      }
    }
  } catch (svcErr) {
    // ignore service check errors; we'll catch the actual reverseGeocode error below
  }
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await Location.reverseGeocodeAsync({ latitude: coords.latitude, longitude: coords.longitude });
      return res;
    } catch (err) {
      lastErr = err;
      // If the platform explicitly rejects due to authorization, bail early
      const msg = err && (err.message || err.code || '');
      if (typeof msg === 'string' && msg.toLowerCase().includes('not authorized')) {
        // throttle repetitive messages to avoid log spam
        try {
          if (!reverseGeocodeSafe._lastNotAuthWarn || (Date.now() - reverseGeocodeSafe._lastNotAuthWarn) > 60000) {
            logger.debug('reverseGeocodeSafe: native API rejected - not authorized to use location services', { latitude: coords.latitude, longitude: coords.longitude, error: msg });
            reverseGeocodeSafe._lastNotAuthWarn = Date.now();
          }
        } catch (e) {}
        return null;
      }
      // small backoff
      if (i < attempts - 1) await sleep(delayMs);
    }
  }
  // Do not warn here; debug is sufficient for intermittent networking/location provider issues
  try {
    logger.debug('reverseGeocodeSafe failed after attempts:', { latitude: coords.latitude, longitude: coords.longitude, error: (lastErr && (lastErr.message || lastErr.code)) });
  } catch (e) {
    // ignore logging failures
  }
  return null;
}

export function formatCoords(coords) {
  if (!coords) return '';
  return `${coords.latitude.toFixed(1)}, ${coords.longitude.toFixed(1)}`;
}
