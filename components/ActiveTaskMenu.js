// components/ActiveTaskMenu.js
import React, { useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from '../context/ThemeContext';

export default function ActiveTaskMenu({ visible, onClose, onToggleComplete, onDelete, onEdit, isCompleted }) {
  const { theme } = useTheme();
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
  const handleEdit = useCallback(() => {
    onEdit?.();
    onClose?.();
  }, [onEdit, onClose]);

  const handleToggleComplete = useCallback(() => {
    onToggleComplete?.();
    onClose?.();
  }, [onToggleComplete, onClose]);

  const handleDelete = useCallback(() => {
    onDelete?.();
    onClose?.();
  }, [onDelete, onClose]);

  if (!visible) return null;

  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[
          styles.container, 
          {
            backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF',
            borderColor: theme.name === 'dark' ? '#000000' : 'rgba(0, 0, 0, 0.1)',
            shadowColor: theme.name === 'dark' ? '#000000' : '#000',
            shadowOpacity: theme.name === 'dark' ? 0.3 : 0.1,
            shadowRadius: theme.name === 'dark' ? 12 : 8,
            elevation: theme.name === 'dark' ? 8 : 4,
          },
          animatedContainerStyle
        ]}>
          {/* Edit */}
          <TouchableOpacity
            style={styles.item}
            onPress={handleEdit}
            accessible={true}
            accessibilityLabel="Edit project"
            accessibilityRole="button"
          >
            <View style={styles.itemContent}>
              <Ionicons 
                name="create-outline" 
                size={20} 
                color={theme.name === 'dark' ? '#FF6B6B' : '#4A90E2'} 
              />
              <Text style={[
                styles.itemText,
                { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
              ]}>Edit</Text>
            </View>
          </TouchableOpacity>

          {/* Complete / Uncomplete */}
          <TouchableOpacity
            style={styles.item}
            onPress={handleToggleComplete}
            accessible={true}
            accessibilityLabel={isCompleted ? "Mark as incomplete" : "Mark as complete"}
            accessibilityRole="button"
          >
            <View style={styles.itemContent}>
              <Ionicons 
                name={isCompleted ? "close-circle-outline" : "checkmark-circle-outline"} 
                size={20} 
                color={isCompleted ? "#FF6B6B" : (theme.name === 'dark' ? '#34C759' : '#4ECDC4')} 
              />
              <Text style={[
                styles.itemText, 
                { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' },
                isCompleted && styles.uncompleteText
              ]}>
                {isCompleted ? "Mark as Incomplete" : "Complete"}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Delete */}
          <TouchableOpacity
            style={styles.item}
            onPress={handleDelete}
            accessible={true}
            accessibilityLabel="Delete project"
            accessibilityRole="button"
          >
            <View style={styles.itemContent}>
              <Ionicons 
                name="trash-outline" 
                size={20} 
                color={theme.name === 'dark' ? '#FF4444' : '#E74C3C'} 
              />
              <Text style={[
                styles.itemText, 
                { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' },
                styles.deleteText
              ]}>Delete</Text>
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
    top: 20,
    right: 18,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 200,
    shadowOffset: { width: 0, height: 8 },
    backdropFilter: "blur(20px)",
    borderWidth: 1,
  },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    marginLeft: 12,
  },
  deleteText: { },
  uncompleteText: { },
});
