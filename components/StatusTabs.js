// components/StatusTabs.js
import React, { useEffect, useRef } from "react";
import { View, Animated, TouchableOpacity, StyleSheet, Text, Dimensions } from "react-native";
import { useTheme } from "../context/ThemeContext";
const { width } = Dimensions.get("window");

export default function StatusTabs({ activeIndex = 0, onTabPress = () => {} }) {
  const { theme } = useTheme();
  // progress: 0 => Active selected, 1 => Completed selected
  const progress = useRef(new Animated.Value(activeIndex === 0 ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: activeIndex === 0 ? 0 : 1,
      useNativeDriver: false, // color interpolation doesn't support native driver
      tension: 300,
      friction: 30,
    }).start();
  }, [activeIndex]);

  // interpolate colors (safe) — outputRange are hex strings
  const activeColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: theme.name === 'dark' 
      ? ["#FFFFFF", "#8E8E93"] 
      : ["#1D1D1F", "#8E8E93"],
  });
  const completedColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: theme.name === 'dark'
      ? ["#8E8E93", "#FFFFFF"]
      : ["#8E8E93", "#1D1D1F"],
  });

  // optional: small background slide indicator
  const indicatorTranslate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.5 - 20], // shift indicator half width minus some padding
  });

  return (
    <View style={styles.wrapper}>
      <View style={[
        styles.container,
        {
          backgroundColor: theme.name === 'dark' ? '#2C2C2E' : 'rgba(0, 0, 0, 0.08)',
          borderColor: theme.name === 'dark' ? '#636366' : 'rgba(0, 0, 0, 0.04)',
        }
      ]}>
        {/* indicator (subtle) */}
        <Animated.View
          style={[
            styles.indicator,
            {
              backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF',
              shadowColor: theme.name === 'dark' ? '#000000' : '#000',
              shadowOpacity: theme.name === 'dark' ? 0.2 : 0.1,
              transform: [{ translateX: indicatorTranslate }],
            },
          ]}
        />
        <TouchableOpacity style={styles.tab} onPress={() => onTabPress(0)} activeOpacity={0.8}>
          <Animated.Text style={[styles.tabText, { color: activeColor }]}>My Day</Animated.Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tab} onPress={() => onTabPress(1)} activeOpacity={0.8}>
          <Animated.Text style={[styles.tabText, { color: completedColor }]}>Active Projects</Animated.Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 20,
    marginTop: 20, // Status Tabs margin top - 50'den 20'ye düşürdüm
    marginBottom: 0,
    paddingHorizontal: 0,
  },
  container: {
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    justifyContent: "space-between",
    paddingHorizontal: 6,
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
    left: 6,
    top: 6,
    bottom: 6,
    width: (width - 40) / 2 - 12, // half minus paddings
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
});
