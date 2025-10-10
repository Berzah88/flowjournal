// hooks/useAnimations.js
import { useEffect, useRef, useCallback } from "react";
import { Dimensions, Animated } from "react-native";
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

  const closeModal = useCallback(() => {
    try {
      // Smooth kapanış animasyonu
      translateY.value = withSpring(height, {
        damping: 25,
        stiffness: 400,
        mass: 0.7,
      });
      opacity.value = withTiming(0, { 
        duration: 200,
        easing: Easing.out(Easing.quad),
      }, (finished) => {
        if (finished && onClose) {
          runOnJS(onClose)();
        }
      });
      scale.value = withSpring(0.95, {
        damping: 20,
        stiffness: 300,
        mass: 0.5,
      });
    } catch (error) {
      console.error('Error in closeModal:', error);
      // Fallback: direct close
      if (onClose) {
        onClose();
      }
    }
  }, [onClose]);

  return { translateY, opacity, scale, closeModal };
};

// Spring animasyonları için hook
export const useSpringAnimation = (visible) => {
  const translateY = useSharedValue(height);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.96);

  useEffect(() => {
    if (visible) {
      // Hızlı ve smooth açılış - klavye ile senkronize
      translateY.value = withTiming(0, { 
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });
      opacity.value = withTiming(1, { 
        duration: 250,
        easing: Easing.out(Easing.ease),
      });
      scale.value = withTiming(1, { 
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      // Hızlı kapanış
      translateY.value = withTiming(height, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.96, { duration: 200 });
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

  const handlePanEnd = useCallback((translationY) => {
    try {
      if (translationY > threshold) {
        // Smooth kapanış animasyonu
        dragY.value = withSpring(height, {
          damping: 25,
          stiffness: 400,
          mass: 0.7,
        }, (finished) => {
          if (finished && onClose) {
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
    } catch (error) {
      console.error('Error in handlePanEnd:', error);
      // Fallback: reset position
      dragY.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
        mass: 0.8,
      });
    }
  }, [onClose, threshold]);

  const resetDrag = useCallback(() => {
    try {
      dragY.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
        mass: 0.8,
      });
    } catch (error) {
      console.error('Error in resetDrag:', error);
      dragY.value = 0;
    }
  }, []);

  return { dragY, handlePanEnd, resetDrag };
};

// Medya modal animasyonu için hook - Add Project screen benzeri
export const useMediaModalAnimation = () => {
  const translateY = useSharedValue(height);
  const opacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  const openModal = () => {
    // Add Project screen benzeri animasyon - yukarıdan aşağıya
    backdropOpacity.value = withTiming(1, { 
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
    translateY.value = withSpring(0, ANIMATION_CONFIGS.SPRING);
    opacity.value = withTiming(1, { 
      duration: ANIMATION_DURATIONS.NORMAL,
      easing: Easing.out(Easing.cubic),
    });
  };

  const closeModal = (onComplete) => {
    // Hızlı kapanış animasyonu
    backdropOpacity.value = withTiming(0, { 
      duration: 200,
      easing: Easing.in(Easing.quad),
    });
    translateY.value = withSpring(height, ANIMATION_CONFIGS.SPRING);
    opacity.value = withTiming(0, { 
      duration: ANIMATION_DURATIONS.FAST,
      easing: Easing.in(Easing.quad),
    }, () => {
      if (onComplete) {
        runOnJS(onComplete)();
      }
    });
  };

  const resetAnimation = () => {
    translateY.value = height;
    opacity.value = 0;
    backdropOpacity.value = 0;
  };

  return {
    translateY,
    opacity,
    backdropOpacity,
    openModal,
    closeModal,
    resetAnimation,
  };
};

// Calendar animasyonu için hook - gün değişimlerinde smooth geçiş
export const useCalendarAnimation = () => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const animateDateChange = useCallback((callback) => {
    // Yukarı kaydırma ve fade out
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -20,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Callback'i çalıştır (veri güncelleme)
      if (callback) callback();
      
      // Aşağıdan yukarı gelme ve fade in
      translateY.setValue(20); // Başlangıç pozisyonu
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [translateY, opacity]);

  const animatedStyle = {
    opacity: opacity,
    transform: [{ translateY: translateY }],
  };

  return {
    animateDateChange,
    animatedStyle,
  };
};
