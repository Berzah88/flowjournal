// components/MilestoneCalendarTabs.js
import React, { useEffect, useRef } from "react";
import { View, Animated, TouchableOpacity, StyleSheet, Text, Dimensions } from "react-native";
const { width } = Dimensions.get("window");

export default function MilestoneCalendarTabs({ activeIndex = 0, onTabPress = () => {} }) {
  // progress: 0 => Milestones selected, 1 => Calendar selected
  const progress = useRef(new Animated.Value(activeIndex === 0 ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: activeIndex === 0 ? 0 : 1,
      duration: 200,
      useNativeDriver: false, // color interpolation doesn't support native driver
    }).start();
  }, [activeIndex]);

  // interpolate colors (safe) — outputRange are hex strings
  const milestonesColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["#222222", "#FFFFFF"],
  });
  const calendarColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["#FFFFFF", "#222222"],
  });

  // optional: small background slide indicator
  const indicatorTranslate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.5 - 20], // shift indicator half width minus some padding
  });

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {/* indicator (subtle) */}
        <Animated.View
          style={[
            styles.indicator,
            {
              transform: [{ translateX: indicatorTranslate }],
            },
          ]}
        />
        <TouchableOpacity style={styles.tab} onPress={() => onTabPress(0)} activeOpacity={0.8}>
          <Animated.Text style={[styles.tabText, { color: milestonesColor }]}>Milestones</Animated.Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tab} onPress={() => onTabPress(1)} activeOpacity={0.8}>
          <Animated.Text style={[styles.tabText, { color: calendarColor }]}>Calendar</Animated.Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 15,
  },
  container: {
    backgroundColor: "#D6D6D6",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    height: 42,
    justifyContent: "space-between",
    paddingHorizontal: 10,
    elevation: 4,
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  tabText: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
  },
  indicator: {
    position: "absolute",
    left: 8,
    top: 6,
    bottom: 6,
    width: (width - 40) / 2 - 16, // half minus paddings
    borderRadius: 10,
  },
});

