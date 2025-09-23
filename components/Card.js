import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Image, Animated, TouchableWithoutFeedback } from "react-native";
import Svg, { Circle } from "react-native-svg";
import PropTypes from "prop-types";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function Card({ title, startDate, endDate, completed = false, activeMilestones = [] }) {
  const totalDays = Math.max(
    1,
    (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
  );
  const remainingDays = Math.max(
    0,
    (new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24)
  );
  const progress = Math.min(1, (totalDays - remainingDays) / totalDays);

  const radius = 28;
  const strokeWidth = 8;
  const center = radius + strokeWidth;
  const circumference = 2 * Math.PI * radius;

  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const cardStyle = [styles.card, completed ? styles.completedCard : {}];
  const titleStyle = [styles.title, completed ? styles.completedTitle : {}];
  const daysLeftTextStyle = [styles.daysLeftText, completed ? styles.completedDaysText : {}];

  return (
    <View style={cardStyle}>
      <Text style={titleStyle}>{title}</Text>

      <View style={styles.bottomRow}>
        <View style={styles.daysLeft}>
          <Image source={require("../assets/hourglass.png")} style={styles.icon} />
          <Text style={daysLeftTextStyle}>{Math.ceil(remainingDays)} days left</Text>
        </View>

        <Svg
          height={radius * 2 + strokeWidth * 2}
          width={radius * 2 + strokeWidth * 2}
          style={{ transform: [{ rotate: "-90deg" }, { translateY: -4 }, { translateX: 15 }] }}
        >
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={completed ? "#555" : "#E6E6E6"}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={completed ? "#FFD700" : "#8E7DBE"}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>
      </View>

      {/* Active Milestones Listesi */}
      {activeMilestones.length > 0 && (
        <View style={styles.milestoneList}>
          {activeMilestones.map((ms) => (
            <TouchableWithoutFeedback key={ms.id} disabled={completed}>
              <View style={styles.milestoneItem}>
                <Image source={require("../assets/AddMileStone.png")} style={styles.addIcon} />
                <Text style={[styles.milestoneText, completed ? styles.completedDaysText : {}]}>
                  {ms.title || "Untitled"}
                </Text>
              </View>
            </TouchableWithoutFeedback>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F5F1F1",
    padding: 15,
    marginBottom: 15,
    borderRadius: 20,
    width: "100%",
  },
  completedCard: {
    backgroundColor: "#111111",
    borderRadius: 25,
  },
  title: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    letterSpacing: -0.1,
    marginBottom: 7,
    color: "#505050",
  },
  completedTitle: {
    color: "#fff",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  daysLeft: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -10,
  },
  daysLeftText: {
    fontFamily: "Poppins_400Regular",
    color: "#777",
    fontSize: 13,
    letterSpacing: -0.3,
  },
  completedDaysText: {
    color: "#fff",
  },
  icon: { width: 24, height: 24, marginRight: 8 },

  milestoneList: {
    marginTop: 10,
  },
  milestoneItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    width: "85%"
  },
  addIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  milestoneText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#777",
  },
});

// PropTypes validation
Card.propTypes = {
  title: PropTypes.string.isRequired,
  startDate: PropTypes.string.isRequired,
  endDate: PropTypes.string.isRequired,
  completed: PropTypes.bool,
  activeMilestones: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      title: PropTypes.string,
      completed: PropTypes.bool,
    })
  ),
};

Card.defaultProps = {
  completed: false,
  activeMilestones: [],
};
