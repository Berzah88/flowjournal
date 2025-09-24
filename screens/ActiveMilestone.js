// screens/ActiveMilestone.js
import React, { useEffect, useContext, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  BackHandler,
  Image,
} from "react-native";
import { TaskContext } from "../context/TaskContext";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import Journal from "./Journal";

const { width, height } = Dimensions.get("window");
const PREVIEW_HEIGHT = 130;

const MOODS = [
  { key: "happy", label: "Happy", icon: "sentiment-satisfied", color: "#C8E6C9" },
  { key: "calm", label: "Calm", icon: "self-improvement", color: "#D1C4E9" },
  { key: "angry", label: "Angry", icon: "sentiment-very-dissatisfied", color: "#FFCDD2" },
  { key: "unhappy", label: "Unhappy", icon: "sentiment-dissatisfied", color: "#CFD8DC" },
  { key: "sick", label: "Sick", icon: "sick", color: "#FFF9C4" },
];

const getValidIconName = (name) => {
  const fallback = { sick: "sick", "self-improvement": "self-improvement" };
  return fallback[name] ? fallback[name] : name;
};

export default function ActiveMilestone({ route, navigation, milestone, onClose }) {
  const milestoneData = route?.params?.milestone || milestone || {};
  const { tasks, deleteJournalEntry } = useContext(TaskContext);

  if (!milestoneData || !milestoneData.id) {
    if (navigation) navigation.goBack();
    else if (onClose) onClose();
    return null;
  }

  const currentMilestone = tasks
    .find((t) => t.id === milestoneData.taskId)
    ?.milestones?.find((ms) => ms.id === milestoneData.id);

  const entries = currentMilestone?.journalEntries?.slice().sort((a, b) => b.id - a.id) || [];

  // Header renk mantığı
  let headerBgColor = "#d3cbe3"; // Varsayılan renk
  if (currentMilestone?.completed) headerBgColor = "#BFBFBF"; // Tamamlanmış milestone
  else if (currentMilestone?.wasEdited) headerBgColor = "#E8B4B8"; // Edit edilmiş milestone - soft pembe
  else if (milestoneData?.isLatest) headerBgColor = "#c2d7d0"; // En son eklenen milestone

  const [showJournalModal, setShowJournalModal] = useState(milestoneData?.autoOpenJournal || false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const translateY = useSharedValue(height);
  const scale = useSharedValue(0.96);
  const opacity = useSharedValue(0);
  const dragY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(0, { duration: 320 });
    scale.value = withTiming(1, { duration: 320 });
    opacity.value = withTiming(1, { duration: 320 });
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      if (showJournalModal) {
        setShowJournalModal(false);
        setSelectedEntry(null);
        return true;
      }
      handleClose();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [showJournalModal]);

  const handleClose = useCallback(() => {
    translateY.value = withTiming(height, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 }, () => {
      if (navigation && navigation.goBack) {
        runOnJS(navigation.goBack)();
      } else if (onClose) {
        runOnJS(onClose)();
      }
    });
  }, [navigation, onClose]);

  const isModalOpen = !!showJournalModal;

  const panGesture = Gesture.Pan()
    .enabled(!isModalOpen)
    .onStart((e) => {
      // Swipe to close'u sadece header alanında etkinleştir (yaklaşık 120px yükseklik)
      if (e.y > 120) {
        panGesture.enabled = false;
      }
    })
    .onUpdate((e) => {
      if (!isModalOpen && e.translationY > 0 && e.y <= 120) {
        dragY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (isModalOpen) {
        dragY.value = withTiming(0, { duration: 150 });
        return;
      }
      if (e.translationY > 120 && e.y <= 120) {
        dragY.value = withTiming(height, { duration: 200 }, () => {
          runOnJS(handleClose)();
        });
      } else {
        dragY.value = withTiming(0, { duration: 150 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + dragY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const animatedHeaderStyle = useAnimatedStyle(() => {
    let bgColor = "#d3cbe3";
    if (milestoneData?.isLatest) bgColor = "#c2d7d0";
    if (milestoneData?.completed) bgColor = "#FFD6E0";
    return {
      backgroundColor: bgColor + "D9", // 0.85 opacity
    };
  });

  const todayText = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const handleDeleteEntry = (entryId) => {
    if (!milestoneData?.taskId || !milestoneData?.id) return;
    deleteJournalEntry && deleteJournalEntry(milestoneData.taskId, milestoneData.id, entryId);
  };

  const handleCardPress = (entry) => {
    setSelectedEntry(entry);
    setShowJournalModal(true);
  };

  const renderPreviewGridForEntry = (entry) => {
    const previews = [
      ...(entry.images?.map((uri) => ({ type: "image", content: uri })) || []),
      ...(entry.location ? [{ type: "map", content: entry.location }] : []),
    ];

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

    const renderPreviewItem = (item, key) => {
      if (!item) return null;
      if (item.type === "image") {
        return <Image key={key} source={{ uri: item.content }} style={styles.previewImage} resizeMode="cover" />;
      }
      if (item.type === "map") {
        const coords = item.content?.coords || item.content;
        return (
          <View key={key} style={styles.mapWrapper}>
            <MapView
              style={styles.mapInner}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: coords.latitude,
                longitude: coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              pointerEvents="none"
            >
              <Marker coordinate={coords} />
            </MapView>
          </View>
        );
      }
      return null;
    };

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

  const renderEntryPreview = ({ item }) => {
    const textContent = item.text || "";
    let moodObj = null;
    if (item.mood) {
      const found = MOODS.find((m) => m.key === item.mood);
      if (found) moodObj = found;
      else moodObj = { key: item.mood, label: item.mood, icon: item.moodIcon || "happy", color: item.moodColor || "#eee" };
    } else if (item.moodIcon || item.moodColor) {
      moodObj = { key: item.mood || null, label: item.mood || "", icon: item.moodIcon || "happy", color: item.moodColor || "#eee" };
    }

    const truncateWords = (text, n = 30) => {
      if (!text || typeof text !== "string") return "";
      const words = text.trim().split(/\s+/);
      return words.length <= n ? words.join(" ") : words.slice(0, n).join(" ") + "...";
    };
    const previewText = truncateWords(textContent, 30);

    return (
      <TouchableOpacity style={styles.entryItem} onPress={() => handleCardPress(item)} activeOpacity={0.95}>
        {renderPreviewGridForEntry(item)}
        <View style={styles.entryFooter}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryDate}>
              {new Date(item.createdAt).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            {moodObj && (
              <View style={[styles.moodTag, { backgroundColor: moodObj.color || "#fff", marginLeft: 10 }]}>
                <MaterialIcons name={getValidIconName(moodObj.icon)} size={16} color="#333" />
                <Text style={styles.moodLabelSmall}>{moodObj.label}</Text>
              </View>
            )}
          </View>
          <Text style={styles.entryText}>{previewText}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDeleteEntry(item.id)} style={styles.deleteBtn}>
          <Ionicons name="trash" size={16} color="#a33" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Animated.View style={[styles.overlayCard, animatedStyle]}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.header, animatedHeaderStyle, { backgroundColor: headerBgColor }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.journalTitle}>{milestoneData?.title || "Untitled milestone"}</Text>
              <Text style={styles.dateText}>{todayText}</Text>
            </View>
          </Animated.View>
        </GestureDetector>

        <View style={styles.contentWrapper}>
          {entries.length === 0 ? (
            <Text style={styles.emptyText}>No journal entries yet. Use the + button to add one.</Text>
          ) : (
            <FlatList
              data={entries}
              keyExtractor={(it) => it.id.toString()}
              renderItem={renderEntryPreview}
              contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
              style={{ flex: 1 }}
              extraData={tasks}
              initialNumToRender={4}
              showsVerticalScrollIndicator={true}
            />
          )}
        </View>
      </Animated.View>

      <TouchableOpacity style={styles.fab} onPress={() => setShowJournalModal(true)}>
        <MaterialIcons name="edit-note" size={28} color="#fff" />
      </TouchableOpacity>

      <Journal
        visible={showJournalModal}
        onClose={() => {
          setShowJournalModal(false);
          setSelectedEntry(null);
        }}
        milestone={milestoneData}
        existingEntry={selectedEntry}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlayCard: {
    position: "absolute",
    top: 35,
    width: width,
    height: height - 35,
    zIndex: 100,
    elevation: 10,
    backgroundColor: "#F5F1F1", // pastel beyaz
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: -10,
    paddingHorizontal: 25,
    borderRadius: 15,
    paddingVertical: 15,
    opacity: 0.95,
    marginTop: 20,
    elevation: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    shadowOpacity: 0.3,
  },
  journalTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#545454", marginBottom: 8, paddingRight: 30, },
  dateText: { fontSize: 11, fontFamily: "Poppins_500Medium", color: "#F5F1F1" },

  contentWrapper: { 
    flex: 1, 
    paddingTop: 20, 
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  entryItem: { 
    backgroundColor: "#FFFFFF", 
    borderRadius: 16, 
    padding: 16, 
    minHeight: 100, 
    marginTop: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.1,
    borderWidth: 0.5,
    borderColor: "#F0F0F0",
  },
  previewWrapper: { flexDirection: "row", paddingHorizontal: 5, marginTop: 2, height: PREVIEW_HEIGHT, alignItems: "stretch", elevation: 3 },
  leftGrid: { flex: 1, marginRight: 4, height: PREVIEW_HEIGHT },
  rightGrid: { flex: 1, flexDirection: "column", height: PREVIEW_HEIGHT },
  previewImage: { 
    width: "100%", 
    height: "100%", 
    borderRadius: 12, 
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    shadowOpacity: 0.1,
  },
  mapWrapper: { 
    flex: 1, 
    borderRadius: 12, 
    overflow: "hidden", 
    backgroundColor: "#f8f8f8", 
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    shadowOpacity: 0.1,
  },
  mapInner: { width: "100%", height: "100%" },

  entryFooter: { marginTop: 10,  },
  entryHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: "#F0F0F0", 
    paddingBottom: 12,
  },

  entryDate: { fontSize: 12, color: "#8a8a8a", fontFamily: "Poppins_500Medium",},
  entryText: { fontSize: 15, color: "#222", fontFamily: "Poppins_400Regular" },

  moodTag: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  moodLabelSmall: { marginLeft: 6, fontSize: 12, color: "#333", fontFamily: "Poppins_400Regular" },

  deleteBtn: { position: "absolute", right: 8, bottom: 8 },
  emptyText: { 
    textAlign: "center", 
    color: "#888", 
    marginTop: 40,
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    lineHeight: 24,
    opacity: 0.7,
  },
  fab: { 
    position: "absolute", 
    bottom: 30, 
    right: 25, 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    backgroundColor: "#545454", 
    justifyContent: "center", 
    alignItems: "center", 
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    shadowOpacity: 0.2,
    zIndex: 200,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});
