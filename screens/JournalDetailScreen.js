import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Journal from "./Journal";
// import { useTaskActions } from "../context/TaskContext"; // Şimdilik kullanmıyoruz
// import MapView, { Marker } from "expo-maps"; // Geçici olarak devre dışı

const { width, height } = Dimensions.get("window");

const JournalDetailScreen = ({ 
  route, 
  navigation,
  onTextEntryEdit = null
}) => {
  const { selectedMediaData } = route?.params || {};
  const [journalModalVisible, setJournalModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editingMilestone, setEditingMilestone] = useState(null);

  // Edit fonksiyonu - Journal modal'ını açmak için
  const handleEditTextEntry = (entry) => {
    if (!selectedMediaData) {
      console.warn('SelectedMediaData not available');
      return;
    }
    
    // selectedMediaData'dan taskId ve milestoneId bilgilerini al
    const taskId = selectedMediaData.taskId;
    const milestoneId = selectedMediaData.milestoneId;
    
    if (!taskId || !milestoneId) {
      console.warn('TaskId or MilestoneId not available for editing entry');
      return;
    }
    
    // Milestone objesini oluştur
    const milestoneData = {
      id: milestoneId,
      taskId: taskId,
      title: 'Edit Journal Entry' // Bu bilgiyi selectedMediaData'dan alabiliriz
    };
    
    // Edit state'lerini set et
    setEditingEntry(entry);
    setEditingMilestone(milestoneData);
    setJournalModalVisible(true);
  };

  const renderMediaGrid = (entry) => {
    if (!entry) return null;
    
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

    const renderMediaItem = (item, key) => {
      if (!item) return null;
      if (item.type === "image") {
        return (
          <View key={key} style={styles.mediaItem}>
            <Image source={{ uri: item.content }} style={styles.mediaImage} resizeMode="cover" />
          </View>
        );
      }
      if (item.type === "map") {
        const coords = item.content?.coords || item.content;
        return (
          <View key={key} style={styles.mediaItem}>
            <View style={styles.mapWrapper}>
              <View style={styles.mapFallback}>
                <MaterialIcons name="location-on" size={24} color="#007AFF" />
                <Text style={styles.mapFallbackText}>
                  📍 {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
                </Text>
              </View>
            </View>
          </View>
        );
      }
      return null;
    };

    return (
      <View style={styles.mediaGrid}>
        {/* Sol taraf - ana resim */}
        {left.length > 0 && (
          <View style={styles.leftGrid}>
            {renderMediaItem(left[0], 'left')}
          </View>
        )}
        
        {/* Sağ taraf - diğer medyalar */}
        {rightCount > 0 && (
          <View style={styles.rightGrid}>
            {topRow.length > 0 && (
              <View style={styles.topRow}>
                {topRow.map((item, index) => (
                  <View key={`top-${index}`} style={{ flex: 1, marginRight: index === 0 ? 2 : 0 }}>
                    {renderMediaItem(item, `top-${index}`)}
                  </View>
                ))}
              </View>
            )}
            {bottomRow.length > 0 && (
              <View style={styles.bottomRow}>
                {bottomRow.map((item, index) => (
                  <View key={`bottom-${index}`} style={{ flex: 1, marginRight: index === 0 ? 2 : 0 }}>
                    {renderMediaItem(item, `bottom-${index}`)}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (!selectedMediaData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Veri bulunamadı</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.titleSection}>
          <Text style={styles.date}>{selectedMediaData?.date || 'No date'}</Text>
          {selectedMediaData?.mood && (
            <View style={[styles.mood, { backgroundColor: selectedMediaData.mood.color || "#fff" }]}>
              <MaterialIcons name={getValidIconName(selectedMediaData.mood.icon)} size={16} color="#333" />
              <Text style={styles.moodText}>{selectedMediaData.mood.label}</Text>
            </View>
          )}
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Media Section - Fixed */}
        <View style={styles.mediaSection}>
          {renderMediaGrid(selectedMediaData)}
        </View>

        {/* Daily Notes Section - Scrollable */}
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Günlükler</Text>
          
          <ScrollView 
            style={styles.notesScrollView}
            contentContainerStyle={styles.notesScrollContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
          >
            {selectedMediaData?.textEntries && selectedMediaData.textEntries.length > 0 ? (
              selectedMediaData.textEntries.map((entry, index) => (
                <View key={index} style={styles.noteItem}>
                  <View style={styles.noteHeader}>
                    <Text style={styles.noteTime}>
                      {entry?.createdAt ? new Date(entry.createdAt).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'No time'}
                    </Text>
                    {/* Edit butonunu sadece active milestone'lar için göster */}
                    {selectedMediaData?.isCompleted !== true && (
                      <TouchableOpacity 
                        style={styles.editButton}
                        onPress={() => handleEditTextEntry(entry)}
                      >
                        <MaterialIcons name="edit" size={16} color="#007AFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.noteContent}>{entry?.text || 'No text'}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Bu gün için not bulunmuyor</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
      
      {/* Journal Modal */}
      {journalModalVisible && editingMilestone && (
        <Journal 
          visible={journalModalVisible}
          onClose={() => {
            setJournalModalVisible(false);
            setEditingEntry(null);
            setEditingMilestone(null);
          }}
          milestone={editingMilestone}
          existingEntry={editingEntry}
        />
      )}
    </SafeAreaView>
  );
};

const getValidIconName = (name) => {
  const fallback = { sick: "sick", "self-improvement": "self-improvement" };
  return fallback[name] ? fallback[name] : name;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  errorText: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    color: "#999",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12, // 16 -> 12 (daha kompakt)
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    backgroundColor: "#FFFFFF",
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },

  titleSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  date: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#333",
  },

  mood: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    marginLeft: 8,
  },

  moodText: {
    fontSize: 10,
    fontFamily: "Poppins_500Medium",
    color: "#333",
    marginLeft: 4,
  },

  placeholder: {
    width: 40,
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },

  mediaSection: {
    height: height * 0.22, // Daha da küçültüldü (0.27 -> 0.22)
    marginBottom: 20,
  },

  mediaGrid: {
    flexDirection: "row",
    height: "100%",
    gap: 4,
  },

  leftGrid: {
    flex: 1,
  },

  rightGrid: {
    flex: 1,
    flexDirection: "column",
  },

  topRow: {
    flex: 1,
    flexDirection: "row",
    marginBottom: 2,
  },

  bottomRow: {
    flex: 1,
    flexDirection: "row",
  },

  mediaItem: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },

  mediaImage: {
    width: "100%",
    height: "100%",
  },

  mapWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f8f8f8",
  },

  mapInner: {
    width: "100%",
    height: "100%",
  },

  notesSection: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    padding: 12, // 16 -> 12 (daha kompakt)
  },

  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#333",
    marginBottom: 12,
    textAlign: "left", // Sola hizalandı
  },

  notesScrollView: {
    flex: 1,
  },

  notesScrollContent: {
    paddingBottom: 20,
  },

  noteItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },

  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  noteTime: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: "#666",
  },

  editButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F0F8FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#007AFF",
  },

  noteContent: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#333",
    lineHeight: 20,
  },

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },

  emptyText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#999",
    textAlign: "center",
  },
  mapFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  mapFallbackText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
});

export default JournalDetailScreen;
