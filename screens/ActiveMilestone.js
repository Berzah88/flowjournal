// screens/ActiveMilestone.js
import React, { useEffect, useContext, useCallback, useState } from "react";
import { getMilestoneColor } from '../utils/milestoneColors';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  BackHandler,
  Image,
  Pressable,
  Alert,
  ScrollView,
} from "react-native";
import { useTasks, useTaskActions } from "../hooks/useTaskContext";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from "react-native-reanimated";
import { useMediaModalAnimation, useSpringAnimation } from "../hooks/useAnimations";
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
  const tasks = useTasks();
  const { deleteJournalEntry } = useTaskActions();

  // Yeni milestone oluşturma için id: null olabilir
  if (!milestoneData) {
    if (onClose) onClose();
    return null;
  }

  // Yeni milestone oluşturma için currentMilestone null olabilir
  const currentMilestone = milestoneData.id ? 
    tasks.find((t) => t.id === milestoneData.taskId)?.milestones?.find((ms) => ms.id === milestoneData.id) :
    null;

  const entries = currentMilestone?.journalEntries?.slice().sort((a, b) => b.id - a.id) || [];

  // Günlükleri tarihlere göre gruplandır, aynı gün içindeki girişleri saatlere göre gruplandır
  const groupEntriesByDate = (entries) => {
    const groups = {};
    entries.forEach(entry => {
      const date = new Date(entry.createdAt);
      const dateKey = date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
    });
    
    // Tarihleri sırala (en yeni önce) ve her tarih içindeki girişleri saatlere göre gruplandır
    return Object.keys(groups)
      .sort((a, b) => {
        const dateA = new Date(groups[a][0].createdAt);
        const dateB = new Date(groups[b][0].createdAt);
        return dateB - dateA;
      })
      .map(dateKey => {
        const dayEntries = groups[dateKey];
        
        // Aynı gün içindeki girişleri saatlere göre gruplandır
        const timeGroups = {};
        dayEntries.forEach(entry => {
          const time = new Date(entry.createdAt);
          const timeKey = time.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit'
          });
          
          if (!timeGroups[timeKey]) {
            timeGroups[timeKey] = [];
          }
          timeGroups[timeKey].push(entry);
        });
        
        // Saatleri sırala (en yeni önce)
        const sortedTimeGroups = Object.keys(timeGroups)
          .sort((a, b) => {
            const timeA = new Date(timeGroups[a][0].createdAt);
            const timeB = new Date(timeGroups[b][0].createdAt);
            return timeB - timeA;
          })
          .map(timeKey => ({
            time: timeKey,
            entries: timeGroups[timeKey]
          }));
        
        return {
          date: dateKey,
          timeGroups: sortedTimeGroups,
          allEntries: dayEntries // Tüm girişler (medya birleştirme için)
        };
      });
  };

  const groupedEntries = groupEntriesByDate(entries);

  // Renk sistemi artık utils/milestoneColors.js'den yönetiliyor
  let headerBgColor = currentMilestone ? getMilestoneColor(currentMilestone) : "#BFBFBF";

  const [showJournalModal, setShowJournalModal] = useState(milestoneData?.autoOpenJournal || false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  // Modal açma fonksiyonu
  const openJournalDetail = useCallback((mediaData) => {
    if (navigation && navigation.navigate) {
      navigation.navigate('JournalDetail', { selectedMediaData: mediaData });
    } else {
      console.warn('Navigation not available for JournalDetail');
    }
  }, [navigation]);



  const handleTextEntryEdit = useCallback((entry) => {
    setSelectedEntry(entry);
    setShowJournalModal(true);
  }, []);

  // Metin özetleme fonksiyonu
  const truncateText = (text, maxLength = 100) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };


  // Active Milestone screen animasyonu - Add Project screen benzeri
  const { translateY, opacity, scale } = useSpringAnimation(true);

  const dragY = useSharedValue(0);

  useEffect(() => {
    // Cleanup function
    return () => {
      if (dragY) dragY.value = 0;
    };
  }, []); // Dependency array'i boş bırak - sadece mount/unmount'ta çalışsın

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
      if (onClose) {
        runOnJS(onClose)();
      }
    });
  }, [onClose]);

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

  const renderDateHeader = (date) => (
    <View style={styles.dateHeader}>
      <Text style={styles.dateHeaderText}>{date}</Text>
    </View>
  );

  // Tek bir giriş için render fonksiyonu (saat bölümü içinde)
  const renderSingleEntry = (entry) => {
    const textContent = entry.text || "";
    const hasText = textContent && textContent.trim() !== "";

    const truncateWords = (text, n = 30) => {
      if (!text || typeof text !== "string") return "";
      const words = text.trim().split(/\s+/);
      return words.length <= n ? words.join(" ") : words.slice(0, n).join(" ") + "...";
    };
    const previewText = hasText ? truncateWords(textContent, 30) : "";

    return (
      <Pressable 
        style={({ pressed }) => [
          styles.timeSectionEntry,
          {
            transform: [{ scale: pressed ? 0.98 : 1 }],
            opacity: pressed ? 0.8 : 1,
          }
        ]}
        onPress={() => handleCardPress(entry)}
      >
        <View style={styles.timeSectionContent}>
          {hasText && <Text style={styles.timeSectionText}>{previewText}</Text>}
          {!hasText && (
            <Text style={styles.timeSectionPlaceholder}>Medya veya konum eklendi</Text>
          )}
        </View>
        <TouchableOpacity onPress={() => handleDeleteEntry(entry.id)} style={styles.deleteBtnSmall}>
          <Ionicons name="trash" size={14} color="#a33" />
        </TouchableOpacity>
      </Pressable>
    );
  };

  // Saat bölümü için render fonksiyonu
  const renderTimeSection = (timeGroup) => {
    // Tüm girişleri göster (metin, medya, konum, mood içerenler)
    const allEntries = timeGroup.entries;

    // Eğer hiç giriş yoksa hiçbir şey render etme
    if (allEntries.length === 0) {
      return null;
    }

    return (
      <View key={timeGroup.time} style={styles.timeSection}>
        <Text style={styles.timeSectionHeader}>{timeGroup.time}</Text>
        {allEntries.map((entry) => (
          <View key={entry.id}>
            {renderSingleEntry(entry)}
          </View>
        ))}
      </View>
    );
  };

  // Gün kartı için render fonksiyonu
  const renderDayCard = (dayGroup) => {
    // O günün tüm medyalarını birleştir
    const allMedia = [];
    dayGroup.allEntries.forEach(entry => {
      if (entry.images) {
        allMedia.push(...entry.images.map(uri => ({ type: "image", content: uri })));
      }
      if (entry.location) {
        allMedia.push({ type: "map", content: entry.location });
      }
    });

    // O günün mood bilgisini al (mood bilgisi olan en son girişten)
    let dayMoodObj = null;
    
    // O günün tüm girişlerinden mood bilgisi olan en son girişi bul
    const moodEntries = dayGroup.allEntries.filter(entry => 
      entry.mood || entry.moodIcon || entry.moodColor
    );
    
    // En son güncellenen mood'u al (createdAt'e göre sırala)
    const moodEntry = moodEntries.length > 0 
      ? moodEntries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
      : null;
    
    if (moodEntry) {
      if (moodEntry.mood) {
        const found = MOODS.find((m) => m.key === moodEntry.mood);
        if (found) dayMoodObj = found;
        else dayMoodObj = { key: moodEntry.mood, label: moodEntry.mood, icon: moodEntry.moodIcon || "happy", color: moodEntry.moodColor || "#eee" };
      } else if (moodEntry.moodIcon || moodEntry.moodColor) {
        dayMoodObj = { key: moodEntry.mood || null, label: moodEntry.mood || "", icon: moodEntry.moodIcon || "happy", color: moodEntry.moodColor || "#eee" };
      }
    }

    // Metin içeren girişleri al ve sırala
    const textEntries = dayGroup.allEntries.filter(entry => {
      return entry.text && entry.text.trim().length > 0;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // En yeni önce

    // İlk (en yeni) metin girişini al
    const firstTextEntry = textEntries.length > 0 ? textEntries[0] : null;
    
    // Diğer metin girişlerini al (ikinci, üçüncü, vb.)
    const otherTextEntries = textEntries.slice(1);

    // Eğer hiç metin içeren giriş yoksa ve medya da yoksa hiçbir şey render etme
    if (textEntries.length === 0 && allMedia.length === 0 && !dayMoodObj) {
      return null;
    }

    return (
      <View style={styles.dayCard}>
        {/* Medya bölümü - o günün tüm medyaları */}
        {allMedia.length > 0 && (
          <TouchableOpacity 
            style={styles.dayMediaSection}
            onPress={() => {
              openJournalDetail({
                images: allMedia.filter(m => m.type === "image").map(m => m.content),
                location: allMedia.find(m => m.type === "map")?.content,
                date: dayGroup.date,
                mood: dayMoodObj,
                textEntries: textEntries
              });
            }}
            activeOpacity={0.8}
          >
            {renderPreviewGridForEntry({ images: allMedia.filter(m => m.type === "image").map(m => m.content), location: allMedia.find(m => m.type === "map")?.content })}
          </TouchableOpacity>
        )}
        
        {/* Tarih başlığı ve mood */}
        <View style={styles.dayHeader}>
          <View style={styles.dayHeaderContent}>
            <Text style={styles.dayHeaderText}>{dayGroup.date}</Text>
            {dayMoodObj && (
              <View style={[styles.dayMoodTag, { backgroundColor: dayMoodObj.color || "#fff", marginLeft: 8 }]}>
                <MaterialIcons name={getValidIconName(dayMoodObj.icon)} size={16} color="#333" />
                <Text style={styles.dayMoodLabel}>{dayMoodObj.label}</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* İlk metin girişi - saat ile birlikte */}
        {firstTextEntry && (
          <View style={styles.firstTextSection}>
            <Text style={styles.firstTextTime}>
              {new Date(firstTextEntry.createdAt).toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
            <Text style={styles.firstTextContent}>{truncateText(firstTextEntry.text, 120)}</Text>
          </View>
        )}
        
        {/* Diğer metin girişleri - etiket olarak alt kısımda */}
        {otherTextEntries.length > 0 && (
          <View style={styles.additionalTextTags}>
            {otherTextEntries.map((entry, index) => (
              <View key={index} style={styles.textTag}>
                <Text style={styles.textTagTime}>
                  {new Date(entry.createdAt).toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
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
              data={groupedEntries}
              keyExtractor={(item) => item.date}
              renderItem={({ item }) => renderDayCard(item)}
              contentContainerStyle={{ paddingBottom: 12, flexGrow: 1 }}
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
    top: 20,
    width: width,
    height: height - 20,
    zIndex: 100,
    elevation: 10,
    backgroundColor: "#F0F9FF", // soft mavi
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
    marginHorizontal: 20,
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

  dateHeader: {
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  dateHeaderText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#666",
    textTransform: "capitalize",
  },

  entryItem: { 
    backgroundColor: "#FFFFFF", 
    borderRadius: 20, 
    padding: 20, 
    minHeight: 120, 
    marginTop: 16,
    marginHorizontal: 2,
    // Optimized shadow system - softer and more natural
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.08,
    // Subtle border
    borderWidth: 0.5,
    borderColor: "#F0F0F0",
    // Better spacing
    marginBottom: 8,
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

  entryFooter: { 
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F8F8F8",
  },
  entryHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 20, 
    paddingBottom: 16,
    borderBottomWidth: 1, 
    borderBottomColor: "#F5F5F5", 
  },

  dateTimeContainer: {
    flex: 0.7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },

  entryDate: { 
    fontSize: 14, 
    color: "#495057", 
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  textContentContainer: {
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  entryTime: {
    fontSize: 12,
    color: "#6C757D",
    fontFamily: "Poppins_500Medium",
    letterSpacing: 0.3,
    marginBottom: 8,
  },

  entryText: { 
    fontSize: 13, 
    color: "#333", 
    fontFamily: "Poppins_400Regular",
    lineHeight: 18,
    letterSpacing: 0.2,
  },

  moodTag: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    minWidth: 80,
    justifyContent: "center",
  },
  moodLabelSmall: { 
    marginLeft: 6, 
    fontSize: 13, 
    color: "#495057", 
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 0.2,
  },

  deleteBtn: { 
    position: "absolute", 
    right: 12, 
    bottom: 12,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    shadowOpacity: 0.1,
  },
  emptyText: { 
    textAlign: "center", 
    color: "#888", 
    marginTop: 40,
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    lineHeight: 24,
    opacity: 0.7,
  },
  // Yeni gün kartı stilleri
  dayCard: {
    backgroundColor: "#FFFFFF", 
    borderRadius: 14, 
    padding: 12, 
    marginTop: 8,
    marginHorizontal: 2,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 6,
    shadowOpacity: 0.06,
    borderWidth: 0.5,
    borderColor: "#F0F0F0",
    marginBottom: 4,
  },

  dayMediaSection: {
    marginBottom: 8,
  },

  dayHeader: {
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },

  dayHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  dayHeaderText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: "#666",
    textTransform: "capitalize",
    flex: 1,
    letterSpacing: 0.3,
  },

  dayMoodTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    minWidth: 55,
    justifyContent: "center",
  },

  dayMoodLabel: {
    marginLeft: 3,
    fontSize: 10,
    color: "#555",
    fontFamily: "Poppins_500Medium",
    letterSpacing: 0.3,
  },

  firstTextSection: {
    marginTop: 8,
    marginBottom: 8,
  },

  firstTextTime: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
    color: "#888",
    marginBottom: 4,
    paddingHorizontal: 3,
    letterSpacing: 0.4,
  },

  firstTextContent: {
    fontSize: 13,
    color: "#333",
    fontFamily: "Poppins_400Regular",
    lineHeight: 18,
    letterSpacing: 0.2,
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    padding: 10,
  },

  additionalTextTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },

  textTag: {
    backgroundColor: "#E9ECEF",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#DEE2E6",
  },

  textTagTime: {
    fontSize: 10,
    fontFamily: "Poppins_500Medium",
    color: "#6C757D",
    letterSpacing: 0.3,
  },

  timeSectionsContainer: {
    gap: 6,
  },

  timeSection: {
    marginBottom: 4,
  },

  timeSectionHeader: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
    color: "#888",
    marginBottom: 4,
    paddingHorizontal: 3,
    letterSpacing: 0.4,
  },

  timeSectionEntry: {
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    padding: 10,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  timeSectionContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  timeSectionText: {
    fontSize: 14,
    color: "#333",
    fontFamily: "Poppins_400Regular",
    lineHeight: 20,
    flex: 1,
  },

  timeSectionPlaceholder: {
    fontSize: 13,
    color: "#888",
    fontFamily: "Poppins_400Regular",
    lineHeight: 18,
    flex: 1,
    fontStyle: "italic",
  },


  deleteBtnSmall: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    marginLeft: 8,
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
