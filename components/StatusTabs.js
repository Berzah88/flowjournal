// components/StatusTabs.js
import React, { useEffect } from "react";
import { View, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import Animated, { useSharedValue, withTiming, useAnimatedStyle, interpolate, interpolateColor, Easing } from "react-native-reanimated";
const { width } = Dimensions.get("window");

export default function StatusTabs({ activeIndex = 0, onTabPress = () => {} }) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  // progress: 0 => My Day selected, 1 => Active selected (UI thread)
  const progress = useSharedValue(activeIndex === 0 ? 0 : 1);

  useEffect(() => {
    progress.value = withTiming(activeIndex === 0 ? 0 : 1, {
      duration: 350, // 220 → 350 (daha yavaş ve yumuşak)
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94), // Daha doğal easing eğrisi
    });
  }, [activeIndex]);

  const activeTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1],
      theme.name === 'dark' ? ["#FFFFFF", "#8E8E93"] : ["#1D1D1F", "#8E8E93"]
    ),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1.05, 1]) }], // Aktif tab hafif büyüyor
  }));

  const completedTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1],
      theme.name === 'dark' ? ["#8E8E93", "#FFFFFF"] : ["#8E8E93", "#1D1D1F"]
    ),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.05]) }], // Aktif olmayan tab hafif büyüyor
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{
      translateX: interpolate(progress.value, [0, 1], [0, width * 0.5 - 16]) // 20 → 16 (yeni margin)
    }],
  }));

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.name === 'dark' ? '#2C2C2E' : 'rgba(0, 0, 0, 0.08)',
            borderColor: theme.name === 'dark' ? '#636366' : 'rgba(0, 0, 0, 0.04)',
          }
        ]}
      >
        {/* indicator (subtle) */}
        <Animated.View
          style={[
            styles.indicator,
            {
              backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF',
              shadowColor: theme.name === 'dark' ? '#000000' : '#000',
              shadowOpacity: theme.name === 'dark' ? 0.15 : 0.08,
            },
            indicatorStyle,
          ]}
        />
        <TouchableOpacity style={styles.tab} onPress={() => onTabPress(0)} activeOpacity={0.8}>
          <Animated.Text style={[styles.tabText, activeTextStyle]}>{t('myDay')}</Animated.Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tab} onPress={() => onTabPress(1)} activeOpacity={0.8}>
          <Animated.Text style={[styles.tabText, completedTextStyle]}>{t('active')}</Animated.Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16, // 20 → 16 (daha az yatay boşluk)
    marginTop: 3,
    marginBottom: 0,
    paddingHorizontal: 0,
  },
  container: {
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    justifyContent: "space-between",
    paddingHorizontal: 4, // 6 → 4 (daha az iç boşluk)
    elevation: 0,
    overflow: "hidden",
    borderWidth: 0.5,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 12,
  },
  tabText: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: -0.1,
  },
  indicator: {
    position: "absolute",
    left: 4, // 6 → 4 (yeni padding değerine göre)
    top: 6,
    bottom: 6,
    width: (width - 32) / 2 - 8, // Güncel margin (16*2=32) ve padding (4*2=8) değerleri
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
});
