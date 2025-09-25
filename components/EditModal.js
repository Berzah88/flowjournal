import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import FlashCalendar from "../components/FlashCalendar";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { usePerformanceMonitor } from "../hooks/usePerformanceMonitor";
import { useModalAnimation, usePanGesture } from "../hooks/useAnimations";
import { MODAL_SIZES, SWIPE_THRESHOLDS, ANIMATION_DURATIONS } from "../constants";

const { height } = Dimensions.get("window");
const modalHeight = height * 0.90;

export default function EditModal({ visible, onClose, project, onSave }) {
  // Performance monitoring (sadece development'ta)
  usePerformanceMonitor('EditModal');
  
  const [title, setTitle] = useState(project?.title || "");
  const [startDate, setStartDate] = useState(
    project?.startDate ? new Date(project.startDate) : new Date()
  );
  const [endDate, setEndDate] = useState(
    project?.endDate ? new Date(project.endDate) : new Date()
  );
  const [calendarVisible, setCalendarVisible] = useState(false);

  const inputRef = useRef(null);

  // Animasyon değerleri using custom hook
  const { translateY, opacity, scale, closeModal } = useModalAnimation(visible, onClose);
  const { dragY, handlePanEnd, resetDrag } = usePanGesture(closeModal, SWIPE_THRESHOLDS.CLOSE);

  // Focus input when modal opens - iOS tarzı timing
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 450); // Biraz daha geç focus için
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // Project değişirse state güncelle
  useEffect(() => {
    setTitle(project?.title || "");
    setStartDate(
      project?.startDate ? new Date(project.startDate) : new Date()
    );
    setEndDate(project?.endDate ? new Date(project.endDate) : new Date());
  }, [project]);

  // Cleanup animations on unmount - handled by hooks

  const handleCalendarConfirm = useCallback(({ startDate: sISO, endDate: eISO }) => {
    let s = new Date(sISO);
    let e = new Date(eISO);
    if (s > e) [s, e] = [e, s];
    setStartDate(s);
    setEndDate(e);
    setCalendarVisible(false);
  }, []);

  const handleSave = useCallback(() => {
    onSave &&
      onSave({
        ...project,
        title: title.trim() || project?.title || "",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
    onClose && onClose();
  }, [onSave, onClose, project, title, startDate, endDate]);

  const handleClose = useCallback(() => {
    closeModal();
  }, [closeModal]);

  const panGesture = useMemo(() => Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) dragY.value = e.translationY;
    })
    .onEnd((e) => {
      handlePanEnd(e.translationY);
    }), [dragY, handlePanEnd]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value + dragY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.container, animatedStyle]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <Text style={styles.header}>Edit Project</Text>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Project Title"
              value={title}
              onChangeText={setTitle}
              selectTextOnFocus
            />
            <TouchableOpacity
              style={styles.dateSelector}
              onPress={() => setCalendarVisible(true)}
            >
              <Ionicons name="calendar-outline" size={22} color="#6C63FF" />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.dateLabel}>Project Duration</Text>
                <Text style={styles.dateValue}>
                  {startDate.toDateString()} → {endDate.toDateString()}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.btn, styles.cancel]}
                onPress={handleClose}
              >
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.save]}
                onPress={handleSave}
              >
                <Text style={[styles.btnText, { color: "#fff" }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </GestureDetector>
      <FlashCalendar
        visible={calendarVisible}
        initialStart={startDate}
        initialEnd={endDate}
        onConfirm={handleCalendarConfirm}
        onCancel={() => setCalendarVisible(false)}
        minDate={undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 20,
    backgroundColor: "rgba(0,0,0,0.0)",
    justifyContent: "flex-end",
  },
  container: {
    height: modalHeight,
    backgroundColor: "#FFFFFF",
    padding: 30,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: "100%",
    elevation: 20,
  },
  header: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 25,
    color: "#545454",
    padding: 10,
  },
  input: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#ccc",
    paddingVertical: 8,
    fontSize: 22,
    marginBottom: 25,
    marginTop: 10,
    fontFamily: "Poppins_600SemiBold",
    color: "#333",
  },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    backgroundColor: "#F5F1F1",
    marginBottom: 25,
  },
  dateLabel: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#777",
  },
  dateValue: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    color: "#545454",
    marginTop: 2,
  },
  btnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 0,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
    marginLeft: 10,
  },
  cancel: {
    backgroundColor: "#eee",
  },
  save: {
    backgroundColor: "#6C63FF",
  },
  btnText: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
  },
});