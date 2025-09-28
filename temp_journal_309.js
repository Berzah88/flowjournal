// screens/Journal.js
import React, { useEffect, useRef, useState, useContext, useCallback } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  TextInput,
  Keyboard,
  Text,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  interpolate,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { TaskContext } from "../context/TaskContext";

const { width, height } = Dimensions.get("window");

const TOP_GAP = 20;
const SWIPE_AREA = 40;
const CLOSE_THRESHOLD = 110;
const MODAL_HEIGHT = height - TOP_GAP;
const PREVIEW_HEIGHT = 150;
const MAX_ITEMS = 4;

const MOODS = [
  {
    key: "happy",
    label: "Happy",
    icon: "sentiment-satisfied",
    color: "#C8E6C9", // pastel green
  },
  {
    key: "calm",
    label: "Calm",
    icon: "self-improvement", // best available material-like calm icon
    color: "#D1C4E9", // pastel purple
  },
  {
    key: "angry",
    label: "Angry",
    icon: "sentiment-very-dissatisfied",
    color: "#FFCDD2", // pastel red
  },
  {
    key: "Natural",
    label: "Natural",
    icon: "sentiment-dissatisfied",
    color: "#CFD8DC", // pastel grey
  },
  {
    key: "sick",
    label: "Sick",
    icon: "sick", // MaterialIcons 'sick' exists in some sets; if not, fallback mapping handled below
    color: "#FFF9C4", // pastel yellow
  },
];

// helper to find Material icon fallback compatibility
const getValidIconName = (name) => {
  // Some icon names used above may not exist on all sets; fallback map:
  const fallback = {
    "sick": "sick", // attempt - on some expo versions it exists
    "self-improvement": "self-improvement",
  };
  return fallback[name] ? fallback[name] : name;
};

