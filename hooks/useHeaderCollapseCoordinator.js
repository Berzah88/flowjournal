import { useAnimatedScrollHandler, withTiming, Easing } from 'react-native-reanimated';

// Centralized header collapse coordinator hook.
// Accepts shared values and returns per-tab scroll handlers that drive
// `globalCollapseProgress` and `globalScrollY` with smoothing and snapping.
export default function useHeaderCollapseCoordinator({
  globalCollapseProgress,
  globalScrollY,
  statusTabsOffset,
  activeIndexShared,
  moodHeight,
  // Tune smoothing: increase to make progress follow more smoothly
  // (less twitchy) while keeping sensitivity reasonable.
  // User-requested: set smoothing to 0.32 for an even smoother feel.
  smoothing = 0.32,
  // Lower snap threshold so less scroll is required to snap closed.
  // User requested very sensitive snapping: 5%.
  snapThreshold = 0.05,
  // Slightly longer duration to make the snap feel smoother (less abrupt).
  snapDuration = 160,
  // Allow caller to disable automatic snapping (keep header purely scroll-synced)
  snapEnabled = true,
}) {
  // Handler for MyDay tab (index 0)
  const myDayContentScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (activeIndexShared && activeIndexShared.value !== 0) return;
      const y = event.contentOffset?.y ?? 0;
      // Update mirrored scroll pos if present
      try {
        // Use moodHeight as the collapse threshold when available (header's
        // collapsing amount). Fallback to statusTabsOffset or a sensible default.
        const thr = (moodHeight && moodHeight.value > 0)
          ? moodHeight.value
          : (statusTabsOffset ? statusTabsOffset.value : 120);
        const clamped = Math.max(0, Math.min(y, thr));
        const progress = thr > 0 ? clamped / thr : 0;
        const current = globalCollapseProgress.value;
        const diff = progress - current;
        // Introduce a slightly larger deadzone to ignore tiny oscillations
        // which previously caused the header to appear indecisive.
        if (Math.abs(diff) < 0.008) {
          globalCollapseProgress.value = progress;
        } else {
          globalCollapseProgress.value = current + diff * smoothing;
        }
        if (globalScrollY) globalScrollY.value = clamped;
      } catch (e) {}
    },
    onEndDrag: (event) => {
      if (activeIndexShared && activeIndexShared.value !== 0) return;
      const y = event.contentOffset?.y ?? 0;
      const thr = (moodHeight && moodHeight.value > 0)
        ? moodHeight.value
        : (statusTabsOffset ? statusTabsOffset.value : 120);
      const clamped = Math.max(0, Math.min(y, thr));
      const progress = thr > 0 ? clamped / thr : 0;
      if (snapEnabled) {
        const target = progress > snapThreshold ? 1 : 0;
        // Avoid starting tiny animations when we're already very close to the
        // target; jump to final state or skip the timing to prevent jitter.
        if (Math.abs(globalCollapseProgress.value - target) > 0.015) {
          globalCollapseProgress.value = withTiming(target, { duration: snapDuration, easing: Easing.out(Easing.cubic) });
          if (globalScrollY) globalScrollY.value = withTiming(target * thr, { duration: snapDuration, easing: Easing.out(Easing.cubic) });
        } else {
          globalCollapseProgress.value = target;
          if (globalScrollY) globalScrollY.value = target * thr;
        }
      } else {
        // Keep header strictly synced to current progress without snapping.
        globalCollapseProgress.value = progress;
        if (globalScrollY) globalScrollY.value = clamped;
      }
    },
    onMomentumEnd: (event) => {
      if (activeIndexShared && activeIndexShared.value !== 0) return;
      const y = event.contentOffset?.y ?? 0;
      const thr = (moodHeight && moodHeight.value > 0)
        ? moodHeight.value
        : (statusTabsOffset ? statusTabsOffset.value : 120);
      const clamped = Math.max(0, Math.min(y, thr));
      const progress = thr > 0 ? clamped / thr : 0;
      if (snapEnabled) {
        const target = progress > snapThreshold ? 1 : 0;
        if (Math.abs(globalCollapseProgress.value - target) > 0.015) {
          globalCollapseProgress.value = withTiming(target, { duration: snapDuration, easing: Easing.out(Easing.cubic) });
          if (globalScrollY) globalScrollY.value = withTiming(target * thr, { duration: snapDuration, easing: Easing.out(Easing.cubic) });
        } else {
          globalCollapseProgress.value = target;
          if (globalScrollY) globalScrollY.value = target * thr;
        }
      } else {
        globalCollapseProgress.value = progress;
        if (globalScrollY) globalScrollY.value = clamped;
      }
    }
  });

  const activeContentScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (activeIndexShared && activeIndexShared.value !== 1) return;
      const y = event.contentOffset?.y ?? 0;
      try {
        const thr = (moodHeight && moodHeight.value > 0)
          ? moodHeight.value
          : (statusTabsOffset ? statusTabsOffset.value : 120);
        const clamped = Math.max(0, Math.min(y, thr));
        const progress = thr > 0 ? clamped / thr : 0;
        const current = globalCollapseProgress.value;
        const diff = progress - current;
        // Use same deadzone as MyDay handler to avoid tiny oscillations.
        if (Math.abs(diff) < 0.008) {
          globalCollapseProgress.value = progress;
        } else {
          globalCollapseProgress.value = current + diff * smoothing;
        }
        if (globalScrollY) globalScrollY.value = clamped;
      } catch (e) {}
    },
    onEndDrag: (event) => {
      if (activeIndexShared && activeIndexShared.value !== 1) return;
      const y = event.contentOffset?.y ?? 0;
      const thr = (moodHeight && moodHeight.value > 0)
        ? moodHeight.value
        : (statusTabsOffset ? statusTabsOffset.value : 120);
      const clamped = Math.max(0, Math.min(y, thr));
      const progress = thr > 0 ? clamped / thr : 0;
      if (snapEnabled) {
        const target = progress > snapThreshold ? 1 : 0;
        if (Math.abs(globalCollapseProgress.value - target) > 0.015) {
          globalCollapseProgress.value = withTiming(target, { duration: snapDuration, easing: Easing.out(Easing.cubic) });
          if (globalScrollY) globalScrollY.value = withTiming(target * thr, { duration: snapDuration, easing: Easing.out(Easing.cubic) });
        } else {
          globalCollapseProgress.value = target;
          if (globalScrollY) globalScrollY.value = target * thr;
        }
      } else {
        globalCollapseProgress.value = progress;
        if (globalScrollY) globalScrollY.value = clamped;
      }
    },
    onMomentumEnd: (event) => {
      if (activeIndexShared && activeIndexShared.value !== 1) return;
      const y = event.contentOffset?.y ?? 0;
      const thr = (moodHeight && moodHeight.value > 0)
        ? moodHeight.value
        : (statusTabsOffset ? statusTabsOffset.value : 120);
      const clamped = Math.max(0, Math.min(y, thr));
      const progress = thr > 0 ? clamped / thr : 0;
      if (snapEnabled) {
        const target = progress > snapThreshold ? 1 : 0;
        if (Math.abs(globalCollapseProgress.value - target) > 0.015) {
          globalCollapseProgress.value = withTiming(target, { duration: snapDuration, easing: Easing.out(Easing.cubic) });
          if (globalScrollY) globalScrollY.value = withTiming(target * thr, { duration: snapDuration, easing: Easing.out(Easing.cubic) });
        } else {
          globalCollapseProgress.value = target;
          if (globalScrollY) globalScrollY.value = target * thr;
        }
      } else {
        globalCollapseProgress.value = progress;
        if (globalScrollY) globalScrollY.value = clamped;
      }
    }
  });

  return { myDayContentScrollHandler, activeContentScrollHandler };
}
