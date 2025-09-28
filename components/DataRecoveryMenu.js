// components/DataRecoveryMenu.js
import React, { useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";

export default function DataRecoveryMenu({ 
  visible, 
  onClose, 
  onRecoverData, 
  onCreateBackup,
  onViewCompleted 
}) {
  // Smooth animasyon değerleri
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-20);

  // Menu açılma/kapanma animasyonu
  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, {
        damping: 25,
        stiffness: 300,
        mass: 0.5,
      });
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, {
        damping: 25,
        stiffness: 300,
      });
    } else {
      scale.value = withTiming(0, { duration: 150 });
      opacity.value = withTiming(0, { duration: 150 });
      translateY.value = withTiming(-20, { duration: 150 });
    }
  }, [visible]);

  // Animasyonlu style'lar
  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value }
    ],
    opacity: opacity.value,
  }));

  // Memoized handlers to prevent unnecessary re-renders
  const handleRecoverData = useCallback(() => {
    onRecoverData?.();
    onClose?.();
  }, [onRecoverData, onClose]);

  const handleCreateBackup = useCallback(() => {
    onCreateBackup?.();
    onClose?.();
  }, [onCreateBackup, onClose]);

  const handleViewCompleted = useCallback(() => {
    onViewCompleted?.();
    onClose?.();
  }, [onViewCompleted, onClose]);

  if (!visible) return null;

  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, animatedContainerStyle]}>
          {/* View Completed Projects */}
          <TouchableOpacity
            style={styles.item}
            onPress={handleViewCompleted}
            accessible={true}
            accessibilityLabel="View completed projects"
            accessibilityRole="button"
          >
            <View style={styles.itemContent}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFA726" />
              <Text style={styles.itemText}>Completed Projects</Text>
            </View>
          </TouchableOpacity>

          {/* Create Backup */}
          <TouchableOpacity
            style={styles.item}
            onPress={handleCreateBackup}
            accessible={true}
            accessibilityLabel="Create manual backup"
            accessibilityRole="button"
          >
            <View style={styles.itemContent}>
              <Ionicons name="save-outline" size={20} color="#4ECDC4" />
              <Text style={[styles.itemText, styles.backupText]}>Create Backup</Text>
            </View>
          </TouchableOpacity>

          {/* Recover Data */}
          <TouchableOpacity
            style={styles.item}
            onPress={handleRecoverData}
            accessible={true}
            accessibilityLabel="Recover lost data"
            accessibilityRole="button"
          >
            <View style={styles.itemContent}>
              <Ionicons name="refresh-outline" size={20} color="#FF6B6B" />
              <Text style={[styles.itemText, styles.recoveryText]}>Recover Data</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 1000,
  },
  container: {
    position: "absolute",
    top: 40,
    right: 18,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    backdropFilter: "blur(20px)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  item: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemText: {
    fontSize: 16,
    color: "#2c3e50",
    fontFamily: "Poppins_600SemiBold",
    marginLeft: 12,
  },
  recoveryText: { 
    color: "#FF6B6B" 
  },
  backupText: { 
    color: "#4ECDC4" 
  },
});
