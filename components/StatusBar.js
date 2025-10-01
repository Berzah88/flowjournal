import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Dimensions, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get("window");

export default function StatusBarComponent({ activeCount, doneCount }) {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const activeCountAnim = useRef(new Animated.Value(0)).current;
  const doneCountAnim = useRef(new Animated.Value(0)).current;

  // Safe input ranges to prevent interpolation errors
  const activeInputRange = activeCount > 0 ? [0, activeCount] : [0, 1];
  const doneInputRange = doneCount > 0 ? [0, doneCount] : [0, 1];

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Count animations - only animate if count > 0
    if (activeCount > 0) {
      Animated.timing(activeCountAnim, {
        toValue: activeCount,
        duration: 800,
        useNativeDriver: false,
      }).start();
    }

    if (doneCount > 0) {
      Animated.timing(doneCountAnim, {
        toValue: doneCount,
        duration: 800,
        useNativeDriver: false,
      }).start();
    }
  }, [activeCount, doneCount]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <View style={[
        styles.statusCard,
        {
          backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(248, 249, 250, 0.5)',
          borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.01)',
        }
      ]}>
        {/* Active Projects */}
        <View style={styles.statusItem}>
          <Ionicons 
            name="play-circle" 
            size={16} 
            color={theme.name === 'dark' ? '#FF6B6B' : '#007AFF'} 
          />
          <Animated.Text style={[
            styles.statusNumber, 
            { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' },
            { 
              transform: [{ scale: activeCount > 0 ? activeCountAnim.interpolate({
                inputRange: activeInputRange,
                outputRange: [0.9, 1],
                extrapolate: 'clamp',
              }) : 1 }]
            }
          ]}>
            {activeCount}
          </Animated.Text>
          <Text style={[
            styles.statusLabel,
            { color: theme.name === 'dark' ? '#8E8E93' : '#8E8E93' }
          ]}>Active</Text>
        </View>

        {/* Minimal Divider */}
        <View style={[
          styles.divider,
          { backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)' }
        ]} />

        {/* Completed Projects */}
        <View style={styles.statusItem}>
          <Ionicons 
            name="checkmark-circle" 
            size={16} 
            color={theme.name === 'dark' ? '#34C759' : '#34C759'} 
          />
          <Animated.Text style={[
            styles.statusNumber, 
            { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' },
            { 
              transform: [{ scale: doneCount > 0 ? doneCountAnim.interpolate({
                inputRange: doneInputRange,
                outputRange: [0.9, 1],
                extrapolate: 'clamp',
              }) : 1 }]
            }
          ]}>
            {doneCount}
          </Animated.Text>
          <Text style={[
            styles.statusLabel,
            { color: theme.name === 'dark' ? '#8E8E93' : '#8E8E93' }
          ]}>Done</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 4,
  },
  statusCard: {
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 0.1,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  statusNumber: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: -0.2,
  },
  statusLabel: {
    fontSize: 9,
    fontFamily: 'Poppins_400Regular',
    letterSpacing: -0.1,
  },
  divider: {
    width: 1,
    height: 14,
    marginHorizontal: 8,
    borderRadius: 0.5,
  },
});
