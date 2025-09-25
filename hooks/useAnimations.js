// hooks/useAnimations.js
import { useEffect } from "react";
import { Dimensions } from "react-native";
import { 
  useSharedValue, 
  withTiming, 
  withSpring, 
  runOnJS,
  Easing
} from "react-native-reanimated";
import { ANIMATION_DURATIONS, ANIMATION_CONFIGS } from "../constants";

const { height } = Dimensions.get("window");

// Modal animasyonları için hook - iOS tarzı smooth animasyonlar
export const useModalAnimation = (visible, onClose = null) => {
  const translateY = useSharedValue(height);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    if (visible) {
      // iOS tarzı smooth açılış animasyonu
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
        mass: 0.8,
      });
      opacity.value = withTiming(1, { 
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 200,
        mass: 0.6,
      });
    } else {
      // Hızlı kapanış animasyonu
      translateY.value = withTiming(height, { 
        duration: 200,
        easing: Easing.out(Easing.quad),
      });
      opacity.value = withTiming(0, { 
        duration: 150,
      });
      scale.value = withTiming(0.95, { 
        duration: 200,
      });
    }
  }, [visible]);

  const closeModal = () => {
    // Smooth kapanış animasyonu
    translateY.value = withSpring(height, {
      damping: 25,
      stiffness: 400,
      mass: 0.7,
    });
    opacity.value = withTiming(0, { 
      duration: 200,
      easing: Easing.out(Easing.quad),
    }, () => {
      if (onClose) {
        runOnJS(onClose)();
      }
    });
    scale.value = withSpring(0.95, {
      damping: 20,
      stiffness: 300,
      mass: 0.5,
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

// Pan gesture ile modal kapatma için hook - iOS tarzı smooth
export const usePanGesture = (onClose, threshold = 120) => {
  const dragY = useSharedValue(0);

  const handlePanEnd = (translationY) => {
    if (translationY > threshold) {
      // Smooth kapanış animasyonu
      dragY.value = withSpring(height, {
        damping: 25,
        stiffness: 400,
        mass: 0.7,
      }, () => {
        if (onClose) {
          runOnJS(onClose)();
        }
      });
    } else {
      // Smooth geri dönüş animasyonu
      dragY.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
        mass: 0.8,
      });
    }
  };

  const resetDrag = () => {
    dragY.value = withSpring(0, {
      damping: 20,
      stiffness: 300,
      mass: 0.8,
    });
  };

  return { dragY, handlePanEnd, resetDrag };
};