export default function Journal({
  visible = false,
  onClose = () => {},
  milestone = null,
  existingEntry = null,
}) {

  const { addJournalEntry, updateJournalEntry } = useContext(TaskContext);

  const translateY = useSharedValue(MODAL_HEIGHT);
  const translateX = useSharedValue(width); // Sağdan başla
  const scale = useSharedValue(0.96);
  const opacity = useSharedValue(0);
  const dragY = useSharedValue(0);
  const isPanningRef = useRef(false);
  const inputRef = useRef(null);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [textValue, setTextValue] = useState("");
  const [previews, setPreviews] = useState([]);
  const [editingEntryId, setEditingEntryId] = useState(null);

  // mood state
  const [selectedMood, setSelectedMood] = useState(null);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const todayText = new Date().toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
  });

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) =>
      setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Populate when editing existing entry
  useEffect(() => {
    if (existingEntry) {
      setTextValue(existingEntry.text || "");
      setPreviews([
        ...(existingEntry.images || []).map((uri) => ({ type: "image", content: uri })),
        ...(existingEntry.location ? [{ type: "map", content: existingEntry.location }] : []),
      ]);
      // If previous code saved mood info (mood/moodIcon/moodColor), restore it
      if (existingEntry.mood) {
        const m = MOODS.find((mm) => mm.key === existingEntry.mood);
        if (m) setSelectedMood(m);
        else setSelectedMood({
          key: existingEntry.mood || null,
          icon: existingEntry.moodIcon || null,
          color: existingEntry.moodColor || null,
        });
      } else {
        setSelectedMood(null);
      }
      setEditingEntryId(existingEntry.id);
    } else {
      setTextValue("");
      setPreviews([]);
      setEditingEntryId(null);
      setSelectedMood(null);
    }
  }, [existingEntry]);

  useEffect(() => {
    if (visible) {
      // Basit açılış animasyonu
      translateY.value = withTiming(0, { duration: 320 });
      scale.value = withTiming(1, { duration: 320 });
      opacity.value = withTiming(1, { duration: 320 });
      const t = setTimeout(() => inputRef.current?.focus?.(), 340);
      return () => clearTimeout(t);
    } else {
      // Journal kapanırken shared value'ları reset et
      Keyboard.dismiss();
      translateY.value = MODAL_HEIGHT;
      scale.value = 0.96;
      opacity.value = 0;
      dragY.value = 0;
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => {
    const o = interpolate(translateY.value, [0, MODAL_HEIGHT], [0.45, 0]);
    return { opacity: o };
  });

  const modalStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value + dragY.value }, 
        { scale: scale.value }
      ],
      opacity: opacity.value,
    };
  });

  const handleClose = useCallback(() => {
    // Önce onClose'u çağır
    if (onClose) {
      onClose();
    }
    
    // State'leri temizle
    Keyboard.dismiss();
    setTextValue("");
    setPreviews([]);
    setEditingEntryId(null);
    setSelectedMood(null);
    setShowMoodPicker(false);
    
    // Animasyonu başlat
    translateY.value = withTiming(height, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 });
  }, [onClose]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        dragY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 120) {
        dragY.value = withTiming(height, { duration: 200 }, () => {
          runOnJS(handleClose)();
        });
      } else {
        dragY.value = withTiming(0, { duration: 150 });
      }
    });

  const backdropTap = Gesture.Tap().onEnd(() => {
    handleClose();
  });

  const canAddMore = previews.length < MAX_ITEMS;
  const addPreviewImage = (uri) => {
    if (!canAddMore) return false;
    setPreviews((p) => [...p, { type: "image", content: uri }]);
    return true;
  };
  const addPreviewLocation = (loc) => {
    if (!canAddMore) return false;
    setPreviews((p) => [...p, { type: "map", content: loc }]);
    return true;
  };

  const pickImage = async () => {
    if (!canAddMore) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.7,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
      let uri = null;
      if (result?.assets && result.assets.length > 0) uri = result.assets[0].uri;
      else if (result?.uri) uri = result.uri;
      if (uri) addPreviewImage(uri);
    } catch (e) {
      console.warn("Image pick error", e);
    }
  };

  const pickLocation = async () => {
    if (!canAddMore) return;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      addPreviewLocation(loc);
    } catch (e) {
      console.warn("Location error", e);
    }
  };

  const handleButtonPress = async (label) => {
    if (label === "Location") {
      await pickLocation();
      return;
    }
    if (label === "Photo") {
      await pickImage();
      return;
    }
    if (label === "Mood") {
      // toggle mood picker popup
      setShowMoodPicker((s) => !s);
      return;
    }
    if (label === "Save") {
      if (!milestone || !milestone.id) {
        console.warn("Cannot save journal entry: missing milestone id");
        handleClose();
        return;
      }

      const taskId = milestone.taskId || milestone.parentTaskId || milestone.task?.id;
      const msId = milestone.id;

      const payload = {
        text: textValue?.trim() || "",
        images: previews.filter((x) => x.type === "image").map((x) => x.content),
        location: previews.find((x) => x.type === "map")?.content?.coords || null,
        // include mood data (compatible keys)
        mood: selectedMood?.key || null,
        moodIcon: selectedMood ? getValidIconName(selectedMood.icon) : null,
        moodColor: selectedMood?.color || null,
      };

      if (editingEntryId) {
        updateJournalEntry && updateJournalEntry(taskId, msId, editingEntryId, payload);
      } else {
        addJournalEntry && addJournalEntry(taskId, msId, payload);
      }

      handleClose();
    }
  };

  const renderPreviewItem = (item, key) => {
    if (!item) return null;
    if (item.type === "image") {
      return (
        <TouchableOpacity 
          key={key} 
          onPress={() => {
            Keyboard.dismiss();
            setSelectedImage({ type: "image", content: item.content });
            setShowImageModal(true);
          }}
          activeOpacity={0.8}
        >
          <Image source={{ uri: item.content }} style={styles.previewImage} resizeMode="cover" />
        </TouchableOpacity>
      );
    }
    if (item.type === "map") {
      const coords = item.content?.coords || item.content;
      return (
        <View key={key} style={styles.mapWrapper}>
          <MapView
            style={styles.mapInner}
            initialRegion={{
              latitude: coords.latitude,
              longitude: coords.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            pointerEvents="none"
          >
            <Marker
              coordinate={{
                latitude: coords.latitude,
                longitude: coords.longitude,
              }}
            />
          </MapView>
        </View>
      );
    }
    return null;
  };

  const renderPreviewGrid = () => {
    if (!previews || previews.length === 0) return null;

    const left = previews[0] ? [previews[0]] : [];
    const right = previews.slice(1);
    const rightCount = right.length;

    let topRow = [];
    let bottomRow = [];
    if (rightCount === 1) topRow = [right[0]];
    else if (rightCount === 2) topRow = right;
    else if (rightCount === 3) {
      topRow = [right[0]];
      bottomRow = right.slice(1, 3);
    } else if (rightCount >= 4) {
      topRow = right.slice(0, 2);
      bottomRow = right.slice(2, 4);
    }

    return (
      <View style={styles.previewWrapper}>
        <View style={styles.leftGrid}>{left[0] && renderPreviewItem(left[0], "left-0")}</View>
        <View style={styles.rightGrid}>
          <View style={{ flexDirection: "row", flex: topRow.length === 1 ? 0.5 : 0.5, marginBottom: 4 }}>
            {topRow.map((item, idx) => (
              <View key={idx} style={{ flex: topRow.length === 1 ? 1 : 0.5, paddingRight: 4 }}>
                {renderPreviewItem(item, `right-top-${idx}`)}
              </View>
            ))}
          </View>
          {bottomRow.length > 0 && (
            <View style={{ flexDirection: "row", flex: 0.5 }}>
              {bottomRow.map((item, idx) => (
                <View key={idx} style={{ flex: 0.5, paddingRight: 4 }}>
                  {renderPreviewItem(item, `right-bottom-${idx}`)}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const buttons = [
    { label: "Location", icon: "map-outline" },
    { label: "Photo", icon: "image-outline" },
    { label: "Mood", icon: "happy-outline" },
    { label: "Save", icon: "save-outline" },
  ];

  if (!visible) {
    return null;
  }

  return (
    <>
      <Animated.View style={styles.backdropContainer}>
        <GestureDetector gesture={backdropTap}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </GestureDetector>
      </Animated.View>

      <Animated.View style={[styles.modalContainer, modalStyle]}>
        <GestureDetector gesture={panGesture}>
          <View style={styles.topSpacer} />
        </GestureDetector>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.dateRow}>
            <Text style={styles.dateText}>{todayText}</Text>
            {selectedMood && (
              <View style={[styles.moodTag, { backgroundColor: selectedMood.color || "transparent" }]}>
                <MaterialIcons
                  name={getValidIconName(selectedMood.icon)}
                  size={18}
                  color="#333"
                />
                <Text style={styles.moodLabel}>{selectedMood.label}</Text>
              </View>
            )}
          </View>

          {renderPreviewGrid()}

          <ScrollView style={{ flex: 1 }}>
            <TextInput
              ref={inputRef}
              value={textValue}
              onChangeText={setTextValue}
              style={styles.input}
              placeholder={(milestone?.title ? milestone.title + ": " : "") + "Hakkında yazın.."}
              multiline
              underlineColorAndroid="transparent"
              placeholderTextColor="#999"
              textAlignVertical="top"
              editable = {true}
            />
          </ScrollView>

          {/* Mood picker popup */}
          {showMoodPicker && (
            <View style={[styles.moodPicker, { bottom: keyboardHeight ? keyboardHeight + 70 : 86 }]}>
              {MOODS.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[
                    styles.moodOption,
                    selectedMood?.key === m.key ? { borderColor: "#999", borderWidth: 1 } : null,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    // toggle selection (if selecting different mood, replace; if same, keep/replace)
                    setSelectedMood((prev) => (prev?.key === m.key ? m : m));
                    setShowMoodPicker(false);
                  }}
                >
                  <View style={[styles.moodIconWrap, { backgroundColor: m.color }]}>
                    <MaterialIcons name={getValidIconName(m.icon)} size={22} color="#333" />
                  </View>
                  <Text style={styles.moodOptionLabel}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={[styles.buttonRow, { marginBottom: keyboardHeight ? keyboardHeight : 16 }]}>
            {buttons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={styles.button}
                activeOpacity={0.85}
                onPress={() => handleButtonPress(btn.label)}
              >
                <Ionicons name={btn.icon} size={18} color="#545454" />
                <Text style={styles.buttonText}>{btn.label === "Save" ? "Save" : btn.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </KeyboardAvoidingView>
      </Animated.View>

      {/* Image Modal */}
      {showImageModal && selectedImage && selectedImage.type === "image" && (
        <View style={styles.imageModal}>
          <TouchableOpacity 
            style={styles.imageModalBackdrop}
            onPress={() => setShowImageModal(false)}
            activeOpacity={1}
          >
            <View style={styles.imageModalContent}>
              <TouchableOpacity 
                style={styles.imageModalClose}
                onPress={() => setShowImageModal(false)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              
              <Image 
                source={{ uri: selectedImage.content }} 
                style={styles.imageModalImage} 
                resizeMode="contain" 
              />
            </View>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backdropContainer: { position: "absolute", left: 0, top: 0, width, height, zIndex: 200 },
  backdrop: { flex: 1 },
  modalContainer: {
    position: "absolute",
    left: 0,
    width,
    top: TOP_GAP,
    height: MODAL_HEIGHT,
    backgroundColor: "#E7E7E7",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 201,
    elevation: 25,
    overflow: "hidden",
  },
  topSpacer: { height: SWIPE_AREA },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    justifyContent: "flex-start",
  },
  dateText: { paddingHorizontal: 0, fontSize: 15, color: "#AFAFAF", fontFamily: "Poppins_400Regular" },
  moodTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 10,
  },
  moodLabel: {
    marginLeft: 6,
    fontSize: 12,
    color: "#333",
    fontFamily: "Poppins_400Regular",
  },
  previewWrapper: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 8,
    height: PREVIEW_HEIGHT,
    alignItems: "stretch",
  },
  leftGrid: { flex: 1, marginRight: 8, height: PREVIEW_HEIGHT },
  rightGrid: { flex: 1, flexDirection: "column", height: PREVIEW_HEIGHT },
  previewImage: { width: "100%", height: "100%", borderRadius: 12, elevation: 2, borderWidth:1, borderColor:"#fff" },
  mapWrapper: { flex: 1, borderRadius: 12, overflow: "hidden", backgroundColor: "#eee", borderWidth:1, borderColor:"#fff", elevation: 1 },
  mapInner: { width: "100%", height: "100%", borderWidth:1, },
  input: { flex: 1, padding: 16, fontSize: 17, color: "#545454", textAlignVertical: "top", fontFamily: "Poppins_300Light", letterSpacing:-0.2 },
  buttonRow: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 16, paddingVertical: 8, marginBottom: 20 },
  button: { width: 70, height: 50, backgroundColor: "#C7C7C7", borderRadius: 12, justifyContent: "center", alignItems: "center", marginVertical: 10, marginBottom: 50},
  buttonText: { fontSize: 10, color: "#545454", textAlign: "center", marginTop: 4, fontFamily: "Poppins_400Regular" },

  /* mood picker popup */
  moodPicker: {
    width: width - 100,
    position: "absolute",
    left: 100,
    right: 0,
    backgroundColor: "#fff",
    padding: 5,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    zIndex: 500,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.09,
    shadowRadius: 6,
  },
  moodOption: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  moodIconWrap: {
    width: 33,
    height: 33,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  moodOptionLabel: { fontSize: 12, color: "#333", fontFamily: "Poppins_400Regular" },

  // Image/Map Modal Styles
  imageModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  imageModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageModalContent: {
    width: width - 40,
    height: height - 100,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  imageModalClose: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 1001,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    padding: 8,
  },
  imageModalImage: {
    width: "100%",
    height: "100%",
  },
});
