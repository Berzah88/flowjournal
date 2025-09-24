import React, { useEffect, useRef, useMemo, useCallback } from "react";
import { View, Text, StyleSheet, Image, Animated, TouchableWithoutFeedback } from "react-native";
import Svg, { Circle } from "react-native-svg";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import PropTypes from "prop-types";
import { getMilestoneColor } from '../utils/milestoneColors';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { FONTS, ANIMATION_DURATIONS } from '../constants';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Hex rengi RGB'ye çeviren fonksiyon
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 211, g: 203, b: 227 }; // Varsayılan renk
};

// Renk sistemi artık utils/milestoneColors.js'den yönetiliyor

// Mood tag'lerini render eden fonksiyon - memoized
const MoodTags = React.memo(({ milestone }) => {
  const moodEntries = useMemo(() => {
    if (!milestone.journalEntries || milestone.journalEntries.length === 0) {
      return [];
    }

    // Tüm journal entry'lerden mood tag'lerini al - tarihten bağımsız
    return milestone.journalEntries
      .filter(entry => entry.mood || entry.moodIcon) // Sadece mood'u olan entry'ler
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // En yeni önce (ters sıralama)
      .reverse(); // Sonra tersine çevir ki en eski solda, en yeni sağda olsun
  }, [milestone.journalEntries]);

  // Eğer mood yoksa hiçbir şey gösterme
  if (moodEntries.length === 0) {
    return null;
  }

  return (
    <View style={styles.moodTagsContainer}>
      {moodEntries.map((entry, index) => {
        if (!entry.mood && !entry.moodIcon) return null;
        
        const iconName = entry.moodIcon || entry.mood || 'sentiment-satisfied';
        const backgroundColor = entry.moodColor || '#8E7DBE';
        
        return (
          <View 
            key={`${entry.id}-${index}`}
            style={[
              styles.moodTag, 
              { 
                backgroundColor,
                zIndex: index + 1 // Sağdaki (son eklenen) en yüksek zIndex
              }
            ]}
          >
            <MaterialIcons
              name={iconName}
              size={12}
              color="#333"
            />
          </View>
        );
      })}
    </View>
  );
});

export default function Card({ title, startDate, endDate, completed = false, activeMilestones = [], onMilestonePress }) {
  // Performance monitoring (sadece development'ta)
  usePerformanceMonitor('Card');
  
  // Memoize expensive calculations
  const { totalDays, remainingDays, progress } = useMemo(() => {
    const total = Math.max(
      1,
      (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
    );
    const remaining = Math.max(
      0,
      (new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24)
    );
    const prog = Math.min(1, (total - remaining) / total);
    
    return {
      totalDays: total,
      remainingDays: remaining,
      progress: prog
    };
  }, [startDate, endDate]);

  // Memoize circle calculations
  const { radius, strokeWidth, center, circumference } = useMemo(() => {
    const r = 28;
    const sw = 8;
    const c = r + sw;
    const circ = 2 * Math.PI * r;
    
    return {
      radius: r,
      strokeWidth: sw,
      center: c,
      circumference: circ
    };
  }, []);

  const animatedValue = useRef(new Animated.Value(0)).current;

  // Memoized milestone press handler
  const handleMilestonePress = useCallback((milestone) => {
    onMilestonePress?.(milestone);
  }, [onMilestonePress]);

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: ANIMATION_DURATIONS.VERY_SLOW,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      animatedValue.stopAnimation();
    };
  }, []);

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
          style={{ transform: [{ rotate: "-90deg" }, { translateY: -12 }, { translateX: 15 }] }}
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
            <TouchableWithoutFeedback 
              key={ms.id} 
              onPress={() => handleMilestonePress(ms)}
              accessible={true}
              accessibilityLabel={`${ms.title || "Untitled"} milestone`}
              accessibilityRole="button"
            >
              <View style={[
                styles.milestoneItem, 
                styles.milestoneItemClickable, // Hem active hem completed için clickable
                { 
                  backgroundColor: getMilestoneColor(ms) + (completed ? "80" : "B3") // Completed: 0.5 opacity (80), Active: 0.7 opacity (B3)
                }
              ]}>
                <Image source={require("../assets/AddMileStone.png")} style={styles.addIcon} />
                <View style={styles.milestoneContent}>
                  <Text style={[styles.milestoneText, completed ? styles.completedDaysText : {}]}>
                    {ms.title || "Untitled"}
                  </Text>
                  <MoodTags milestone={ms} />
                </View>
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
    padding: 16,
    marginBottom: 16,
    borderRadius: 24,
    width: "100%",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  completedCard: {
    backgroundColor: "#2c3e50",
    borderRadius: 24,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  title: {
    fontSize: 22,
    fontFamily: FONTS.BOLD,
    letterSpacing: -0.2,
    marginBottom: 8,
    color: "#2c3e50",
    lineHeight: 28,
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
    fontFamily: FONTS.MEDIUM,
    color: "#7f8c8d",
    fontSize: 14,
    letterSpacing: -0.2,
  },
  completedDaysText: {
    color: "#fff",
  },
  icon: { width: 24, height: 24, marginRight: 8 },

  milestoneList: {
    marginTop: 4,
    paddingTop: 0,
  },
  milestoneItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 0,
    width: "90%"
  },
  milestoneItemClickable: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 6,
    minHeight: 50,
    justifyContent: 'flex-start',
  },
  milestoneContent: {
    flex: 1,
    flexDirection: "column",
  },
  moodTagsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    flexWrap: "wrap",
  },
  moodTag: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: -3,
    marginBottom: 2,
    minWidth: 20,
    minHeight: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    zIndex: 1,
  },
  addIcon: {
    width: 18,
    height: 18,
    marginRight: 6,
  },
  milestoneText: {
    fontFamily: FONTS.MEDIUM,
    fontSize: 13,
    color: "#5a6c7d",
    lineHeight: 18,
    letterSpacing: -0.2,
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
  onMilestonePress: PropTypes.func,
};

Card.defaultProps = {
  completed: false,
  activeMilestones: [],
};
