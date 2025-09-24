// hooks/useAnimations.js
import { useEffect } from "react";
import { Dimensions } from "react-native";
import { 
  useSharedValue, 
  withTiming, 
  withSpring, 
  runOnJS 
} from "react-native-reanimated";
import { ANIMATION_DURATIONS, ANIMATION_CONFIGS } from "../constants";

const { height } = Dimensions.get("window");

// Modal animasyonları için hook
export const useModalAnimation = (visible, onClose = null) => {
  const translateY = useSharedValue(height);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.96);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { 
        duration: ANIMATION_DURATIONS.NORMAL 
      });
      opacity.value = withTiming(1, { 
        duration: ANIMATION_DURATIONS.NORMAL 
      });
      scale.value = withTiming(1, { 
        duration: ANIMATION_DURATIONS.NORMAL 
      });
    } else {
      translateY.value = withTiming(height, { 
        duration: ANIMATION_DURATIONS.FAST 
      });
      opacity.value = withTiming(0, { 
        duration: ANIMATION_DURATIONS.FAST 
      });
      scale.value = withTiming(0.96, { 
        duration: ANIMATION_DURATIONS.FAST 
      });
    }
  }, [visible]);

  const closeModal = () => {
    translateY.value = withTiming(height, { 
      duration: ANIMATION_DURATIONS.FAST 
    });
    opacity.value = withTiming(0, { 
      duration: ANIMATION_DURATIONS.FAST 
    }, () => {
      if (onClose) {
        runOnJS(onClose)();
      }
    });
  };

  return { translateY, opacity, scale, closeModal };
};

// Spring animasyonları için hook
export const useSpringAnimation = (visible) => {
  const translateY = useSharedValue(height);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.96);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, ANIMATION_CONFIGS.SPRING);
      opacity.value = withTiming(1, { 
        duration: ANIMATION_DURATIONS.NORMAL 
      });
      scale.value = withSpring(1, ANIMATION_CONFIGS.BOUNCE);
    } else {
      translateY.value = withSpring(height, ANIMATION_CONFIGS.SPRING);
      opacity.value = withTiming(0, { 
        duration: ANIMATION_DURATIONS.FAST 
      });
      scale.value = withSpring(0.96, ANIMATION_CONFIGS.BOUNCE);
    }
  }, [visible]);

  return { translateY, opacity, scale };
};

// Progress bar animasyonu için hook
export const useProgressAnimation = (progress) => {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, { 
      duration: ANIMATION_DURATIONS.VERY_SLOW 
    });
  }, [progress]);

  return animatedProgress;
};

// Fade in/out animasyonu için hook
export const useFadeAnimation = (visible) => {
  const opacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { 
      duration: ANIMATION_DURATIONS.NORMAL 
    });
  }, [visible]);

  return opacity;
};

// Scale animasyonu için hook
export const useScaleAnimation = (visible) => {
  const scale = useSharedValue(visible ? 1 : 0.8);

  useEffect(() => {
    scale.value = withSpring(visible ? 1 : 0.8, ANIMATION_CONFIGS.SPRING);
  }, [visible]);

  return scale;
};

// Pan gesture ile modal kapatma için hook
export const usePanGesture = (onClose, threshold = 120) => {
  const dragY = useSharedValue(0);

  const handlePanEnd = (translationY) => {
    if (translationY > threshold) {
      dragY.value = withTiming(height, { 
        duration: ANIMATION_DURATIONS.FAST 
      }, () => {
        if (onClose) {
          runOnJS(onClose)();
        }
      });
    } else {
      dragY.value = withSpring(0, ANIMATION_CONFIGS.SPRING);
    }
  };

  const resetDrag = () => {
    dragY.value = 0;
  };

  return { dragY, handlePanEnd, resetDrag };
};
