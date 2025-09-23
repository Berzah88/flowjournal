import React, { useState, useRef, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  BackHandler,
  TouchableWithoutFeedback,
} from "react-native";
import { TaskContext } from "../context/TaskContext";
import FlashCalendar from "../components/FlashCalendar";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

export default function AddProjectScreen({ visible, onClose }) {
  const { addTask } = useContext(TaskContext);
  const [newTitle, setNewTitle] = useState("");
  const [endDate, setEndDate] = useState(new Date());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const inputRef = useRef(null);

  const baseY = useSharedValue(400);
  const opacity = useSharedValue(0);

  // Android back button handler
  useEffect(() => {
    if (!visible) return;
    const backAction = () => {
      handleCloseModal();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => sub.remove();
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setCalendarVisible(false);
      setNewTitle("");
      setEndDate(new Date());

      baseY.value = withTiming(0, { duration: 350 });
      opacity.value = withTiming(1, { duration: 350 });

      const timeout = setTimeout(() => {
        inputRef.current?.focus();
        setTimeout(() => inputRef.current?.focus(), 60);
      }, 250);

      return () => clearTimeout(timeout);
    }
  }, [visible]);

  const handleCloseModal = () => {
    baseY.value = withTiming(400, { duration: 350 });
    opacity.value = withTiming(0, { duration: 350 }, (finished) => {
      if (finished && onClose) runOnJS(onClose)();
    });
  };

  const handleCalendarConfirm = ({ startDate: sISO, endDate: eISO }) => {
    const s = new Date(sISO);
    const e = new Date(eISO);
    if (newTitle.trim() !== "") {
      addTask({
        title: newTitle.trim(),
        startDate: s.toISOString(),
        endDate: e.toISOString(),
        category: "",
        done: false,
        milestones: [],
      });
    }
    handleCloseModal();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: baseY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.modalOverlay, animatedStyle]}>
      <TouchableWithoutFeedback onPress={handleCloseModal}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalContent}>
                <TextInput
                  ref={inputRef}
                  style={styles.inputOverlay}
                  value={newTitle}
                  placeholder="Enter project title"
                  onChangeText={setNewTitle}
                  onSubmitEditing={() => {
                    if (newTitle.trim() !== "") setCalendarVisible(true);
                    else Keyboard.dismiss();
                  }}
                  returnKeyType="done"
                  autoFocus
                />

                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    { backgroundColor: newTitle.trim() ? "#4A90E2" : "#888" },
                  ]}
                  disabled={!newTitle.trim()}
                  onPress={() => setCalendarVisible(true)}
                >
                  <Text style={styles.dateButtonText}>Add Date</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>

      <FlashCalendar
        visible={calendarVisible}
        initialStart={new Date()}
        initialEnd={endDate}
        onConfirm={handleCalendarConfirm}
        onCancel={() => setCalendarVisible(false)}
        minDate={new Date()}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.0)",
  },
  modalContent: {
    marginTop: 25,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    width: 340,
    elevation:20,
  },
  inputOverlay: {
    width: "100%",
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    color: "#525252",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    marginVertical: 15,
    paddingVertical: 6,
  },
  dateButton: {
    paddingVertical: 15,
    marginVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignItems: "center",
  },
  dateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
