import React, { useImperativeHandle, forwardRef } from 'react';
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
        if (onHeaderClosed) runOnJS(onHeaderClosed)();
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

export default NestedHeader;
