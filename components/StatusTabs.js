// components/StatusTabs.js
import React, { useEffect } from "react";
import { View, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import Animated, { useSharedValue, withTiming, useAnimatedStyle, interpolate, interpolateColor, Easing } from "react-native-reanimated";
const { width } = Dimensions.get("window");
// Use the same horizontal padding as main content (24px each side)
// so the tabs have the same horizontal width as other My Day components.
const TAB_MAX_WIDTH = width - 48;

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
    transform: [
      {
        // translate by one tab-area (innerWidth/2)
        translateX: interpolate(progress.value, [0, 1], [0, (TAB_MAX_WIDTH - 3 * 2) * 0.5])
      }
    ],
  }));

  // Layout maths for precise symmetric indicator placement
  const PADDING = 3; // matches container.paddingHorizontal
  // Make horizontal inner margin match vertical gap (top/bottom = 6)
  const INDICATOR_MARGIN = 6; // inner margin inside each tab area
  const innerWidth = TAB_MAX_WIDTH - PADDING * 2;
  const tabArea = innerWidth / 2;
  const indicatorWidth = Math.max(20, tabArea - INDICATOR_MARGIN * 2);
  const indicatorLeft = PADDING + INDICATOR_MARGIN;

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View
        style={[
          styles.container,
          {
            // Use app palette gray for a softer, palette-aligned background in light theme
            backgroundColor: theme.name === 'dark' ? '#2C2C2E' : (theme.colors?.gray?.[200] || '#E5E7EB'),
            borderColor: theme.name === 'dark' ? '#636366' : (theme.colors?.border || 'rgba(0, 0, 0, 0.04)'),
          }
        ]}
      >
        {/* indicator (subtle) */}
        <Animated.View
          style={[
            styles.indicator,
            {
              left: indicatorLeft,
              width: indicatorWidth,
              // New indicator colors: white fill with subtle border to stand out on the soft background
              backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF',
              borderWidth: theme.name === 'dark' ? 0 : 0.6,
              borderColor: theme.name === 'dark' ? 'transparent' : 'rgba(14,20,30,0.06)',
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
    marginHorizontal: 24, // match main content horizontal padding
    marginTop: -8, // lift tabs up slightly to reduce gap with MoodStatement
    marginBottom: 0,
    paddingHorizontal: 0,
  },
  container: {
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    justifyContent: "space-between",
    paddingHorizontal: 3, // more compact
    elevation: 0,
    overflow: "hidden",
    borderWidth: 0.5,
  maxWidth: TAB_MAX_WIDTH,
  alignSelf: 'center',
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: -0.1,
  },
  indicator: {
    position: "absolute",
  left: 3,
  // slightly increased top/bottom to make the pill a bit shorter vertically
  top: 6,
  bottom: 6,
  width: (TAB_MAX_WIDTH) / 2 - 6, // use compact tab width
  borderRadius: 10,
    // subtle shadow like ActiveProject
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    shadowOpacity: 0.08,
    elevation: 2,
  },
});
