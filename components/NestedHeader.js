import React, { useImperativeHandle, forwardRef, memo } from 'react';
import MainHeader from './MainHeader';
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated';

/**
 * NestedHeader
 * Wraps the existing MainHeader component to expose a small imperative
 * API and to translate header progress changes into an onHeaderClosed event.
 *
 * Props: passes-through to MainHeader. Additionally accepts:
 * - globalCollapseProgress (SharedValue) - required to observe header state
 * - onHeaderClosed() - JS callback when header fully closed
 */
const NestedHeader = forwardRef(({ globalCollapseProgress, onHeaderClosed, ...props }, ref) => {
  // Expose a collapseTo(progress) method which sets the shared value.
  useImperativeHandle(ref, () => ({
    collapseTo: (progress) => {
      if (globalCollapseProgress && typeof globalCollapseProgress.value === 'number') {
        globalCollapseProgress.value = progress;
      }
    }
  }), [globalCollapseProgress]);

  // Fire onHeaderClosed when progress crosses the fully-closed threshold.
  useAnimatedReaction(
    () => globalCollapseProgress?.value,
    (progress, previous) => {
      if ((previous == null || previous < 0.999) && progress >= 0.999) {
        // Use runOnJS to call the JS callback from the animated thread.
        if (typeof onHeaderClosed === 'function') {
          runOnJS(() => {
            if (__DEV__) console.debug('NestedHeader: onHeaderClosed fired');
            try {
              onHeaderClosed();
            } catch (e) {
              // Swallow to avoid unhandled errors from animated thread -> JS bridge
              if (__DEV__) console.error('NestedHeader:onHeaderClosed error', e);
            }
          })();
        }
      }
    }
  );

  return (
    <MainHeader
      {...props}
      globalCollapseProgress={globalCollapseProgress}
    />
  );
});

// Improve Dev tooling and avoid unnecessary re-renders when props are stable.
NestedHeader.displayName = 'NestedHeader';
export default memo(NestedHeader);
