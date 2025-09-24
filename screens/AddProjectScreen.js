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
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";


export default function AddProjectScreen({ visible, onClose }) {
  const { addTask } = useContext(TaskContext);
  const [newTitle, setNewTitle] = useState("");
  const [endDate, setEndDate] = useState(new Date());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const inputRef = useRef(null);

  // Apple-style animation values
  const translateY = useSharedValue(300);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);


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

      // Apple-style entrance animation
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
        mass: 0.8,
      });
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 200,
        mass: 0.5,
      });

      const timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 200);

      return () => clearTimeout(timeout);
    } else {
      // Reset animation values when not visible
      translateY.value = 300;
      opacity.value = 0;
      scale.value = 0.95;
    }
  }, [visible]);

  const handleCloseModal = () => {
    // Apple-style exit animation
    translateY.value = withSpring(300, {
      damping: 20,
      stiffness: 300,
      mass: 0.8,
    });
    opacity.value = withTiming(0, { duration: 250 });
    scale.value = withSpring(0.95, {
      damping: 15,
      stiffness: 200,
      mass: 0.5,
    }, (finished) => {
      if (finished && onClose) {
        runOnJS(onClose)();
      }
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

  // Apple-style animated style
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value }
    ],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <TouchableWithoutFeedback onPress={handleCloseModal}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <Animated.View style={[styles.modalContent, animatedStyle]}>
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
              </Animated.View>
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
    </View>
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
    marginBottom: 20,
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
    fontFamily: "Poppins_700Bold",
  },
});
