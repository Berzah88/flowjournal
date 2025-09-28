import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Dimensions, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get("window");

export default function StatusBarComponent({ activeCount, doneCount }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const activeCountAnim = useRef(new Animated.Value(0)).current;
  const doneCountAnim = useRef(new Animated.Value(0)).current;

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

    // Count animations
    Animated.timing(activeCountAnim, {
      toValue: activeCount,
      duration: 800,
      useNativeDriver: false,
    }).start();

    Animated.timing(doneCountAnim, {
      toValue: doneCount,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [activeCount, doneCount]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.95)', 'rgba(248, 251, 255, 0.9)']}
        style={styles.statusCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Active Projects */}
        <View style={styles.statusItem}>
          <View style={[styles.statusIconContainer, styles.activeIconContainer]}>
            <Ionicons name="play-circle" size={18} color="#007AFF" />
          </View>
          <View style={styles.statusInfo}>
            <Animated.Text style={[styles.statusNumber, { 
              transform: [{ scale: activeCountAnim.interpolate({
                inputRange: [0, activeCount],
                outputRange: [0.8, 1],
                extrapolate: 'clamp',
              })}]
            }]}>
              {activeCount}
            </Animated.Text>
            <Text style={styles.statusLabel}>Active</Text>
          </View>
        </View>

        {/* Modern Divider */}
        <View style={styles.divider} />

        {/* Completed Projects */}
        <View style={styles.statusItem}>
          <View style={[styles.statusIconContainer, styles.completedIconContainer]}>
            <Ionicons name="checkmark-circle" size={18} color="#34C759" />
          </View>
          <View style={styles.statusInfo}>
            <Animated.Text style={[styles.statusNumber, { 
              transform: [{ scale: doneCountAnim.interpolate({
                inputRange: [0, doneCount],
                outputRange: [0.8, 1],
                extrapolate: 'clamp',
              })}]
            }]}>
              {doneCount}
            </Animated.Text>
            <Text style={styles.statusLabel}>Done</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
  },
  statusCard: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  statusIconContainer: {
    marginRight: 8,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  activeIconContainer: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  completedIconContainer: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  statusInfo: {
    alignItems: 'flex-start',
  },
  statusNumber: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1D1D1F',
    marginBottom: 1,
    letterSpacing: -0.2,
  },
  statusLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#8E8E93',
    letterSpacing: -0.1,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    marginHorizontal: 16,
    borderRadius: 0.5,
  },
});
