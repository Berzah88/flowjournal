import React, { useEffect, useRef, useMemo, useCallback, memo } from "react";
import { View, Text, StyleSheet, Image, Animated, Pressable } from "react-native";
import Svg, { Circle } from "react-native-svg";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Ionicons from "@expo/vector-icons/Ionicons";
import PropTypes from "prop-types";
import { getMilestoneColor, getMilestoneCardColor } from '../utils/milestoneColors';
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

// Mood tag'lerini render eden fonksiyon - basit ve temiz
const MoodTags = memo(({ milestone }) => {
  const recentMoods = useMemo(() => {
    if (!milestone.journalEntries || milestone.journalEntries.length === 0) {
      return [];
    }

    // Son 3 mood'u al (en yeni önce)
    return milestone.journalEntries
      ?.slice()
      ?.sort((a, b) => b.id - a.id) // En yeni entry'ler önce
      ?.filter(entry => entry.mood || entry.moodIcon || entry.moodColor) // Sadece mood'u olan entry'ler
      ?.slice(0, 3); // En fazla 3 mood göster
  }, [milestone.journalEntries]);

  // Eğer mood yoksa hiçbir şey gösterme
  if (recentMoods.length === 0) {
    return null;
  }

  return (
    <View style={styles.moodTagsContainer}>
      {recentMoods.map((entry, index) => {
        if (!entry.mood && !entry.moodIcon && !entry.moodColor) return null;
        
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

const Card = memo(function Card({ title, startDate, endDate, completed = false, activeMilestones = [], onMilestonePress, onPress }) {
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
    <Pressable
      style={({ pressed }) => [
        cardStyle,
        {
          transform: [{ scale: pressed ? 0.98 : 1 }],
          shadowOpacity: pressed ? 0.2 : 0.1,
          elevation: pressed ? 6 : 4,
        }
      ]}
      onPress={onPress}
    >
      <Text style={titleStyle}>{title}</Text>

      <View style={styles.bottomRow}>
        <View style={styles.daysLeft}>
          <MaterialIcons name="schedule" size={18} color="#007AFF" />
          <Text style={[daysLeftTextStyle, { marginLeft: 6 }]}>{Math.ceil(remainingDays)} days left</Text>
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
            stroke={completed ? "#555" : "#D0D0D0"}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={completed ? "#FFD700" : "#007AFF"}
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
          {activeMilestones.map((ms, index) => (
            <View key={ms.id}>
              <Pressable 
                onPress={() => handleMilestonePress(ms)}
                accessible={true}
                accessibilityLabel={`${ms.title || "Untitled"} milestone`}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.milestoneItemClickable,
                  { 
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                  }
                ]}
              >
                <View style={styles.iconContainer}>
                  <Ionicons 
                    name="ellipse" 
                    size={18} 
                    color={getMilestoneColor(ms)} 
                  />
                </View>
                <View style={styles.milestoneContent}>
                  <Text style={[styles.milestoneText, completed ? styles.completedDaysText : {}]}>
                    {ms.title || "Untitled"}
                  </Text>
                  <MoodTags milestone={ms} />
                </View>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}, (prevProps, nextProps) => {
  // Smart comparison function - only re-render when necessary
  // Check basic props first (fastest)
  if (prevProps.title !== nextProps.title ||
      prevProps.startDate !== nextProps.startDate ||
      prevProps.endDate !== nextProps.endDate ||
      prevProps.completed !== nextProps.completed) {
    return false; // Re-render needed
  }
  
  // Check milestones length (fast)
  const prevMilestones = prevProps.activeMilestones || [];
  const nextMilestones = nextProps.activeMilestones || [];
  
  if (prevMilestones.length !== nextMilestones.length) {
    return false; // Re-render needed
  }
  
  // Check milestones content (only if length matches)
  for (let i = 0; i < prevMilestones.length; i++) {
    const prev = prevMilestones[i];
    const next = nextMilestones[i];
    
    if (!prev || !next) return false;
    
    // Check basic milestone properties
    if (prev.id !== next.id ||
        prev.title !== next.title ||
        prev.completed !== next.completed) {
      return false; // Re-render needed
    }
    
    // Check journal entries length
    const prevEntries = prev.journalEntries || [];
    const nextEntries = next.journalEntries || [];
    
    if (prevEntries.length !== nextEntries.length) {
      return false; // Re-render needed
    }
    
    // Check journal entries content (only if length matches)
    for (let j = 0; j < prevEntries.length; j++) {
      const prevEntry = prevEntries[j];
      const nextEntry = nextEntries[j];
      
      if (!prevEntry || !nextEntry) return false;
      
      // Check mood-related properties
      if (prevEntry.id !== nextEntry.id ||
          prevEntry.mood !== nextEntry.mood ||
          prevEntry.moodIcon !== nextEntry.moodIcon ||
          prevEntry.moodColor !== nextEntry.moodColor ||
          prevEntry.createdAt !== nextEntry.createdAt) {
        return false; // Re-render needed
      }
    }
  }
  
  return true; // No re-render needed
});

export default Card;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF", // Temiz beyaz arka plan
    padding: 24, // Daha geniş padding
    marginBottom: 20,
    borderRadius: 20,
    width: "100%",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderWidth: 0.5,
    borderColor: "rgba(0, 0, 0, 0.04)",
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
    fontSize: 20,
    fontFamily: FONTS.BOLD,
    letterSpacing: -0.3,
    marginBottom: 16,
    color: "#1D1D1F", // Apple'ın kullandığı koyu gri
    lineHeight: 26,
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
    marginTop: -8,
  },
  daysLeftText: {
    fontFamily: FONTS.MEDIUM,
    color: "#007AFF", // Apple'ın mavi rengi
    fontSize: 15,
    letterSpacing: -0.1,
  },
  completedDaysText: {
    color: "#fff",
  },

  milestoneList: {
    marginTop: 4,
    paddingTop: 0,
  },
  milestoneItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 0,
  },
  milestoneItemClickable: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    minHeight: 48,
    justifyContent: 'flex-start',
    backgroundColor: "rgba(0, 122, 255, 0.04)", // Çok hafif mavi arka plan
  },
  iconContainer: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  milestoneContent: {
    flex: 1,
    flexDirection: "column",
    marginLeft: 8,
  },
  moodContainer: {
    marginTop: 4,
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
  milestoneText: {
    fontFamily: FONTS.MEDIUM,
    fontSize: 14,
    color: "#1D1D1F", // Apple'ın koyu gri rengi
    lineHeight: 20,
    letterSpacing: -0.1,
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
  onPress: PropTypes.func,
};

Card.defaultProps = {
  completed: false,
  activeMilestones: [],
};