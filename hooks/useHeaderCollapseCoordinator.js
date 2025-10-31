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
  smoothing = 0.28,
  snapThreshold = 0.5,
  snapDuration = 180,
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
        if (Math.abs(diff) < 0.003) {
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
      const target = progress > snapThreshold ? 1 : 0;
      globalCollapseProgress.value = withTiming(target, { duration: snapDuration, easing: Easing.out(Easing.cubic) });
      if (globalScrollY) globalScrollY.value = withTiming(target * thr, { duration: snapDuration, easing: Easing.out(Easing.cubic) });
    },
    onMomentumEnd: (event) => {
      if (activeIndexShared && activeIndexShared.value !== 0) return;
      const y = event.contentOffset?.y ?? 0;
      const thr = (moodHeight && moodHeight.value > 0)
        ? moodHeight.value
        : (statusTabsOffset ? statusTabsOffset.value : 120);
      const clamped = Math.max(0, Math.min(y, thr));
      const progress = thr > 0 ? clamped / thr : 0;
      const target = progress > snapThreshold ? 1 : 0;
      globalCollapseProgress.value = withTiming(target, { duration: snapDuration, easing: Easing.out(Easing.cubic) });
      if (globalScrollY) globalScrollY.value = withTiming(target * thr, { duration: snapDuration, easing: Easing.out(Easing.cubic) });
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
        if (Math.abs(diff) < 0.003) {
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
      const target = progress > snapThreshold ? 1 : 0;
      globalCollapseProgress.value = withTiming(target, { duration: snapDuration, easing: Easing.out(Easing.cubic) });
      if (globalScrollY) globalScrollY.value = withTiming(target * thr, { duration: snapDuration, easing: Easing.out(Easing.cubic) });
    },
    onMomentumEnd: (event) => {
      if (activeIndexShared && activeIndexShared.value !== 1) return;
      const y = event.contentOffset?.y ?? 0;
      const thr = (moodHeight && moodHeight.value > 0)
        ? moodHeight.value
        : (statusTabsOffset ? statusTabsOffset.value : 120);
      const clamped = Math.max(0, Math.min(y, thr));
      const progress = thr > 0 ? clamped / thr : 0;
      const target = progress > snapThreshold ? 1 : 0;
      globalCollapseProgress.value = withTiming(target, { duration: snapDuration, easing: Easing.out(Easing.cubic) });
      if (globalScrollY) globalScrollY.value = withTiming(target * thr, { duration: snapDuration, easing: Easing.out(Easing.cubic) });
    }
  });

  return { myDayContentScrollHandler, activeContentScrollHandler };
}
